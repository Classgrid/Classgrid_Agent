// The place number on a top artist (#1, #2...)
import React from 'react';
import { cn } from '@/lib/utils';

export function SdArtistRank({ n, className }: { n: number; className?: string }) {
  return <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11.5px] font-bold tabular-nums shadow-sm', n === 1 ? 'bg-[#1DB954] text-black' : 'bg-white text-slate-700 dark:bg-[#262626] dark:text-[#e2e2e2]', className)}>#{n}</span>;
}
