// delete_folder: the folder was deleted
import React from 'react';
import { Trash2 } from 'lucide-react';
import { CanvaActionDone } from './CanvaActionDone';

// ─── Delete folder ───
export function CanvaDeleteFolderCard() {
  return <CanvaActionDone icon={Trash2} text="Folder deleted" />;
}
