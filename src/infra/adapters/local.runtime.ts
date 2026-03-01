import { RuntimePort } from '@/core/ports/runtime.port';
import { sampleRules } from '@data/data';
import { RuleConfig, toDynamicRule } from '@domain/rule';

interface dynamicRuleParam {
	addRules?: RuleConfig[];
	removeRuleIds?: number[];
}

export function createLocalRuntimeAdapter(): RuntimePort {
	let currentRules = { rules: sampleRules };
	let dynamicRules = [...sampleRules.filter(x => x.enabled).map(x => toDynamicRule(x))];

	return {
		tabs: {
			query: () => Promise.resolve([]),
		},
		netRequest: {
			getDynamicRules: async () => dynamicRules,
			updateDynamicRules: async ({ addRules, removeRuleIds }: dynamicRuleParam) => {
				if (removeRuleIds) dynamicRules = dynamicRules.filter(x => !removeRuleIds.includes(x.id));
				if (addRules) dynamicRules.push(...addRules);
			},
		},
		storage: {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			set: async (data: any) => (currentRules = data),
			get: async () => structuredClone(currentRules),
		},
	};
}
