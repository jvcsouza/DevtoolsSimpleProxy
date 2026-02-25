// @ts-nocheck

import { sampleProfiles, sampleRules } from '../data/data.ts';

// prettier-ignore
if (!globalThis.chrome
	|| !globalThis.chrome.tabs
	|| !globalThis.chrome.storage
	|| !globalThis.chrome.declarativeNetRequest
) {

	let currentRules = sampleRules;

	if(!globalThis.chrome)
		 globalThis.chrome = {};

	globalThis.chrome.tabs = {};
	globalThis.chrome.declarativeNetRequest = {
		updateDynamicRules: (...params) => console.log(params)
	};
	globalThis.chrome.storage = {
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
