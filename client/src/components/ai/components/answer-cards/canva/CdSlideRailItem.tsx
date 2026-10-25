// One small slide in the row of all slides; the open one gets a ring
import React from 'react';
import { cn } from '@/lib/utils';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';

export function CdSlideRailItem({ src, number, active, onClick }: { src?: string; number: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={'Slide ' + number} aria-pressed={active} className="w-20 shrink-0 cursor-pointer">
      <CdAspect ratio="16/9" className={cn('rounded-lg ring-offset-2 ring-offset-white transition-shadow dark:ring-offset-[#171717]', active ? 'ring-2 ring-[#7D2AE8]' : 'hover:ring-1 hover:ring-slate-300 dark:hover:ring-[#444]')}>
        <CdImage src={src} alt={'Slide ' + number} />
      </CdAspect>
    </button>
  );
}
