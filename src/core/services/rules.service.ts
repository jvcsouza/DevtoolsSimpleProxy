import { createRuntime } from '@/infra/adapters/runtime.factory';
import { RuntimePort } from '../ports/runtime.port';
import { Rule, toDynamicRule } from '@domain/rule';

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
		const { rules } = await runtime.storage.get();
		return rules || [];
	};

	const upsertRuleAsync = async (rule: Rule) => {
		const existingRules = await getAllRulesAsync();
		const oldRule = existingRules.find(r => r.id === rule.id);
		const newRules = oldRule ? existingRules.map(r => (r.id === rule.id ? rule : r)) : [...existingRules, rule];

		await runtime.storage.set({ rules: newRules });

		await runtime.netRequest.updateDynamicRules({
			addRules: !oldRule || oldRule.enabled ? [toDynamicRule(rule)] : undefined,
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
			addRules: [toDynamicRule(rule)],
		});
		rule.enabled = true;
		await runtime.storage.set({ rules: existingRules });
		return existingRules;
	};

	const toggleRuleAsync = async (id: number) => {
		const existingRules = await getAllRulesAsync();
		const rule = existingRules.find(r => r.id === id);
		if (!rule) return existingRules;
		await runtime.netRequest.updateDynamicRules({
			addRules: rule.enabled ? undefined : [toDynamicRule(rule)],
			removeRuleIds: rule.enabled ? [id] : undefined,
		});
		rule.enabled = !rule.enabled;
		await runtime.storage.set({ rules: existingRules });
		return existingRules;
	};

	const getCurrentRulesAsync = async () => {
		return await runtime.netRequest.getDynamicRules();
	};

	const clearAllRulesAsync = async () => {
		const allRules = await getCurrentRulesAsync();
		await runtime.netRequest.updateDynamicRules({
			removeRuleIds: allRules.map(r => r.id),
		});
		return [];
	};

	const importRulesAsync = async (rules: Rule[]) => {
		await clearAllRulesAsync();
		await runtime.netRequest.updateDynamicRules({
			addRules: rules.filter(x => x.enabled).map(rule => toDynamicRule(rule)),
		});
		await runtime.storage.set({ rules });
		return rules;
	};

	return {
		getCurrentTabAsync,
		clearAllRulesAsync,
		getAllRulesAsync,
		upsertRuleAsync,
		deleteRuleAsync,
		disableRuleAsync,
		enableRuleRuleAsync,
		toggleRuleAsync,
		suggestUrlFilterAsync,
		importRulesAsync,
	};
};

export default createRulesService(createRuntime());
