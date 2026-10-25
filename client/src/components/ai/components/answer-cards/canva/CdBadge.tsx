// A small rounded badge; purple is the Canva badge, the rest are quiet colors
import React from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  plain: 'bg-slate-100 text-slate-600 dark:bg-[#262626] dark:text-[#b5b5b5]',
  purple: 'bg-[#7D2AE8]/12 text-[#6a1fd0] dark:bg-[#7D2AE8]/20 dark:text-[#c39bff]',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
} as const;

export function CdBadge({ children, tone = 'plain', icon }: { children: React.ReactNode; tone?: keyof typeof TONES; icon?: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium', TONES[tone])}>{icon}{children}</span>;
}
