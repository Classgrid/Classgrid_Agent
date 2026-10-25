// get_folder: one folder's details
import React from 'react';
import { CanvaFolderCard } from './CanvaFolderCard';

// ─── Get folder ───
export function CanvaGetFolderCard({ data }: { data: any }) {
  return <CanvaFolderCard folder={data?.folder} label="Folder" />;
}
