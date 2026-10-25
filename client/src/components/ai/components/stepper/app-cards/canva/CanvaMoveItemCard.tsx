// move_item: a design, image or folder was moved
import React from 'react';
import { FolderInput } from 'lucide-react';
import { CanvaActionDone } from './CanvaActionDone';

// ─── Move item ───
export function CanvaMoveItemCard({ args }: { args: any }) {
  return <CanvaActionDone icon={FolderInput} text="Moved" sub={args?.folder_id && args.folder_id !== 'root' ? 'Into the folder' : 'To the top level of Projects'} />;
}
