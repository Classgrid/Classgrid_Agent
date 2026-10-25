// A soft red box for something that could not be shown, with Canva's upgrade link when it sends one
import React from 'react';
import { XCircle } from 'lucide-react';

export function CdErrorBox({ text }: { text: string }) {
  const upgrade = text.match(/Upgrade link:\s*(https?:\/\/\S+)/)?.[1];
  const clean = text.replace(/\s*Upgrade link:\s*\S+/, '');
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-500/10">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1 text-[13px] text-red-700 dark:text-red-300 break-words">
        {clean}
        {upgrade && <a href={upgrade} target="_blank" rel="noopener noreferrer" className="ml-1.5 font-medium underline">Upgrade Canva</a>}
      </div>
    </div>
  );
}
