import type { Rule, RuleConfig } from '@domain/rule';

export type StorageShape = { rules: Rule[] };

export interface StoragePort {
	get(): Promise<StorageShape>;
	set(data: StorageShape): Promise<void>;
}

export interface TabsQueryPort {
	active?: boolean;
}

export interface TabsResultPort {
	lastAccessed: number;
	url: string;
}

export interface TabsPort {
	query(queryInfo: TabsQueryPort): Promise<TabsResultPort[]>;
}

export interface NetRequestPort {
	updateDynamicRules(input: { addRules?: RuleConfig[]; removeRuleIds?: number[] }): Promise<void>;
	getDynamicRules(): Promise<RuleConfig[]>;
}

export interface RuntimePort {
	tabs: TabsPort;
	storage: StoragePort;
	netRequest: NetRequestPort;
}
