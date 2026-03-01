import { TopBar } from './top-bar';
import { sampleProfiles } from '../data/data';
import { useCallback, useEffect, useState } from 'react';
import { Rule } from './../types';
import { RuleCard } from './rule-card';
import { StatusBar } from './status-bar';
import { RuleEditor } from './rule-editor';
import * as chrome from '../services/chrome.service';

export function DevToolsPanel() {
	const [selectedProfile, setSelectedProfile] = useState(sampleProfiles[0].id);
	const [rules, setRules] = useState<Rule[]>([]);
	const [editingRule, setEditingRule] = useState<Rule | null>(null);
	const [editorOpen, setEditorOpen] = useState(false);
	const [activeCount, setActiveCount] = useState(0);

	useEffect(() => {
		chrome.getAllRulesAsync().then(setRules);
	}, []);

	const handleEditorOpenChange = useCallback((open: boolean) => {
		setEditorOpen(open);
		if (open) return;
		setEditingRule(null);
	}, []);

	const handleCreateRule = useCallback(() => {
		setEditingRule(null);
		setEditorOpen(true);
		setActiveCount(old => old++);
	}, []);

	const handleToggle = useCallback((id: number) => {
		chrome.toggleRuleAsync(id).then(newRules => {
			setRules(newRules);
			setActiveCount(newRules.filter(x => x.enabled).length);
		});
	}, []);

	const handleEdit = useCallback((rule: Rule) => {
		setEditingRule(rule);
		setEditorOpen(true);
	}, []);

	const handleDelete = useCallback((id: number) => {
		chrome.deleteRuleAsync(id).then(newRules => {
			setRules(newRules);
			setActiveCount(newRules.filter(x => x.enabled).length);
		});
	}, []);

	const handleSave = useCallback((rule: Rule) => {
		chrome.upsertRuleAsync(rule).then(newRules => {
			setRules(newRules);
			setActiveCount(newRules.filter(x => x.enabled).length);
			setEditingRule(null);
		});
	}, []);

	return (
		<div className='flex h-screen w-screen flex-col bg-background'>
			<TopBar
				profiles={sampleProfiles}
				selectedProfile={selectedProfile}
				onProfileChange={setSelectedProfile}
				onCreateRule={handleCreateRule}
			></TopBar>

			<main className='flex-1 overflow-y-auto p-3'>
				<div className='flex flex-col gap-1.5'>
					{rules.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-16 text-center'>
							<p className='text-sm text-muded-foreground'>No rules configured</p>
							<p className='mt-1 text-xs text-muted-foreground'>
								Create a rule to start intercepting requests
							</p>
						</div>
					) : (
						rules.map(rule => (
							<RuleCard
								key={rule.id}
								rule={rule}
								onToggle={handleToggle}
								onEdit={handleEdit}
								onDelete={handleDelete}
							/>
						))
					)}
				</div>
			</main>

			<StatusBar activeCount={activeCount} totalCount={rules.length} />

			<RuleEditor
				key={`${editorOpen}-${editingRule?.id ?? 'new'}`}
				open={editorOpen}
				onOpenChange={handleEditorOpenChange}
				rule={editingRule}
				onSave={handleSave}
			/>
		</div>
	);
}
