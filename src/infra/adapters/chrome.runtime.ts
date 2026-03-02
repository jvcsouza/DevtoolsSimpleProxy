/// <reference types="chrome" />

import { RuleConfig } from '@/core/domain/rule';
import { RuntimePort, StorageShape, TabsResultPort } from '@/core/ports/runtime.port';

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
	};
}
