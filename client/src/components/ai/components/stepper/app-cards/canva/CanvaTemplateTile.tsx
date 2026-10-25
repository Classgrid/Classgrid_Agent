// A brand template as a tile (picture and title) that opens it in Canva
import React from 'react';
import { Thumb } from '../shared';

// ─── Template tile ───
export function CanvaTemplateTile({ template }: { template: any }) {
  return (
    <a href={template?.create_url || template?.view_url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1.5 min-w-0">
      <div className="aspect-[4/3] rounded-xl bg-slate-100 dark:bg-[#222] overflow-hidden"><Thumb src={template?.thumbnail?.url} alt={template?.title} className="h-full w-full group-hover:scale-[1.03] transition-transform duration-300" rounded="rounded-none" /></div>
      <div className="text-[13px] font-medium text-slate-900 dark:text-white truncate group-hover:underline">{template?.title || 'Template'}</div>
    </a>
  );
}
