// One exported file (PDF, PowerPoint, video…) as a download row
import React from 'react';
import { Download, FileText } from 'lucide-react';

// ─── Export file row ───
export function CanvaExportFileRow({ href, name }: { href: string; name: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1f1f1f] transition-colors">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7D2AE8]/10 text-[#7D2AE8] dark:text-[#b586ff]"><FileText className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-slate-900 dark:text-white">{name}</div>
        <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">Link works for 24 hours</div>
      </div>
      <Download className="h-4 w-4 text-slate-400" />
    </a>
  );
}
