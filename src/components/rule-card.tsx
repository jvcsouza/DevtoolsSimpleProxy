import { cn } from './../lib/utils';
import { Rule } from '../types';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface RuleCardProps {
	rule: Rule;
	onToggle: (id: number) => void;
	onEdit: (rule: Rule) => void;
	onDelete: (id: number) => void;
}

export function RuleCard({ rule, onToggle, onEdit, onDelete }: RuleCardProps) {
	return (
		<div
			className={cn(
				'group flex items-center gap-3 border px-3 py-2.5 transition-colors',
				'rounded-md bg-card',
				rule.enabled ? 'border-primary/30 shadow-sm' : 'border-border hover:border-muted-foreground/20',
			)}
		>
			{rule.enabled && <div className='absolute left-0 top-0 h-full w-0.5 rounded-l-md bg-success' />}

			<div className='relative flex items-center'>
				<Switch checked={rule.enabled} onCheckedChange={() => onToggle(rule.id)} className='scale-75' />
			</div>

			<div className='flex min-w-0 flex-1 flex-col gap-1'>
				<div className='flex items-center gap-2'>
					<span className='truncate text-sm font-medium text-foreground'>{rule.name}</span>
					{rule.enabled && <span className='h-1.5 w-1.5 shrink-0 rounded-full bg-success'></span>}
				</div>
				{rule.description && <p className='truncate text-xs text-muted-foreground'>{rule.description}</p>}
			</div>

			<div className='flex shrink-0 items-center gap-1.5'>
				<Badge variant='outline' className='font-mono text-[10px] font-normal'>
					{rule.urlFilter}
				</Badge>
				{rule.resourceTypes.map(type => (
					<Badge key={type} variant='secondary' className='text-[10px] font-normal'>
						{type}
					</Badge>
				))}
			</div>

			<div className='flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => onEdit(rule)}>
								<Pencil className='h-3 w-3' />
								<span className='sr-only'>Edit rule</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent side='top'>
							<p className='text-xs'>Edit</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant='ghost'
								size='icon'
								className='h-7 w-7 text-destructive hover:text-destructive'
								onClick={() => onDelete(rule.id)}
							>
								<Trash2 className='h-3 w-3' />
								<span className='sr-only'>Delete rule</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent side='top'>
							<p className='text-xs'>Delete</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}
