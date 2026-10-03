/// <reference types="chrome" />

import {
	isMockRule,
	matchesCdpResourceType,
	matchesUrl,
	normalizeRule,
	toCdpUrlPattern,
	type MockResponse,
	type Rule,
} from '@domain/rule';
import { MOCK_ENGINE_PORT_NAME, PanelToWorkerMessage, WorkerToPanelMessage } from './mock-engine.protocol';

const DEBUGGER_PROTOCOL_VERSION = '1.3';

type Session = {
	port: chrome.runtime.Port;
	profileId: string;
	mocks: Rule[];
	attached: boolean;
	/** Usuário clicou em "Cancelar" no banner do debugger: só reanexa num novo sync explícito do panel. */
	canceled: boolean;
};

type RequestPausedParams = {
	requestId: string;
	resourceType: string;
	request: { url: string; method: string; headers: Record<string, string> };
};

type HeaderEntry = { name: string; value: string };

const sessions = new Map<number, Session>();

const sendCommand = (tabId: number, method: string, params?: Record<string, unknown>) =>
	chrome.debugger.sendCommand({ tabId }, method, params);

const postStatus = (tabId: number, error?: string) => {
	const session = sessions.get(tabId);
	if (!session) return;
	const message: WorkerToPanelMessage = { type: 'status', tabId, attached: session.attached, error };
	try {
		session.port.postMessage(message);
	} catch {
		// Panel já fechou
	}
};

const getMockRulesAsync = async (profileId: string) => {
	const { rules } = await chrome.storage.local.get('rules');
	return ((rules as Rule[] | undefined) ?? [])
		.map(normalizeRule)
		.filter(rule => rule.profileId === profileId && rule.enabled && isMockRule(rule));
};

const detachAsync = async (tabId: number) => {
	const session = sessions.get(tabId);
	if (session) session.attached = false;
	try {
		await chrome.debugger.detach({ tabId });
	} catch {
		// Já estava desanexado
	}
};

const reconcileAsync = async (tabId: number) => {
	const session = sessions.get(tabId);
	if (!session) return;

	session.mocks = await getMockRulesAsync(session.profileId);

	if (!session.mocks.length || session.canceled) {
		if (session.attached) await detachAsync(tabId);
		postStatus(tabId);
		return;
	}

	try {
		if (!session.attached) {
			await chrome.debugger.attach({ tabId }, DEBUGGER_PROTOCOL_VERSION);
			session.attached = true;
		}
		const urlPatterns = [...new Set(session.mocks.map(toCdpUrlPattern))];
		await sendCommand(tabId, 'Fetch.enable', {
			patterns: urlPatterns.map(urlPattern => ({ urlPattern, requestStage: 'Request' })),
		});
		postStatus(tabId);
	} catch (error) {
		await detachAsync(tabId);
		postStatus(tabId, error instanceof Error ? error.message : String(error));
	}
};

const toBase64 = (text: string) => {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
};

const getHeader = (headers: Record<string, string>, name: string) =>
	Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];

const hasHeader = (headers: HeaderEntry[], name: string) =>
	headers.some(h => h.name.toLowerCase() === name.toLowerCase());

const buildCorsHeaders = (request: RequestPausedParams['request'], userHeaders: HeaderEntry[]): HeaderEntry[] => {
	const origin = getHeader(request.headers, 'Origin');
	if (!origin || hasHeader(userHeaders, 'Access-Control-Allow-Origin')) return [];
	return [
		{ name: 'Access-Control-Allow-Origin', value: origin },
		{ name: 'Access-Control-Allow-Credentials', value: 'true' },
	];
};

const fulfillAsync = async (tabId: number, params: RequestPausedParams, mock: MockResponse) => {
	const userHeaders = mock.headers.filter(h => h.name.trim()).map(({ name, value }) => ({ name, value }));
	const corsHeaders = buildCorsHeaders(params.request, userHeaders);

	if (mock.delayMs > 0) await new Promise(resolve => setTimeout(resolve, mock.delayMs));

	if (params.request.method === 'OPTIONS') {
		await sendCommand(tabId, 'Fetch.fulfillRequest', {
			requestId: params.requestId,
			responseCode: 204,
			responseHeaders: [
				...corsHeaders,
				{
					name: 'Access-Control-Allow-Methods',
					value: getHeader(params.request.headers, 'Access-Control-Request-Method') ?? '*',
				},
				{
					name: 'Access-Control-Allow-Headers',
					value: getHeader(params.request.headers, 'Access-Control-Request-Headers') ?? '*',
				},
			],
		});
		return;
	}

	const contentTypeHeader =
		mock.contentType && !hasHeader(userHeaders, 'Content-Type')
			? [{ name: 'Content-Type', value: mock.contentType }]
			: [];

	await sendCommand(tabId, 'Fetch.fulfillRequest', {
		requestId: params.requestId,
		responseCode: mock.status,
		responseHeaders: [...contentTypeHeader, ...corsHeaders, ...userHeaders],
		body: toBase64(mock.body),
	});
};

const handleRequestPausedAsync = async (tabId: number, params: RequestPausedParams) => {
	const rule = sessions
		.get(tabId)
		?.mocks.find(r => matchesUrl(r, params.request.url) && matchesCdpResourceType(r, params.resourceType));

	try {
		if (rule?.mock) {
			await fulfillAsync(tabId, params, rule.mock);
			return;
		}
	} catch (error) {
		console.error('[mock-engine] Falha ao aplicar mock', rule?.name, error);
	}

	// Nunca deixar a request pendurada: sem mock (ou com erro) segue o fluxo normal.
	try {
		await sendCommand(tabId, 'Fetch.continueRequest', { requestId: params.requestId });
	} catch {
		// Request cancelada/aba fechada
	}
};

chrome.runtime.onInstalled.addListener(() => {
	console.log('DevTools Request Interceptor instalado.');
});

chrome.runtime.onConnect.addListener(port => {
	if (port.name !== MOCK_ENGINE_PORT_NAME) return;

	port.onMessage.addListener((message: PanelToWorkerMessage) => {
		if (message.type !== 'sync') return;
		const session = sessions.get(message.tabId);
		sessions.set(message.tabId, {
			port,
			profileId: message.profileId,
			mocks: session?.mocks ?? [],
			attached: session?.attached ?? false,
			canceled: false,
		});
		reconcileAsync(message.tabId);
	});

	// DevTools fechado: remove o debugger (e o banner) das abas desse panel.
	port.onDisconnect.addListener(() => {
		sessions.forEach((session, tabId) => {
			if (session.port !== port) return;
			detachAsync(tabId);
			sessions.delete(tabId);
		});
	});
});

chrome.debugger.onEvent.addListener((source, method, params) => {
	if (method !== 'Fetch.requestPaused' || source.tabId === undefined) return;
	handleRequestPausedAsync(source.tabId, params as RequestPausedParams);
});

chrome.debugger.onDetach.addListener((source, reason) => {
	if (source.tabId === undefined) return;
	const session = sessions.get(source.tabId);
	if (!session) return;
	session.attached = false;
	if (reason === 'canceled_by_user') {
		session.canceled = true;
		postStatus(source.tabId, 'Debugger cancelado pelo usuário. Troque de profile ou altere uma regra para reativar.');
		return;
	}
	postStatus(source.tabId);
});
