// @ts-nocheck

import { sampleProfiles, sampleRules } from '../data/data.ts';

// prettier-ignore
if (!globalThis.chrome
	|| !globalThis.tabs
	|| !globalThis.storage
	|| !globalThis.declarativeNetRequest
) {

	let currentRules = sampleRules;

	if(!globalThis.chrome)
		 globalThis.chrome = {};

	chrome.tabs = {};
	chrome.declarativeNetRequest = {
		updateDynamicRules: (...params) => console.log(params)
	};
	chrome.storage = {
		local: {
			get: async key => {
				if (key === 'rules') return { rules: currentRules };
				return {};
			},
			set: async ({ rules }) => {
				currentRules = rules;
			},
		},
	};
}
