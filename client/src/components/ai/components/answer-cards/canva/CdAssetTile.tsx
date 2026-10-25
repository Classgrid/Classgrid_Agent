// One image in a gallery: square picture and its name
import React from 'react';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';
import { CdCaption } from './CdCaption';

export type CdAssetData = { id?: string; name?: string; type?: string; tags?: string[]; thumbnail?: { url?: string }; created_at?: number; updated_at?: number };

export function CdAssetTile({ asset, onOpen }: { asset: CdAssetData; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex min-w-0 flex-col gap-1 text-left cursor-zoom-in">
      <CdAspect ratio="square"><CdImage src={asset.thumbnail?.url} alt={asset.name} /></CdAspect>
      <CdCaption>{asset.name || 'Image'}</CdCaption>
    </button>
  );
}
