/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { sampleRules } from '../data/data.ts';

if (
	!globalThis.chrome ||
	!globalThis.chrome.tabs ||
	!globalThis.chrome.storage ||
	!globalThis.chrome.declarativeNetRequest
) {
	let currentRules = { rules: sampleRules };
	let dynamicRules = [...sampleRules.filter(x => x.enabled).map(x => x.id)];

	if (!globalThis.chrome) globalThis.chrome = {};

	globalThis.chrome.tabs = {};
	globalThis.chrome.declarativeNetRequest = {
		updateDynamicRules: async ({ addRules, removeRuleIds }) => {
			if (removeRuleIds) dynamicRules = dynamicRules.filter(x => !removeRuleIds.includes(x));
			if (addRules) dynamicRules.push(...addRules.map(x => x.id));
		},
	};
	globalThis.chrome.storage = {
		local: {
			get: async () => structuredClone(currentRules),
			set: async data => (currentRules = data),
		},
	};
}
