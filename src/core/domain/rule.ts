export type MatchType = 'contains' | 'startsWith' | 'regex';
export type RuleKind = 'headers' | 'mock';
export type ResourceType =
	| 'csp_report'
	| 'font'
	| 'image'
	| 'main_frame'
	| 'media'
	| 'object'
	| 'other'
	| 'ping'
	| 'script'
	| 'stylesheet'
	| 'sub_frame'
	| 'webbundle'
	| 'websocket'
	| 'webtransport'
	| 'xmlhttprequest';
export type HeaderAction = 'append' | 'set' | 'remove';

export interface HeaderRule {
	id: number;
	name: string;
	value: string;
	action: HeaderAction;
}

export interface MockHeader {
	id: number;
	name: string;
	value: string;
}

export interface MockResponse {
	status: number;
	contentType: string;
	body: string;
	delayMs: number;
	headers: MockHeader[];
}

export type Rule = {
	id: number;
	profileId: string;
	kind: RuleKind;
	name: string;
	description: string;
	enabled: boolean;
	matchType: MatchType;
	urlFilter: string;
	resourceTypes: ResourceType[];
	headers: HeaderRule[];
	mock?: MockResponse;
};

export type RuleConfig = {
	id: number;
	priority: number;
	action: {
		type: string;
		requestHeaders: {
			header: string;
			value: string;
			operation: HeaderAction;
		}[];
	};
	condition: {
		urlFilter?: string;
		regexFilter?: string;
		resourceTypes: ResourceType[];
	};
};

export const defaultMockResponse = (): MockResponse => ({
	status: 200,
	contentType: 'application/json',
	body: '{\n\t"message": "mocked"\n}',
	delayMs: 0,
	headers: [],
});

/** Regras salvas antes da existência do `kind` são tratadas como regras de headers. */
export const normalizeRule = (rule: Rule): Rule => {
	const kind = rule.kind ?? 'headers';
	return {
		...rule,
		kind,
		headers: rule.headers ?? [],
		mock: kind === 'mock' ? { ...defaultMockResponse(), ...rule.mock } : rule.mock,
	};
};

export const isHeadersRule = (rule: Rule) => (rule.kind ?? 'headers') === 'headers';
export const isMockRule = (rule: Rule) => rule.kind === 'mock';

const toCondition = (rule: Rule): RuleConfig['condition'] => {
	const resourceTypes = rule.resourceTypes;
	if (rule.matchType === 'regex') return { regexFilter: rule.urlFilter, resourceTypes };
	if (rule.matchType === 'startsWith' && !rule.urlFilter.startsWith('|')) {
		return { urlFilter: `|${rule.urlFilter}`, resourceTypes };
	}
	return { urlFilter: rule.urlFilter, resourceTypes };
};

export const toRuleConfig = (rule: Rule): RuleConfig => {
	return {
		id: rule.id,
		priority: 1,
		action: {
			type: 'modifyHeaders',
			requestHeaders: rule.headers.map(h => ({
				header: h.name,
				value: h.value,
				operation: h.action,
			})),
		},
		condition: toCondition(rule),
	};
};

const escapeRegExp = (value: string) => value.replace(/[.+?${}()[\]\\/]/g, '\\$&');

/** Converte a sintaxe de `urlFilter` do declarativeNetRequest (`*`, `^`, `|`, `||`) em RegExp. */
const urlFilterToRegExp = (filter: string) => {
	let source = filter;
	let prefix = '';
	let suffix = '';

	if (source.startsWith('||')) {
		prefix = '^[a-z][a-z0-9+.-]*://([^/]*\\.)?';
		source = source.slice(2);
	} else if (source.startsWith('|')) {
		prefix = '^';
		source = source.slice(1);
	}

	if (source.endsWith('|')) {
		suffix = '$';
		source = source.slice(0, -1);
	}

	const body = source
		.split('')
		.map(char => {
			if (char === '*') return '.*';
			if (char === '^') return '(?:[^\\w.%-]|$)';
			if (char === '|') return '\\|';
			return escapeRegExp(char);
		})
		.join('');

	return new RegExp(prefix + body + suffix, 'i');
};

export const matchesUrl = (rule: Pick<Rule, 'matchType' | 'urlFilter'>, url: string) => {
	if (!rule.urlFilter) return true;
	try {
		if (rule.matchType === 'regex') return new RegExp(rule.urlFilter).test(url);
		if (rule.matchType === 'startsWith') return url.toLowerCase().startsWith(rule.urlFilter.toLowerCase());
		return urlFilterToRegExp(rule.urlFilter).test(url);
	} catch {
		return false;
	}
};

/** Mapeia os resource types do DNR para os `Network.ResourceType` do Chrome DevTools Protocol. */
const CDP_RESOURCE_TYPES: Record<ResourceType, string[]> = {
	csp_report: ['CSPViolationReport'],
	font: ['Font'],
	image: ['Image'],
	main_frame: ['Document'],
	media: ['Media'],
	object: ['Other'],
	other: ['Other', 'Manifest', 'TextTrack', 'Prefetch', 'SignedExchange'],
	ping: ['Ping'],
	script: ['Script'],
	stylesheet: ['Stylesheet'],
	sub_frame: ['Document'],
	webbundle: ['Other'],
	websocket: ['WebSocket'],
	webtransport: ['Other'],
	xmlhttprequest: ['XHR', 'Fetch', 'EventSource', 'Preflight'],
};

export const matchesCdpResourceType = (rule: Pick<Rule, 'resourceTypes'>, cdpResourceType: string) => {
	if (!rule.resourceTypes.length) return true;
	return rule.resourceTypes.some(type => CDP_RESOURCE_TYPES[type]?.includes(cdpResourceType));
};

/** Pattern (só `*` e `?`) para `Fetch.enable`, evitando pausar requests que nunca vão casar. */
export const toCdpUrlPattern = (rule: Pick<Rule, 'matchType' | 'urlFilter'>) => {
	if (rule.matchType === 'regex' || !rule.urlFilter) return '*';
	const filter = rule.urlFilter.replace(/^\|\|?/, '').replace(/\|$/, '').replace(/\^/g, '*');
	if (/[?|]/.test(filter)) return '*';
	return rule.matchType === 'startsWith' ? `${filter}*` : `*${filter}*`;
};
