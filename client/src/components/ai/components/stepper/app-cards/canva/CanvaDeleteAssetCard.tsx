// delete_asset: the image was deleted
import React from 'react';
import { Trash2 } from 'lucide-react';
import { CanvaActionDone } from './CanvaActionDone';

// ─── Delete image ───
export function CanvaDeleteAssetCard() {
  return <CanvaActionDone icon={Trash2} text="Image deleted" />;
}
