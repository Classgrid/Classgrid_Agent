// update_asset: the image with its new name / tags
import React from 'react';
import { CanvaAssetCard } from './CanvaAssetCard';

// ─── Update image ───
export function CanvaUpdateAssetCard({ data }: { data: any }) {
  return <CanvaAssetCard asset={data?.asset} label="Image updated" />;
}
