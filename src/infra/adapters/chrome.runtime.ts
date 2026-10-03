/// <reference types="chrome" />

import { RuleConfig } from '@/core/domain/rule';
import {
	MockEnginePort,
	MockEngineStatus,
	RuntimePort,
	StorageShape,
	TabsResultPort,
} from '@/core/ports/runtime.port';
import {
	MOCK_ENGINE_PORT_NAME,
	PanelToWorkerMessage,
	WorkerToPanelMessage,
} from '@/background/mock-engine.protocol';

function createChromeMockEngine(): MockEnginePort {
	const listeners = new Set<(status: MockEngineStatus) => void>();
	const tabId = chrome.devtools?.inspectedWindow?.tabId;
	let port: chrome.runtime.Port | null = null;

	const notify = (status: MockEngineStatus) => listeners.forEach(listener => listener(status));

	// A porta fica aberta enquanto o DevTools estiver aberto; ao fechar, o service worker desanexa o debugger.
	const getPort = () => {
		if (port) return port;
		port = chrome.runtime.connect({ name: MOCK_ENGINE_PORT_NAME });
		port.onMessage.addListener((message: WorkerToPanelMessage) => {
			if (message.type === 'status' && message.tabId === tabId) {
				notify({ attached: message.attached, error: message.error });
			}
		});
		port.onDisconnect.addListener(() => {
			port = null;
			notify({ attached: false });
		});
		return port;
	};

	return {
		sync: async profileId => {
			if (tabId === undefined) return;
			const message: PanelToWorkerMessage = { type: 'sync', tabId, profileId };
			getPort().postMessage(message);
		},
		onStatusChange: listener => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export function createChromeRuntimeAdapter(): RuntimePort {
	const { tabs, declarativeNetRequest: netRequest, storage } = chrome;

	return {
		tabs: {
			query: queryInfo => tabs.query(queryInfo as chrome.tabs.QueryInfo) as Promise<TabsResultPort[]>,
		},
		netRequest: {
			updateDynamicRules: input =>
				netRequest.updateDynamicRules(input as chrome.declarativeNetRequest.UpdateRuleOptions),
			getDynamicRules: async () => {
				const rules = await netRequest.getDynamicRules();
				return rules as RuleConfig[];
			},
		},
		storage: {
			set: async (data: Partial<StorageShape>) => storage.local.set(data),
			get: async <K extends keyof StorageShape>(key?: K) => {
				const data = await storage.local.get(key ? [key as string] : undefined);
				return key ? (data[key] as StorageShape[K]) : (data as StorageShape);
			},
		},
		mockEngine: createChromeMockEngine(),
	};
}
