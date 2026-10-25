// One tab (Designs, Files, Images, Folders) with its count
import React from 'react';
import { cn } from '@/lib/utils';

export function CdTabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer', active ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-600 hover:bg-slate-100 dark:text-[#b5b5b5] dark:hover:bg-[#262626]')}>
      {label}<span className={cn('tabular-nums', active ? 'opacity-70' : 'text-slate-400 dark:text-[#7d7d7d]')}>{count}</span>
    </button>
  );
}
