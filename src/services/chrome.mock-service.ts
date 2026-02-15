// @ts-nocheck
if (globalThis.chrome) void 0;

import { sampleProfiles, sampleRules } from '../data/data.ts';

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
