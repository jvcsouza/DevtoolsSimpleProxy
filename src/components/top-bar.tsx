import { Profile } from './../types';
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { Download, Plus, Upload } from 'lucide-react';

interface TopBarProps {
	profiles: Profile[];
	selectedProfile: string;
	onProfileChange: (profileId: string) => void;
	onCreateRule: () => void;
	onExportRules?: () => void;
	onImportRules?: () => void;
}

export function TopBar({
	profiles,
	selectedProfile,
	onProfileChange,
	onCreateRule,
	onImportRules,
	onExportRules,
}: TopBarProps) {
	return (
		<header className='flex items-center justify-between border-b px-4 py-2.5'>
			<div className='flex items-center gap-2'>
				<div className='h-4 w-4 rounded-sm bg-primary'></div>
				<h1 className='text-sm font-semibold text-foreground'>DevTools Simple Proxy</h1>
			</div>

			<div className='flex items-center gap-2'>
				<Select value={selectedProfile} onValueChange={onProfileChange}>
					<SelectTrigger className='h-8 w-40 text-xs'>
						<SelectValue placeholder='Select profile'></SelectValue>
					</SelectTrigger>
					<SelectContent>
						{profiles.map(profile => (
							<SelectItem key={profile.id} value={profile.id} className='text-xs'>
								{profile.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='flex items-center gap-1.5'>
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button onClick={onImportRules} variant='ghost' size='icon' className='h-8 w-8'>
								<Upload className='h-3.5 w-3.5' />
								<span className='sr-only'>Import JSON</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent side='bottom'>
							<p className='text-xs'>Import JSON</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button onClick={onExportRules} variant='ghost' size='icon' className='h-8 w-8'>
								<Download className='h-3.5 w-3.5' />
								<span className='sr-only'>Export JSON</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent side='bottom'>
							<p className='text-xs'>Export JSON</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<div className='mx-1 h-5 w-px bg-border' />

				<Button size='sm' className='h-8 gap-1.5 text-xs' onClick={onCreateRule}>
					<Plus className='h-3.5 w-3.5' />
					Create Rule
				</Button>
			</div>
		</header>
	);
}
