import { useCallback, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { Separator } from '@components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { cn } from '@lib/utils';
import type { JsonOperation, MockHeader, MockMode, MockResponse, TextOperation } from '@domain/rule';
import { applyResponseTransform } from '@domain/response-transform';

const STATUS_SHORTCUTS = [200, 201, 204, 400, 401, 403, 404, 500, 503];

const CONTENT_TYPES = ['application/json', 'text/plain', 'text/html', 'application/xml'];

const SAMPLE_ORIGINAL = '{\n\t"data": {\n\t\t"user": { "name": "Jane", "plan": "free" },\n\t\t"token": "abc"\n\t},\n\t"status": "PENDING"\n}';

const textareaClassName = cn(
	'scrollbar w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs',
	'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

function generateId() {
	return Number(Math.random().toString().substring(2, 9));
}

const getJsonError = (mock: MockResponse) => {
	if (!mock.contentType.includes('json') || !mock.body.trim()) return null;
	try {
		JSON.parse(mock.body);
		return null;
	} catch (error) {
		return error instanceof Error ? error.message : 'Invalid JSON';
	}
};

const formatJson = (text: string) => {
	try {
		return JSON.stringify(JSON.parse(text), null, '\t');
	} catch {
		return text;
	}
};

interface MockResponseEditorProps {
	value: MockResponse;
	onChange: (value: MockResponse) => void;
}

export function MockResponseEditor({ value, onChange }: MockResponseEditorProps) {
	const [sample, setSample] = useState(SAMPLE_ORIGINAL);

	const update = useCallback(
		<K extends keyof MockResponse>(field: K, fieldValue: MockResponse[K]) => onChange({ ...value, [field]: fieldValue }),
		[value, onChange],
	);

	const updateItem = <K extends 'headers' | 'jsonOps' | 'textOps'>(
		field: K,
		id: number,
		patch: Partial<MockResponse[K][number]>,
	) =>
		update(
			field,
			(value[field] as { id: number }[]).map(item => (item.id === id ? { ...item, ...patch } : item)) as MockResponse[K],
		);

	const removeItem = <K extends 'headers' | 'jsonOps' | 'textOps'>(field: K, id: number) =>
		update(field, (value[field] as { id: number }[]).filter(item => item.id !== id) as MockResponse[K]);

	const isTransform = value.mode === 'transform';
	const jsonError = isTransform ? null : getJsonError(value);

	const preview = useMemo(
		() => (isTransform ? applyResponseTransform({ body: sample, contentType: '' }, value) : null),
		[isTransform, sample, value],
	);

	const statusShortcuts = (
		<div className='flex flex-wrap gap-1.5'>
			{STATUS_SHORTCUTS.map(status => (
				<Button
					key={status}
					variant={value.status === status ? 'default' : 'outline'}
					size='sm'
					className={cn('h-6 px-2 font-mono text-[11px]', value.status !== status && 'bg-transparent')}
					onClick={() => update('status', status)}
				>
					{status}
				</Button>
			))}
		</div>
	);

	const statusInput = (
		<Input
			id='mock-status'
			type='number'
			min={100}
			max={599}
			value={value.status}
			disabled={isTransform && !value.overrideStatus}
			onChange={e => update('status', Number(e.target.value))}
			className='h-8 font-mono text-xs'
		/>
	);

	const delayInput = (
		<div className='flex flex-col gap-1.5'>
			<Label htmlFor='mock-delay' className='text-xs font-medium'>
				Delay (ms)
			</Label>
			<Input
				id='mock-delay'
				type='number'
				min={0}
				step={100}
				value={value.delayMs}
				onChange={e => update('delayMs', Math.max(0, Number(e.target.value)))}
				className='h-8 font-mono text-xs'
			/>
		</div>
	);

	return (
		<div className='flex flex-col gap-4'>
			<div className='grid grid-cols-2 gap-2'>
				{(
					[
						['replace', 'Replace body'],
						['transform', 'Modify original response'],
					] as [MockMode, string][]
				).map(([mode, label]) => (
					<Button
						key={mode}
						variant={value.mode === mode ? 'secondary' : 'ghost'}
						size='sm'
						className='h-7 text-xs'
						onClick={() => update('mode', mode)}
					>
						{label}
					</Button>
				))}
			</div>

			{isTransform ? (
				<>
					<p className='text-[11px] text-muted-foreground'>
						The request goes to the real server; the response is changed before reaching the page. Status
						and headers are kept unless overridden.
					</p>
					<div className='grid grid-cols-2 gap-3'>
						<div className='flex flex-col gap-1.5'>
							<div className='flex items-center justify-between'>
								<Label htmlFor='mock-status' className='text-xs font-medium'>
									Override status
								</Label>
								<Switch
									checked={value.overrideStatus}
									onCheckedChange={checked => update('overrideStatus', checked)}
									className='scale-75'
								/>
							</div>
							{statusInput}
						</div>
						{delayInput}
					</div>
					{value.overrideStatus && statusShortcuts}

					<Separator />

					<div className='flex flex-col gap-2'>
						<div className='flex items-center justify-between'>
							<div className='flex flex-col'>
								<Label className='text-xs font-medium'>JSON operations</Label>
								<span className='text-[11px] text-muted-foreground'>
									Path: <code>data.user.name</code>, <code>items[0]</code>, <code>items[*].price</code>.
									Value: JSON (<code>"text"</code>, <code>10</code>, <code>true</code>) or{' '}
									<code>{'{{$.path}}'}</code> / <code>{'{{value}}'}</code>.
								</span>
							</div>
							<Button
								variant='ghost'
								size='sm'
								className='h-7 shrink-0 gap-1 text-xs'
								onClick={() =>
									update('jsonOps', [
										...value.jsonOps,
										{ id: generateId(), op: 'set', path: '', value: '' },
									])
								}
							>
								<Plus className='h-3 w-3' />
								Add operation
							</Button>
						</div>
						{value.jsonOps.map(operation => (
							<div key={operation.id} className='flex items-center gap-2'>
								<Select
									value={operation.op}
									onValueChange={op => updateItem('jsonOps', operation.id, { op: op as JsonOperation['op'] })}
								>
									<SelectTrigger className='h-8 w-24 text-xs'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='set' className='text-xs'>
											Set
										</SelectItem>
										<SelectItem value='remove' className='text-xs'>
											Remove
										</SelectItem>
									</SelectContent>
								</Select>
								<Input
									value={operation.path}
									onChange={e => updateItem('jsonOps', operation.id, { path: e.target.value })}
									placeholder='data.user.plan'
									className='h-8 flex-1 font-mono text-xs'
								/>
								<Input
									value={operation.value}
									disabled={operation.op === 'remove'}
									onChange={e => updateItem('jsonOps', operation.id, { value: e.target.value })}
									placeholder={operation.op === 'remove' ? '' : '"premium"'}
									className='h-8 flex-1 font-mono text-xs'
								/>
								<RemoveButton onClick={() => removeItem('jsonOps', operation.id)} />
							</div>
						))}
					</div>

					<div className='flex flex-col gap-2'>
						<div className='flex items-center justify-between'>
							<div className='flex flex-col'>
								<Label className='text-xs font-medium'>Text replacements</Label>
								<span className='text-[11px] text-muted-foreground'>
									Applied after JSON operations. Regex replacements support <code>$1</code>.
								</span>
							</div>
							<Button
								variant='ghost'
								size='sm'
								className='h-7 shrink-0 gap-1 text-xs'
								onClick={() =>
									update('textOps', [
										...value.textOps,
										{ id: generateId(), find: '', replace: '', regex: false },
									])
								}
							>
								<Plus className='h-3 w-3' />
								Add replacement
							</Button>
						</div>
						{value.textOps.map((operation: TextOperation) => (
							<div key={operation.id} className='flex items-center gap-2'>
								<Input
									value={operation.find}
									onChange={e => updateItem('textOps', operation.id, { find: e.target.value })}
									placeholder={operation.regex ? '"status":"(\\w+)"' : 'Find'}
									className='h-8 flex-1 font-mono text-xs'
								/>
								<Input
									value={operation.replace}
									onChange={e => updateItem('textOps', operation.id, { replace: e.target.value })}
									placeholder='Replace with'
									className='h-8 flex-1 font-mono text-xs'
								/>
								<label className='flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground'>
									<Switch
										checked={operation.regex}
										onCheckedChange={regex => updateItem('textOps', operation.id, { regex })}
										className='scale-75'
									/>
									Regex
								</label>
								<RemoveButton onClick={() => removeItem('textOps', operation.id)} />
							</div>
						))}
					</div>

					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='mock-template' className='text-xs font-medium'>
							Template (optional)
						</Label>
						<span className='text-[11px] text-muted-foreground'>
							Final body. <code>{'{{body}}'}</code> = result so far, <code>{'{{$.path}}'}</code> = value from
							the original JSON, <code>{'{{$.path | json}}'}</code> = value as JSON.
						</span>
						<textarea
							id='mock-template'
							value={value.textTemplate}
							onChange={e => update('textTemplate', e.target.value)}
							spellCheck={false}
							rows={3}
							placeholder={'/* patched */ {{body}}'}
							className={textareaClassName}
						/>
					</div>

					<Separator />

					<div className='grid grid-cols-2 gap-3'>
						<div className='flex flex-col gap-1.5'>
							<Label htmlFor='mock-sample' className='text-xs font-medium'>
								Preview: original response
							</Label>
							<textarea
								id='mock-sample'
								value={sample}
								onChange={e => setSample(e.target.value)}
								spellCheck={false}
								rows={8}
								className={textareaClassName}
							/>
						</div>
						<div className='flex flex-col gap-1.5'>
							<Label className='text-xs font-medium'>Preview: result</Label>
							<pre
								className={cn(
									textareaClassName,
									'h-full min-h-[8rem] overflow-auto whitespace-pre-wrap break-all bg-muted/30',
								)}
							>
								{preview && formatJson(preview.body)}
							</pre>
						</div>
					</div>
					{preview?.errors.map(error => (
						<p key={error} className='text-[11px] text-destructive'>
							{error}
						</p>
					))}
				</>
			) : (
				<>
					<div className='grid grid-cols-3 gap-3'>
						<div className='flex flex-col gap-1.5'>
							<Label htmlFor='mock-status' className='text-xs font-medium'>
								Status code
							</Label>
							{statusInput}
						</div>
						<div className='flex flex-col gap-1.5'>
							<Label htmlFor='mock-content-type' className='text-xs font-medium'>
								Content-Type
							</Label>
							<Input
								id='mock-content-type'
								list='mock-content-types'
								value={value.contentType}
								onChange={e => update('contentType', e.target.value)}
								className='h-8 font-mono text-xs'
							/>
							<datalist id='mock-content-types'>
								{CONTENT_TYPES.map(type => (
									<option key={type} value={type} />
								))}
							</datalist>
						</div>
						{delayInput}
					</div>

					{statusShortcuts}

					<div className='flex flex-col gap-1.5'>
						<div className='flex items-center justify-between'>
							<Label htmlFor='mock-body' className='text-xs font-medium'>
								Response body
							</Label>
							{value.contentType.includes('json') && (
								<Button
									variant='ghost'
									size='sm'
									className='h-7 text-xs'
									onClick={() => update('body', formatJson(value.body))}
								>
									Format JSON
								</Button>
							)}
						</div>
						<textarea
							id='mock-body'
							value={value.body}
							onChange={e => update('body', e.target.value)}
							spellCheck={false}
							rows={8}
							className={cn(textareaClassName, jsonError && 'border-destructive')}
						/>
						{jsonError && <p className='text-[11px] text-destructive'>{jsonError}</p>}
					</div>
				</>
			)}

			<div className='flex flex-col gap-2'>
				<div className='flex items-center justify-between'>
					<Label className='text-xs font-medium'>
						{isTransform ? 'Response headers (add / override)' : 'Response headers'}
					</Label>
					<Button
						variant='ghost'
						size='sm'
						className='h-7 gap-1 text-xs'
						onClick={() => update('headers', [...value.headers, { id: generateId(), name: '', value: '' }])}
					>
						<Plus className='h-3 w-3' />
						Add header
					</Button>
				</div>
				{value.headers.map((header: MockHeader) => (
					<div key={header.id} className='flex items-center gap-2'>
						<Input
							value={header.name}
							onChange={e => updateItem('headers', header.id, { name: e.target.value })}
							placeholder='Header name'
							className='h-8 flex-1 font-mono text-xs'
						/>
						<Input
							value={header.value}
							onChange={e => updateItem('headers', header.id, { value: e.target.value })}
							placeholder='Header value'
							className='h-8 flex-1 font-mono text-xs'
						/>
						<RemoveButton onClick={() => removeItem('headers', header.id)} />
					</div>
				))}
			</div>
		</div>
	);
}

function RemoveButton({ onClick }: { onClick: () => void }) {
	return (
		<Button
			variant='ghost'
			size='icon'
			className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
			onClick={onClick}
		>
			<X className='h-3.5 w-3.5' />
			<span className='sr-only'>Remove</span>
		</Button>
	);
}
