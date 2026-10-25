// One tab (Music, Playlists, Artists, Albums) with its count
import React from 'react';
import { cn } from '@/lib/utils';

export function SdTab({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors cursor-pointer', active ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#232323] dark:text-[#b5b5b5] dark:hover:bg-[#2c2c2c]')}>
      {label}{typeof count === 'number' && count > 0 && <span className={cn('tabular-nums', active ? 'opacity-70' : 'text-slate-400 dark:text-[#7d7d7d]')}>{count}</span>}
    </button>
  );
}
