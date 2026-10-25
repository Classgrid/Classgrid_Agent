// Short facts in one line joined by dots (6 pages · 1920 × 1080 · Edited 25 Oct); empty ones are skipped
import React from 'react';
import { cn } from '@/lib/utils';
import { CdDot } from './CdDot';

export function CdFactLine({ items, className }: { items: React.ReactNode[]; className?: string }) {
  const shown = items.filter((x) => x !== null && x !== undefined && x !== false && x !== '');
  if (!shown.length) return null;
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-slate-500 dark:text-[#9a9a9a]', className)}>
      {shown.map((x, i) => <React.Fragment key={i}>{i > 0 && <CdDot />}<span className="truncate">{x}</span></React.Fragment>)}
    </div>
  );
}
