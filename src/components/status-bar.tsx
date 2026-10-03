import type { MockEngineStatus } from '@core/ports/runtime.port';

interface StatusBarProps {
	activeCount: number;
	totalCount: number;
	mockEngine: MockEngineStatus;
}

export function StatusBar({ activeCount, totalCount, mockEngine }: StatusBarProps) {
	return (
		<footer className='flex items-center justify-between border-t px-4 py-1.5'>
			<div className='flex items-center gap-3'>
				<span className='text-[11px] text-muted-foreground'>
					{activeCount} of {totalCount} {totalCount == 1 ? 'rule' : 'rules'} active
				</span>
				{activeCount > 0 && (
					<span className='flex items-center gap-1 text-[11px] text-success'>
						<span className='inline-block h-1.5 w-1.5 rounded-full bg-success' />
						Intercepting
					</span>
				)}
				{mockEngine.attached && (
					<span className='flex items-center gap-1 text-[11px] text-primary'>
						<span className='inline-block h-1.5 w-1.5 rounded-full bg-primary' />
						Mocking responses
					</span>
				)}
				{mockEngine.error && (
					<span className='truncate text-[11px] text-destructive' title={mockEngine.error}>
						Mock engine: {mockEngine.error}
					</span>
				)}
			</div>
			<span className='text-[11px] text-muted-foreground'>DevTools Simple Proxy v2.0.0</span>
		</footer>
	);
}
