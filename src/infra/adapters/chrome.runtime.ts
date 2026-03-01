/// <reference types="chrome" />

import { RuleConfig } from '@/core/domain/rule';
import { RuntimePort, TabsResultPort } from '@/core/ports/runtime.port';

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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			set: (data: any) => storage.local.set(data),
			get: () => storage.local.get(),
		},
	};
}
