// Short facts in one line joined by dots; empty ones are skipped
import React from 'react';
import { cn } from '@/lib/utils';

export function SdFactLine({ items, className }: { items: React.ReactNode[]; className?: string }) {
  const shown = items.filter((x) => x !== null && x !== undefined && x !== false && x !== '');
  if (!shown.length) return null;
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-slate-500 dark:text-[#9a9a9a]', className)}>
      {shown.map((x, i) => <React.Fragment key={i}>{i > 0 && <span aria-hidden className="text-slate-300 dark:text-[#4a4a4a]">&middot;</span>}<span className="truncate">{x}</span></React.Fragment>)}
    </div>
  );
}
