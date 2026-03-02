import { createRuntime } from '@/infra/adapters/runtime.factory';
import { RuntimePort } from '../ports/runtime.port';
import { Rule, toRuleConfig } from '@domain/rule';

const createRulesService = (runtime: RuntimePort) => {
	const suggestUrlFilterAsync = async () => {
		try {
			const activeTabs = await runtime.tabs.query({
				active: true,
			});
			const sortedTabs = activeTabs.sort((x, z) => z.lastAccessed - x.lastAccessed);
			const url = sortedTabs[0]?.url;
			if (!url) return '';
			const u = new URL(url);
			return `*://${u.host}/*`;
		} catch {
			return '';
		}
	};

	const getCurrentTabAsync = async () => {
		const queryOptions = { active: true, currentWindow: true };
		const [tab] = await runtime.tabs.query(queryOptions);
		return tab;
	};

	const getAllRulesAsync = async (): Promise<Rule[]> => {
		const rules = await runtime.storage.get('rules');
		return rules || [];
	};

	const upsertRuleAsync = async (rule: Rule) => {
		const existingRules = await getAllRulesAsync();
		const oldRule = existingRules.find(r => r.id === rule.id);
		const newRules = oldRule ? existingRules.map(r => (r.id === rule.id ? rule : r)) : [...existingRules, rule];
		await runtime.storage.set({ rules: newRules });
		await runtime.netRequest.updateDynamicRules({
			addRules: !oldRule || oldRule.enabled ? [toRuleConfig(rule)] : undefined,
			removeRuleIds: oldRule ? [oldRule.id] : undefined,
		});
		return newRules;
	};

	const deleteRuleAsync = async (id: number) => {
		const existingRules = await getAllRulesAsync();
		const newRules = existingRules.filter(r => r.id !== id);
		await runtime.netRequest.updateDynamicRules({
			removeRuleIds: [id],
		});
		await runtime.storage.set({ rules: newRules });
		return newRules;
	};

	const disableRuleAsync = async (id: number) => {
		const existingRules = await getAllRulesAsync();
		const rule = existingRules.find(r => r.id === id);
		if (!rule) return;
		await runtime.netRequest.updateDynamicRules({
			removeRuleIds: [id],
		});
		rule.enabled = false;
		await runtime.storage.set({ rules: existingRules });
		return existingRules;
	};

	const enableRuleRuleAsync = async (id: number) => {
		const existingRules = await getAllRulesAsync();
		const rule = existingRules.find(r => r.id === id);
		if (!rule) return existingRules;
		await runtime.netRequest.updateDynamicRules({
			addRules: [toRuleConfig(rule)],
		});
		rule.enabled = true;
		await runtime.storage.set({ rules: existingRules });
		return existingRules;
	};

	const toggleRuleAsync = async (id: number) => {
		const existingRules = await getAllRulesAsync();
		const rule = existingRules.find(r => r.id === id);
		if (!rule) return existingRules;
		rule.enabled = !rule.enabled;
		await runtime.netRequest.updateDynamicRules({
			addRules: rule.enabled ? [toRuleConfig(rule)] : undefined,
			removeRuleIds: rule.enabled ? undefined : [id],
		});
		await runtime.storage.set({ rules: existingRules });
		return existingRules;
	};

	const getCurrentRulesAsync = async () => {
		return await runtime.netRequest.getDynamicRules();
	};

	const clearAppliedRulesAsync = async () => {
		const allRules = await getCurrentRulesAsync();
		await runtime.netRequest.updateDynamicRules({
			removeRuleIds: allRules.map(r => r.id),
		});
		return [];
	};

	const importRulesAsync = async (rules: Rule[]) => {
		await clearAppliedRulesAsync();
		await runtime.netRequest.updateDynamicRules({
			addRules: rules.filter(x => x.enabled).map(toRuleConfig),
		});
		await runtime.storage.set({ rules });
		return rules;
	};

	const getRulesByProfileIdAsync = async (profileId: string) => {
		const existingRules = await getAllRulesAsync();
		return existingRules.filter(r => r.profileId === profileId);
	};

	const applyRulesByProfileIdAsync = async (profileId: string) => {
		clearAppliedRulesAsync();
		const rules = await getRulesByProfileIdAsync(profileId);
		await runtime.netRequest.updateDynamicRules({
			addRules: rules.filter(x => x.enabled).map(toRuleConfig),
		});
		return rules;
	};

	return {
		getCurrentTabAsync,
		clearAppliedRulesAsync,
		getAllRulesAsync,
		upsertRuleAsync,
		deleteRuleAsync,
		disableRuleAsync,
		enableRuleRuleAsync,
		toggleRuleAsync,
		suggestUrlFilterAsync,
		importRulesAsync,
		getRulesByProfileIdAsync,
		applyRulesByProfileIdAsync,
	};
};

export default createRulesService(createRuntime());
