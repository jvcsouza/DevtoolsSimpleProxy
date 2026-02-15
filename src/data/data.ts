import type { Rule, Profile } from '../types';

export const sampleProfiles: Profile[] = [
	{ id: '1', name: 'Local Dev' },
	{ id: '2', name: 'Homolog' },
	{ id: '3', name: 'Mock API' },
];

export const sampleRules: Rule[] = [
	{
		id: 1,
		name: 'Add Auth Token',
		description: 'Injects Bearer token for local development API calls',
		enabled: true,
		matchType: 'contains',
		urlFilter: '/api/*',
		resourceTypes: ['xmlhttprequest'],
		headers: [
			{
				id: 1,
				name: 'Authorization',
				value: 'Bearer dev-token-abc123',
				action: 'append',
			},
		],
	},
	{
		id: 2,
		name: 'Disable Caching',
		description: 'Forces no-cache for all script resources during debugging',
		enabled: true,
		matchType: 'contains',
		urlFilter: '*.js',
		resourceTypes: ['script'],
		headers: [
			{
				id: 2,
				name: 'Cache-Control',
				value: 'no-cache, no-store',
				action: 'set',
			},
			{
				id: 3,
				name: 'Pragma',
				value: 'no-cache',
				action: 'append',
			},
		],
	},
	{
		id: 3,
		name: 'Mock CORS Origin',
		description: 'Overrides Origin header to bypass CORS restrictions in staging',
		enabled: false,
		matchType: 'startsWith',
		urlFilter: 'https://staging-api.example.com',
		resourceTypes: ['xmlhttprequest'],
		headers: [
			{
				id: 4,
				name: 'Origin',
				value: 'https://app.example.com',
				action: 'set',
			},
		],
	},
	{
		id: 4,
		name: 'API Key Injection',
		description: 'Adds X-API-Key header to all API Gateway requests',
		enabled: false,
		matchType: 'regex',
		urlFilter: '^https://gateway\\.example\\.com/v[0-9]+/.*',
		resourceTypes: ['xmlhttprequest'],
		headers: [
			{
				id: 5,
				name: 'X-API-Key',
				value: 'sk-test-key-xyz789',
				action: 'append',
			},
		],
	},
];
