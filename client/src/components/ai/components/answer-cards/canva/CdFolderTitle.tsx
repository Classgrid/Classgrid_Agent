// A folder's name with a folder icon
import React from 'react';
import { Folder } from 'lucide-react';

export function CdFolderTitle({ name }: { name?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7D2AE8]/10 text-[#7D2AE8] dark:text-[#c39bff]"><Folder className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 truncate text-[15px] font-semibold text-slate-900 dark:text-white">{name || 'Folder'}</span>
    </div>
  );
}
