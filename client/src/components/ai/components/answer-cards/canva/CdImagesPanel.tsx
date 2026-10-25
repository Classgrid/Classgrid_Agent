// The uploaded images
import React from 'react';
import { CdAssetGallery } from './CdAssetGallery';
import { type CdAssetData } from './CdAssetTile';

export function CdImagesPanel({ assets }: { assets: CdAssetData[] }) {
  return <CdAssetGallery assets={assets} />;
}
