import { useCallback, useEffect, useState } from 'react';
import { Rule } from '@domain/rule';
import { sampleProfiles } from '@data/data';
import { TopBar } from '@components/top-bar';
import { RuleCard } from '@components/rule-card';
import { StatusBar } from '@components/status-bar';
import { RuleEditor } from '@components/rule-editor';
import rulesService from '@services/rules.service';

export function DevToolsPanel() {
	const [selectedProfile, setSelectedProfile] = useState(sampleProfiles[0].id);
	const [rules, setRules] = useState<Rule[]>([]);
	const [editingRule, setEditingRule] = useState<Rule | null>(null);
	const [editorOpen, setEditorOpen] = useState(false);
	const [activeCount, setActiveCount] = useState(0);

	useEffect(() => {
		rulesService.getAllRulesAsync().then(setRules);
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
		rulesService.toggleRuleAsync(id).then(newRules => {
			setRules(newRules);
			setActiveCount(newRules.filter(x => x.enabled).length);
		});
	}, []);

	const handleEdit = useCallback((rule: Rule) => {
		setEditingRule(rule);
		setEditorOpen(true);
	}, []);

	const handleDelete = useCallback((id: number) => {
		rulesService.deleteRuleAsync(id).then(newRules => {
			setRules(newRules);
			setActiveCount(newRules.filter(x => x.enabled).length);
		});
	}, []);

	const handleSave = useCallback((rule: Rule) => {
		rulesService.upsertRuleAsync(rule).then(newRules => {
			setRules(newRules);
			setActiveCount(newRules.filter(x => x.enabled).length);
			setEditingRule(null);
		});
	}, []);

	const handleImportRules = useCallback(() => {
		const element = document.createElement('input');
		element.setAttribute('type', 'file');
		element.setAttribute('accept', '.json');
		element.addEventListener('cancel', () => element.remove(), { once: true });
		element.addEventListener(
			'change',
			evt => {
				// @ts-expect-error - Não há tipagem para o target do evento de mudança de input file
				const file = evt.target.files[0];
				const fileReader = new FileReader();
				fileReader.onload = e => {
					const content = e.target?.result as string;
					rulesService.importRulesAsync(JSON.parse(content)).then(setRules);
				};
				fileReader.readAsText(file);
				element.remove();
			},
			{ once: true },
		);
		element.click();
	}, []);

	const handleExportRules = useCallback(() => {
		rulesService.getAllRulesAsync().then(rules => {
			const json = JSON.stringify(rules, null, 4);
			const fileData = new Blob([json], { type: 'application/json' });
			const fileUrl = URL.createObjectURL(fileData);
			const element = document.createElement('a');
			element.setAttribute('download', 'exported.json');
			element.setAttribute('href', fileUrl);
			element.click();
			element.remove();
			URL.revokeObjectURL(fileUrl);
		});
	}, []);

	return (
		<div className='flex h-screen w-screen flex-col bg-background'>
			<TopBar
				profiles={sampleProfiles}
				selectedProfile={selectedProfile}
				onProfileChange={setSelectedProfile}
				onCreateRule={handleCreateRule}
				onExportRules={handleExportRules}
				onImportRules={handleImportRules}
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
