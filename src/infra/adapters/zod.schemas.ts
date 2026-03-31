import { z } from 'zod';

export const MatchTypeSchema = z.enum(['contains', 'startsWith', 'regex']);

export const ResourceTypeSchema = z.enum([
	'csp_report',
	'font',
	'image',
	'main_frame',
	'media',
	'object',
	'other',
	'ping',
	'script',
	'stylesheet',
	'sub_frame',
	'webbundle',
	'websocket',
	'webtransport',
	'xmlhttprequest',
]);

export const HeaderActionSchema = z.enum(['append', 'set', 'remove']);

export const HeaderRuleSchema = z.object({
	id: z.number(),
	name: z.string().min(1),
	value: z.string(),
	action: HeaderActionSchema,
});

export const RuleSchema = z.object({
	id: z.number(),
	profileId: z.string().min(1),
	name: z.string().min(1),
	description: z.string(),
	enabled: z.boolean(),
	matchType: MatchTypeSchema,
	urlFilter: z.string().min(1),
	resourceTypes: z.array(ResourceTypeSchema),
	headers: z.array(HeaderRuleSchema),
});

export const ProfileSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
});

export const StorageShapeSchema = z.object({
	profiles: z.array(ProfileSchema),
	rules: z.array(RuleSchema),
});
