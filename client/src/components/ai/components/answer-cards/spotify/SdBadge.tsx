// A small rounded badge; green is the Spotify badge, the rest are quiet colors
import React from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  plain: 'bg-slate-100 text-slate-600 dark:bg-[#262626] dark:text-[#b5b5b5]',
  green: 'bg-[#1DB954]/15 text-[#13843c] dark:text-[#1ed760]',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
} as const;

export function SdBadge({ children, tone = 'plain', icon }: { children: React.ReactNode; tone?: keyof typeof TONES; icon?: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium', TONES[tone])}>{icon}{children}</span>;
}
