// The small title above a group (Slides, Files, Images)
import React from 'react';

export function CdSectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#7d7d7d]">{children}</span>
      {right}
    </div>
  );
}
