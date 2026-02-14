interface StatusBarProps {
	activeCount: number;
	totalCount: number;
}

export function StatusBar({ activeCount, totalCount }: StatusBarProps) {
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
			</div>
			<span className='text-[11px] text-muted-foreground'>DevTools Simple Proxy v2.0.0</span>
		</footer>
	);
}
