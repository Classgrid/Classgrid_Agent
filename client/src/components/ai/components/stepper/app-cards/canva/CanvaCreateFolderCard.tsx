// create_folder: the new folder
import React from 'react';
import { CanvaFolderCard } from './CanvaFolderCard';

// ─── Create folder ───
export function CanvaCreateFolderCard({ data }: { data: any }) {
  return <CanvaFolderCard folder={data?.folder} label="Folder created" />;
}
