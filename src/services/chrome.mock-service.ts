// @ts-nocheck

import { sampleProfiles, sampleRules } from '../data/data.ts';

if (!globalThis.chrome) {
	globalThis.chrome = {};

	chrome.tabs = {};
	chrome.declarativeNetRequest = {};
	chrome.storage = {
		local: {
			get: async key => {
				if (key === 'rules') return { rules: sampleRules };
				return {};
			},
			set: async ({ rules }) => {},
		},
	};
}
