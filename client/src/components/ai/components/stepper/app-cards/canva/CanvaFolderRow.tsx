// A subfolder as one short row inside a folder's contents
import React from 'react';
import { Folder } from 'lucide-react';

// ─── Folder row ───
export function CanvaFolderRow({ folder }: { folder: any }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Folder className="h-4 w-4 text-[#7D2AE8] dark:text-[#b586ff]" />
      <span className="text-[13.5px] text-slate-900 dark:text-white truncate">{folder?.name}</span>
    </div>
  );
}
