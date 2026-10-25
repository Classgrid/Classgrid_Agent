// "Show 4 more" / "Show less" so the card grows instead of scrolling
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CdShowMore({ hidden, open, onToggle }: { hidden: number; open: boolean; onToggle: () => void }) {
  if (hidden <= 0 && !open) return null;
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 self-start text-[12.5px] font-medium text-slate-500 hover:text-slate-900 dark:text-[#9a9a9a] dark:hover:text-white cursor-pointer">
      {open ? 'Show less' : 'Show ' + hidden + ' more'}<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
    </button>
  );
}
