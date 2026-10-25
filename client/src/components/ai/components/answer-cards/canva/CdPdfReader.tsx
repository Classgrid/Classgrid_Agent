// A PDF to read right in the chat
import React from 'react';
import { CdPdfToolbar } from './CdPdfToolbar';

export function CdPdfReader({ url }: { url: string }) {
  return (
    <div className="flex flex-col gap-2">
      <CdPdfToolbar url={url} />
      <iframe src={url} title="PDF" loading="lazy" className="h-[460px] w-full rounded-xl border border-slate-200 bg-white dark:border-[#2a2a2a]" />
    </div>
  );
}
