// A Canva design as Canva sends it, its Edit / View links, and the small design tile used in carousels.
import React from 'react';
import { Thumb, fmtWhen } from '../shared';

export type CanvaDesign = { id?: string; title?: string; thumbnail?: { url?: string; width?: number; height?: number }; urls?: { edit_url?: string; view_url?: string }; url?: string; page_count?: number; updated_at?: number; created_at?: number };

export const canvaEditUrl = (d: CanvaDesign) => d.urls?.edit_url || d.url;
export const canvaViewUrl = (d: CanvaDesign) => d.urls?.view_url;

// ─── Design tile (for carousels): picture, page count, title, date ───
export function CanvaDesignTile({ design }: { design: CanvaDesign }) {
  return (
    <a href={canvaEditUrl(design) || canvaViewUrl(design)} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1.5 min-w-0">
      <div className="relative aspect-[4/3] rounded-xl bg-slate-100 dark:bg-[#222] overflow-hidden">
        <Thumb src={design.thumbnail?.url} alt={design.title} className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300" rounded="rounded-none" />
        {design.page_count && design.page_count > 1 ? <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] font-medium text-white">{design.page_count} pages</span> : null}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-slate-900 dark:text-white truncate group-hover:underline">{design.title || 'Untitled design'}</div>
        {(design.updated_at || design.created_at) && <div className="text-[11.5px] text-slate-500 dark:text-[#9a9a9a]">{fmtWhen(design.updated_at || design.created_at)}</div>}
      </div>
    </a>
  );
}
