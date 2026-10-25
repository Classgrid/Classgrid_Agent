// A PDF as a small file row: name, open in a new tab, download
import React from 'react';
import { CdPdfToolbar } from './CdPdfToolbar';

export function CdPdfReader({ url }: { url: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-[#2a2a2a]">
      <CdPdfToolbar url={url} />
    </div>
  );
}
