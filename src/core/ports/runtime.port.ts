import type { Rule, RuleConfig } from '@domain/rule';
import { Profile } from '../domain/profile';

export type StorageShape = { profiles: Profile[]; rules: Rule[] };

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export interface StoragePort {
	get(): Promise<StorageShape>;
	get<K extends keyof StorageShape>(keys: K): Promise<StorageShape[K]>;
	set(data: AtLeastOne<StorageShape>): Promise<void>;
}

export interface TabsQueryPort {
	active?: boolean;
	currentWindow?: boolean;
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
