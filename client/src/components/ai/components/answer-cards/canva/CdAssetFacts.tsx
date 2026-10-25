// An image's facts: type and when it was added
import React from 'react';
import { CdFactLine } from './CdFactLine';
import { CdTimeText } from './CdTimeText';

export function CdAssetFacts({ asset }: { asset: { type?: string; created_at?: number; updated_at?: number } }) {
  return <CdFactLine items={[asset.type ? asset.type.charAt(0).toUpperCase() + asset.type.slice(1) : null, <CdTimeText value={asset.updated_at || asset.created_at} prefix="Added" />]} />;
}
