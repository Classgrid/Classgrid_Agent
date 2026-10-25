// Small dots under a deck showing which slide is open (for short decks)
import React from 'react';
import { cn } from '@/lib/utils';

export function CdSlideDots({ total, at, onPick }: { total: number; at: number; onPick: (i: number) => void }) {
  if (total < 2 || total > 12) return null;
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <button key={i} type="button" aria-label={'Slide ' + (i + 1)} onClick={() => onPick(i)} className={cn('h-1.5 rounded-full transition-all cursor-pointer', at === i ? 'w-5 bg-[#7D2AE8]' : 'w-1.5 bg-slate-300 dark:bg-[#444]')} />
      ))}
    </div>
  );
}
