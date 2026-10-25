// "3 / 6"
import React from 'react';

export function CdSlideCounter({ at, total }: { at: number; total: number }) {
  return <span className="min-w-[3.5rem] text-center text-[12.5px] font-medium tabular-nums text-slate-600 dark:text-[#b5b5b5]">{at} / {total}</span>;
}
