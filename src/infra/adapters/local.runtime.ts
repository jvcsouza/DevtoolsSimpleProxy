import { RuntimePort, StorageShape } from '@/core/ports/runtime.port';
import { sampleProfiles, sampleRules } from '@data/data';
import { toRuleConfig } from '@domain/rule';

let currentRules: StorageShape = { profiles: sampleProfiles, rules: sampleRules };
let dynamicRules = [...sampleRules.filter(x => x.enabled).map(x => toRuleConfig(x))];

export function createLocalRuntimeAdapter(): RuntimePort {
	return {
		tabs: {
			query: () => Promise.resolve([]),
		},
		netRequest: {
			getDynamicRules: async () => dynamicRules,
			updateDynamicRules: async ({ addRules, removeRuleIds }) => {
				if (removeRuleIds) dynamicRules = dynamicRules.filter(x => !removeRuleIds.includes(x.id));
				if (addRules) dynamicRules.push(...addRules);
			},
		},
		storage: {
			set: async (data: Partial<StorageShape>) => {
				currentRules = { ...currentRules, ...data };
			},
			get: async <K extends keyof StorageShape>(key?: K) =>
				structuredClone(key ? currentRules[key] : currentRules),
		},
	};
}
