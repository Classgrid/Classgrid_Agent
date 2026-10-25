// One Canva folder: folder icon, name and when it was last changed
import React from 'react';
import { Folder } from 'lucide-react';
import { AppCard, fmtWhen } from '../shared';

// ─── Folder ───
export function CanvaFolderCard({ folder, label }: { folder: any; label: string }) {
  return (
    <AppCard brand="canva" title={label}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7D2AE8]/10 text-[#7D2AE8] dark:text-[#b586ff]"><Folder className="h-6 w-6" /></div>
        <div className="min-w-0">
          <div className="text-[14.5px] font-semibold text-slate-900 dark:text-white truncate">{folder?.name || 'Folder'}</div>
          {(folder?.updated_at || folder?.created_at) && <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">Updated {fmtWhen(folder.updated_at || folder.created_at)}</div>}
        </div>
      </div>
    </AppCard>
  );
}
