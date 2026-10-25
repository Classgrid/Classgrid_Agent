// rename_folder: the folder with its new name
import React from 'react';
import { CanvaFolderCard } from './CanvaFolderCard';

// ─── Rename folder ───
export function CanvaRenameFolderCard({ data }: { data: any }) {
  return <CanvaFolderCard folder={data?.folder} label="Folder renamed" />;
}
