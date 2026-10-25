// The display card's top line: Canva logo, a short label, and room on the right
import React from 'react';
import { CdBrandMark } from './CdBrandMark';

export function CdTopBar({ label, right }: { label: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-4 pt-3.5 pb-2.5">
      <CdBrandMark />
      <span className="truncate text-[12.5px] font-medium text-slate-500 dark:text-[#9a9a9a]">{label}</span>
      {right && <div className="ml-auto flex shrink-0 items-center gap-1.5">{right}</div>}
    </div>
  );
}
