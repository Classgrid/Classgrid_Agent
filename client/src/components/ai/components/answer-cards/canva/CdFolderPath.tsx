// Where the folder lives: "Projects / Folder name"
import React from 'react';
import { ChevronRight } from 'lucide-react';

export function CdFolderPath({ name }: { name?: string }) {
  return <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-[#9a9a9a]">Projects<ChevronRight className="h-3 w-3" /><span className="truncate">{name || 'Folder'}</span></div>;
}
