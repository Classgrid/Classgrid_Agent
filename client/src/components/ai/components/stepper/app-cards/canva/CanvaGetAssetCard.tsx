// get_asset: one image from the user's Canva uploads
import React from 'react';
import { CanvaAssetCard } from './CanvaAssetCard';

// ─── Get image ───
export function CanvaGetAssetCard({ data }: { data: any }) {
  return <CanvaAssetCard asset={data?.asset} label="Image" />;
}
