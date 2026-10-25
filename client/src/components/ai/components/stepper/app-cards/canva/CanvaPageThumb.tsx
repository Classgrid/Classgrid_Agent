// One page of a design in the pages strip; tap it to see it big
import React from 'react';
import { cn } from '@/lib/utils';
import { Thumb } from '../shared';

// ─── Page thumbnail ───
export function CanvaPageThumb({ page, number, active, onClick }: { page: any; number: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex flex-col gap-1 cursor-pointer rounded-lg p-0.5', active && 'ring-2 ring-[#7D2AE8]')}>
      <Thumb src={page?.thumbnail?.url} alt={`Page ${page?.index}`} className="aspect-[4/3] w-full" />
      <span className="text-[11px] text-slate-500 dark:text-[#9a9a9a]">Page {page?.index ?? number}</span>
    </button>
  );
}
