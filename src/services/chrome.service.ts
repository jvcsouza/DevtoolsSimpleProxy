import './chrome.mock-service';
import { Rule, toDynamicRule } from '../types';

// prettier-ignore
// @ts-expect-error
const { tabs, declarativeNetRequest: netRequest, storage: { local: storage } } = chrome;

const suggestUrlFilterAsync = async () => {
	try {
		const activeTabs = await tabs.query({
			active: true,
		});
		//@ts-ignore
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
	const [tab] = await tabs.query(queryOptions);
	return tab;
};

const getAllRulesAsync = async (): Promise<Rule[]> => {
	const { rules } = await storage.get<Rule[]>();
	return rules || [];
};

const upsertRuleAsync = async (rule: Rule) => {
	const existingRules = await getAllRulesAsync();
	const oldRule = existingRules.find(r => r.id === rule.id);
	const newRules = oldRule ? existingRules.map(r => (r.id === rule.id ? rule : r)) : [...existingRules, rule];

	await storage.set({ rules: newRules });

	await netRequest.updateDynamicRules({
		addRules: !oldRule || oldRule.enabled ? [toDynamicRule(rule)] : undefined,
		removeRuleIds: oldRule ? [oldRule.id] : undefined,
	});
	return newRules;
};

const deleteRuleAsync = async (id: number) => {
	const existingRules = await getAllRulesAsync();
	const newRules = existingRules.filter(r => r.id !== id);
	await netRequest.updateDynamicRules({
		removeRuleIds: [id],
	});
	await storage.set({ rules: newRules });
	return newRules;
};

const disableRuleAsync = async (id: number) => {
	const existingRules = await getAllRulesAsync();
	const rule = existingRules.find(r => r.id === id);
	if (!rule) return;
	await netRequest.updateDynamicRules({
		removeRuleIds: [id],
	});
	rule.enabled = false;
	await storage.set({ rules: existingRules });
	return existingRules;
};

const enableRuleRuleAsync = async (id: number) => {
	const existingRules = await getAllRulesAsync();
	const rule = existingRules.find(r => r.id === id);
	if (!rule) return existingRules;
	await netRequest.updateDynamicRules({
		addRules: [toDynamicRule(rule)],
	});
	rule.enabled = true;
	await storage.set({ rules: existingRules });
	return existingRules;
};

const toggleRuleAsync = async (id: number) => {
	const existingRules = await getAllRulesAsync();
	const rule = existingRules.find(r => r.id === id);
	if (!rule) return existingRules;
	await netRequest.updateDynamicRules({
		addRules: rule.enabled ? undefined : [toDynamicRule(rule)],
		removeRuleIds: rule.enabled ? [id] : undefined,
	});
	rule.enabled = !rule.enabled;
	await storage.set({ rules: existingRules });
	return existingRules;
};

//@ts-expect-error
const getCurrentRulesAsync = async (): Promise<chrome.declarativeNetRequest.Rule[]> => {
	return await netRequest.getDynamicRules();
};

const clearAllRulesAsync = async () => {
	const allRules = await getCurrentRulesAsync();
	await netRequest.updateDynamicRules({
		removeRuleIds: allRules.map(r => r.id),
	});
	return [];
};

export {
	getCurrentTabAsync,
	clearAllRulesAsync,
	getAllRulesAsync,
	upsertRuleAsync,
	deleteRuleAsync,
	disableRuleAsync,
	enableRuleRuleAsync,
	toggleRuleAsync,
	suggestUrlFilterAsync,
};
