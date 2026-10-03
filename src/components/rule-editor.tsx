import { useState, useCallback, useEffect } from 'react';
import { Plus, X, Zap } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Separator } from '@components/ui/separator';
import { cn } from '@lib/utils';
import { defaultMockResponse } from '@domain/rule';
import type { Rule, HeaderRule, MatchType, MockResponse, ResourceType, RuleKind } from '@domain/rule';
import { MockResponseEditor } from '@components/mock-response-editor';
import rulesService from '@services/rules.service';

const RESOURCE_TYPES = [
	{ label: 'CSP Report', value: 'csp_report' },
	{ label: 'Font', value: 'font' },
	{ label: 'Image', value: 'image' },
	{ label: 'Main Frame', value: 'main_frame' },
	{ label: 'Media', value: 'media' },
	{ label: 'Object', value: 'object' },
	{ label: 'Other', value: 'other' },
	{ label: 'Ping', value: 'ping' },
	{ label: 'Script', value: 'script' },
	{ label: 'Stylesheet', value: 'stylesheet' },
	{ label: 'Sub Frame', value: 'sub_frame' },
	{ label: 'Web Bundle', value: 'webbundle' },
	{ label: 'WebSocket', value: 'websocket' },
	{ label: 'Web Transport', value: 'webtransport' },
	{ label: 'XMLHttpRequest', value: 'xmlhttprequest' },
];

function generateId() {
	return Number(Math.random().toString().substring(2, 9));
}

const emptyHeader: () => HeaderRule = () => ({
	id: generateId(),
	name: '',
	value: '',
	action: 'append',
});

interface RuleEditorProps {
	open: boolean;
	rule: Rule | null;
	profileId?: string;
	onOpenChange: (open: boolean) => void;
	onSave: (rule: Rule) => void;
}

export function RuleEditor({ profileId, rule, open, onOpenChange, onSave }: RuleEditorProps) {
	const isEditing = !!rule;

	const [name, setName] = useState(rule?.name ?? '');
	const [description, setDescription] = useState(rule?.description ?? '');
	const [matchType, setMatchType] = useState<MatchType>(rule?.matchType ?? 'contains');
	const [urlFilter, setUrlFilter] = useState(rule?.urlFilter ?? '');
	const [resourceType, setResourceType] = useState<ResourceType>(rule?.resourceTypes[0] ?? 'script');
	const [headers, setHeaders] = useState<HeaderRule[]>(rule?.headers?.length ? rule.headers : [emptyHeader()]);
	const [kind, setKind] = useState<RuleKind>(rule?.kind ?? 'headers');
	const [mock, setMock] = useState<MockResponse>(rule?.mock ?? defaultMockResponse());

	useEffect(() => {
		rulesService.suggestUrlFilterAsync().then(suggestion => {
			if (!rule) setUrlFilter(suggestion);
		});
	}, [rule]);

	const addHeader = useCallback(() => {
		setHeaders(prev => [...prev, emptyHeader()]);
	}, []);

	const removeHeader = useCallback((id: number) => {
		setHeaders(prev => prev.filter(h => h.id !== id));
	}, []);

	const updateHeader = useCallback((id: number, field: keyof HeaderRule, value: string) => {
		setHeaders(prev => prev.map(h => (h.id === id ? { ...h, [field]: value } : h)));
	}, []);

	const applyTemplate = useCallback((templateName: string) => {
		const templates: Record<string, HeaderRule> = {
			bearer: {
				id: generateId(),
				name: 'Authorization',
				value: 'Bearer <token>',
				action: 'append',
			},
			apikey: {
				id: generateId(),
				name: 'X-API-Key',
				value: '<api-key>',
				action: 'append',
			},
			nocache: {
				id: generateId(),
				name: 'Cache-Control',
				value: 'no-cache, no-store, must-revalidate',
				action: 'set',
			},
			origin: {
				id: generateId(),
				name: 'Origin',
				value: 'https://example.com',
				action: 'set',
			},
		};
		const template = templates[templateName];
		if (template) {
			setHeaders(prev => (!prev[0]?.name && !prev[0]?.value ? [template] : [...prev, template]));
		}
	}, []);

	const handleSave = () => {
		if (!profileId) {
			// Should never happen, but just in case
			alert('Profile ID is missing. Please select a profile before creating rules.');
			return;
		}

		const savedRule: Rule = {
			id: rule?.id ?? generateId(),
			profileId: profileId,
			kind,
			name: name || 'Untitled Rule',
			description,
			enabled: rule?.enabled ?? true,
			matchType,
			urlFilter,
			resourceTypes: [resourceType],
			headers: kind === 'headers' ? headers.filter(h => h.name.trim() !== '') : [],
			mock: kind === 'mock' ? { ...mock, headers: mock.headers.filter(h => h.name.trim() !== '') } : undefined,
		};
		onSave(savedRule);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl scrollbar'>
				<DialogHeader>
					<DialogTitle className='text-base'>{isEditing ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
					<DialogDescription className='text-xs'>
						{kind === 'mock'
							? 'Return a mocked response (status, headers, body and delay) for matching requests.'
							: 'Configure header interception for matching requests.'}
					</DialogDescription>
				</DialogHeader>

				<div className='flex flex-col gap-4'>
					<div className='flex flex-col gap-1.5'>
						<Label className='text-xs font-medium'>Rule type</Label>
						<div className='grid grid-cols-2 gap-2'>
							<Button
								variant={kind === 'headers' ? 'default' : 'outline'}
								size='sm'
								className={cn('h-8 text-xs', kind !== 'headers' && 'bg-transparent')}
								onClick={() => setKind('headers')}
							>
								Modify request headers
							</Button>
							<Button
								variant={kind === 'mock' ? 'default' : 'outline'}
								size='sm'
								className={cn('h-8 text-xs', kind !== 'mock' && 'bg-transparent')}
								onClick={() => setKind('mock')}
							>
								Mock response
							</Button>
						</div>
						{kind === 'mock' && (
							<p className='text-[11px] text-muted-foreground'>
								Mocks use the chrome.debugger API: Chrome shows a "started debugging this browser" banner
								while a mock rule is active.
							</p>
						)}
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<div className='flex flex-col gap-1.5'>
							<Label htmlFor='rule-name' className='text-xs font-medium'>
								Rule name
							</Label>
							<Input
								id='rule-name'
								value={name ?? ''}
								onChange={e => setName(e.target.value)}
								placeholder='e.g. Add Auth Token'
								className='h-8 text-xs'
							/>
						</div>
						<div className='flex flex-col gap-1.5'>
							<Label htmlFor='rule-desc' className='text-xs font-medium'>
								Description
							</Label>
							<Input
								id='rule-desc'
								value={description ?? ''}
								onChange={e => setDescription(e.target.value)}
								placeholder='Optional description'
								className='h-8 text-xs'
							/>
						</div>
					</div>

					<div className='grid grid-cols-3 gap-3'>
						<div className='flex flex-col gap-1.5'>
							<Label className='text-xs font-medium'>URL match type</Label>
							<Select value={matchType} onValueChange={v => setMatchType(v as MatchType)}>
								<SelectTrigger className='h-8 text-xs'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='contains' className='text-xs'>
										Contains
									</SelectItem>
									<SelectItem value='startsWith' className='text-xs'>
										Starts with
									</SelectItem>
									<SelectItem value='regex' className='text-xs'>
										Regex
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='flex flex-col gap-1.5'>
							<Label htmlFor='url-filter' className='text-xs font-medium'>
								URL filter
							</Label>
							<Input
								id='url-filter'
								value={urlFilter}
								onChange={e => setUrlFilter(e.target.value)}
								placeholder={
									matchType === 'regex'
										? '^https://api\\..*'
										: matchType === 'startsWith'
											? 'https://api.example.com'
											: '/api/*'
								}
								className='h-8 font-mono text-xs'
							/>
						</div>
						<div className='flex flex-col gap-1.5'>
							<Label className='text-xs font-medium'>Resource type</Label>
							<Select value={resourceType} onValueChange={v => setResourceType(v as ResourceType)}>
								<SelectTrigger className='h-8 text-xs'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{RESOURCE_TYPES.map(type => (
										<SelectItem key={type.value} value={type.value} className='text-xs'>
											{type.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<Separator />

					{kind === 'mock' ? (
						<MockResponseEditor value={mock} onChange={setMock} />
					) : (
						<>
							<div className='flex flex-col gap-2'>
								<div className='flex items-center justify-between'>
									<Label className='text-xs font-medium'>Headers</Label>
									<Button variant='ghost' size='sm' className='h-7 gap-1 text-xs' onClick={addHeader}>
										<Plus className='h-3 w-3' />
										Add header
									</Button>
								</div>

								<div className='flex flex-col gap-2'>
									{headers.map(header => (
										<div key={header.id} className='flex items-center gap-2'>
											<Input
												value={header.name}
												onChange={e => updateHeader(header.id, 'name', e.target.value)}
												placeholder='Header name'
												className='h-8 flex-1 font-mono text-xs'
											/>
											<Input
												value={header.value}
												onChange={e => updateHeader(header.id, 'value', e.target.value)}
												placeholder='Header value'
												className='h-8 flex-1 font-mono text-xs'
											/>
											<Select
												value={header.action}
												onValueChange={v => updateHeader(header.id, 'action', v)}
											>
												<SelectTrigger className='h-8 w-28 text-xs'>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='append' className='text-xs'>
														Append
													</SelectItem>
													<SelectItem value='set' className='text-xs'>
														Add/Modify
													</SelectItem>
													<SelectItem value='remove' className='text-xs'>
														Remove
													</SelectItem>
												</SelectContent>
											</Select>
											<Button
												variant='ghost'
												size='icon'
												className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
												onClick={() => removeHeader(header.id)}
												disabled={headers.length === 1}
											>
												<X className='h-3.5 w-3.5' />
												<span className='sr-only'>Remove header</span>
											</Button>
										</div>
									))}
								</div>
							</div>

							<Separator />

							<div className='flex flex-col gap-2'>
								<div className='flex items-center gap-1.5'>
									<Zap className='h-3 w-3 text-muted-foreground' />
									<Label className='text-xs font-medium text-muted-foreground'>Quick Templates</Label>
								</div>
								<div className='flex flex-wrap gap-1.5'>
									<Button
										variant='outline'
										size='sm'
										className='h-7 text-[11px] bg-transparent'
										onClick={() => applyTemplate('bearer')}
									>
										Add Authorization Bearer
									</Button>
									<Button
										variant='outline'
										size='sm'
										className='h-7 text-[11px] bg-transparent'
										onClick={() => applyTemplate('apikey')}
									>
										Add X-API-Key
									</Button>
									<Button
										variant='outline'
										size='sm'
										className='h-7 text-[11px] bg-transparent'
										onClick={() => applyTemplate('nocache')}
									>
										Disable Cache
									</Button>
									<Button
										variant='outline'
										size='sm'
										className='h-7 text-[11px] bg-transparent'
										onClick={() => applyTemplate('origin')}
									>
										Fake Origin
									</Button>
								</div>
							</div>
						</>
					)}
				</div>

				<DialogFooter className='gap-2 sm:gap-0'>
					<Button variant='ghost' size='sm' className='text-xs' onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size='sm' className='text-xs' onClick={handleSave}>
						Save Rule
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
