// One thing inside a folder: a design or image (picture + name) or a subfolder
import React from 'react';
import { Folder } from 'lucide-react';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';
import { CdCaption } from './CdCaption';

export function CdFolderItem({ item }: { item: any }) {
  if (item?.type === 'folder') {
    return <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-2 dark:border-[#2a2a2a]"><Folder className="h-4 w-4 text-[#7D2AE8] dark:text-[#c39bff]" /><span className="truncate text-[13px] text-slate-900 dark:text-white">{item.folder?.name || 'Folder'}</span></div>;
  }
  const d = item?.design || item?.image || {};
  const href = d.urls?.edit_url || d.urls?.view_url;
  const body = <><CdAspect ratio="4/3"><CdImage src={d.thumbnail?.url} alt={d.title || d.name} /></CdAspect><CdCaption>{d.title || d.name || 'Untitled'}</CdCaption></>;
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-col gap-1 hover:opacity-95">{body}</a> : <div className="flex min-w-0 flex-col gap-1">{body}</div>;
}
