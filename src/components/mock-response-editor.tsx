import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import type { MockHeader, MockResponse } from '@domain/rule';

const STATUS_SHORTCUTS = [200, 201, 204, 400, 401, 403, 404, 500, 503];

const CONTENT_TYPES = ['application/json', 'text/plain', 'text/html', 'application/xml'];

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

interface MockResponseEditorProps {
	value: MockResponse;
	onChange: (value: MockResponse) => void;
}

export function MockResponseEditor({ value, onChange }: MockResponseEditorProps) {
	const update = useCallback(
		<K extends keyof MockResponse>(field: K, fieldValue: MockResponse[K]) => onChange({ ...value, [field]: fieldValue }),
		[value, onChange],
	);

	const updateHeader = (id: number, field: keyof Omit<MockHeader, 'id'>, fieldValue: string) =>
		update(
			'headers',
			value.headers.map(h => (h.id === id ? { ...h, [field]: fieldValue } : h)),
		);

	const formatBody = () => {
		try {
			update('body', JSON.stringify(JSON.parse(value.body), null, '\t'));
		} catch {
			// Mantém o body como está; o erro já é exibido abaixo do editor
		}
	};

	const jsonError = getJsonError(value);

	return (
		<div className='flex flex-col gap-4'>
			<div className='grid grid-cols-3 gap-3'>
				<div className='flex flex-col gap-1.5'>
					<Label htmlFor='mock-status' className='text-xs font-medium'>
						Status code
					</Label>
					<Input
						id='mock-status'
						type='number'
						min={100}
						max={599}
						value={value.status}
						onChange={e => update('status', Number(e.target.value))}
						className='h-8 font-mono text-xs'
					/>
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
			</div>

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

			<div className='flex flex-col gap-1.5'>
				<div className='flex items-center justify-between'>
					<Label htmlFor='mock-body' className='text-xs font-medium'>
						Response body
					</Label>
					{value.contentType.includes('json') && (
						<Button variant='ghost' size='sm' className='h-7 text-xs' onClick={formatBody}>
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
					className={cn(
						'scrollbar w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs',
						'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
						jsonError && 'border-destructive',
					)}
				/>
				{jsonError && <p className='text-[11px] text-destructive'>{jsonError}</p>}
			</div>

			<div className='flex flex-col gap-2'>
				<div className='flex items-center justify-between'>
					<Label className='text-xs font-medium'>Response headers</Label>
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
				{value.headers.map(header => (
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
						<Button
							variant='ghost'
							size='icon'
							className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
							onClick={() =>
								update(
									'headers',
									value.headers.filter(h => h.id !== header.id),
								)
							}
						>
							<X className='h-3.5 w-3.5' />
							<span className='sr-only'>Remove header</span>
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
