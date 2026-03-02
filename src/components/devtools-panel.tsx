import { useCallback, useEffect, useState } from 'react';
import { Rule } from '@domain/rule';
import { TopBar } from '@components/top-bar';
import { RuleCard } from '@components/rule-card';
import { StatusBar } from '@components/status-bar';
import { RuleEditor } from '@components/rule-editor';
import rulesService from '@services/rules.service';
import panelService from '@/core/services/panel.service';
import profileService from '@/core/services/profile.service';
import { Profile } from '@/core/domain/profile';

export function DevToolsPanel() {
	const [selectedProfile, setSelectedProfile] = useState('');
	const [rules, setRules] = useState<Rule[]>([]);
	const [editingRule, setEditingRule] = useState<Rule | null>(null);
	const [editorOpen, setEditorOpen] = useState(false);
	const [activeCount, setActiveCount] = useState(0);
	const [profiles, setProfiles] = useState<Profile[]>([]);

	useEffect(() => {
		profileService.getAllProfilesAsync().then(profiles => {
			setSelectedProfile(profiles[0].id);
			setProfiles(profiles);
		});
	}, []);

	useEffect(() => {
		rulesService.applyRulesByProfileIdAsync(selectedProfile).then(newRules => {
			const profileRules = newRules.filter(r => r.profileId === selectedProfile);
			setRules(profileRules);
			setActiveCount(profileRules.filter(x => x.enabled).length);
		});
	}, [selectedProfile]);

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

	const handleToggle = (id: number) => {
		rulesService.toggleRuleAsync(id).then(newRules => {
			const profileRules = newRules.filter(r => r.profileId === selectedProfile);
			setRules(profileRules);
			setActiveCount(profileRules.filter(x => x.enabled).length);
		});
	};

	const handleEdit = useCallback((rule: Rule) => {
		setEditingRule(rule);
		setEditorOpen(true);
	}, []);

	const handleDelete = (id: number) => {
		rulesService.deleteRuleAsync(id).then(newRules => {
			const profileRules = newRules.filter(r => r.profileId === selectedProfile);
			setRules(profileRules);
			setActiveCount(profileRules.filter(x => x.enabled).length);
		});
	};

	const handleSave = (rule: Rule) => {
		rulesService.upsertRuleAsync(rule).then(newRules => {
			const profileRules = newRules.filter(r => r.profileId === selectedProfile);
			setRules(profileRules);
			setActiveCount(profileRules.filter(x => x.enabled).length);
			setEditingRule(null);
		});
	};

	const handleImportRules = () => {
		const element = document.createElement('input');
		element.setAttribute('type', 'file');
		element.setAttribute('accept', '.json');
		element.addEventListener('cancel', () => element.remove(), { once: true });
		element.addEventListener(
			'change',
			evt => {
				// @ts-expect-error - Não há tipagem para o target do evento de mudança de input file
				const file = evt.target.files[0];
				panelService
					.importPanelDataAsync(file)
					.then(() => profileService.getAllProfilesAsync())
					.then(newProfiles => {
						if (newProfiles.find(p => p.id === selectedProfile)) {
							return rulesService.getRulesByProfileIdAsync(selectedProfile);
						}
						setSelectedProfile(newProfiles[0]?.id ?? '');
						return Promise.resolve([]);
					})
					.then(newRules => {
						setRules(newRules);
						setActiveCount(newRules.filter(x => x.enabled).length);
						element.remove();
					});
			},
			{ once: true },
		);
		element.click();
	};

	const handleExportRules = useCallback(() => {
		panelService.exportPanelDataAsync().then(url => {
			const element = document.createElement('a');
			element.setAttribute('download', 'exported.json');
			element.setAttribute('href', url);
			element.click();
			element.remove();
			URL.revokeObjectURL(url);
		});
	}, []);

	return (
		<div className='flex h-screen w-screen flex-col bg-background'>
			<TopBar
				profiles={profiles}
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
				profileId={selectedProfile}
				open={editorOpen}
				onOpenChange={handleEditorOpenChange}
				rule={editingRule}
				onSave={handleSave}
			/>
		</div>
	);
}
