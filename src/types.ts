export type MatchType = 'contains' | 'startsWith' | 'regex';
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

export type Rule = {
	id: number;
	name: string;
	description: string;
	enabled: boolean;
	matchType: MatchType;
	urlFilter: string;
	resourceTypes: ResourceType[];
	headers: HeaderRule[];
};

//@ts-expect-error Tipagem para `declarativeNetRequest.Rule` é global nesse contexto
export const toDynamicRule = (rule: Rule): chrome.declarativeNetRequest.Rule => {
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
		condition: {
			urlFilter: rule.urlFilter,
			resourceTypes: rule.resourceTypes,
		},
	};
};

export interface Profile {
	id: string;
	name: string;
}
