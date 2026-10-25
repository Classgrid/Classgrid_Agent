// One uploaded image shown big with its name, facts and tags
import React, { useState } from 'react';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';
import { CdHeading } from './CdHeading';
import { CdAssetFacts } from './CdAssetFacts';
import { CdTagCloud } from './CdTagCloud';
import { CdImageZoom } from './CdImageZoom';
import { type CdAssetData } from './CdAssetTile';

export function CdAssetSpotlight({ asset }: { asset: CdAssetData }) {
  const [zoom, setZoom] = useState(false);
  const src = asset.thumbnail?.url;
  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" disabled={!src} onClick={() => setZoom(true)} className="block w-full cursor-zoom-in disabled:cursor-default">
        <CdAspect ratio="16/9" className="bg-slate-50 dark:bg-[#1c1c1c]"><CdImage src={src} alt={asset.name} fit="contain" /></CdAspect>
      </button>
      <div className="flex min-w-0 flex-col gap-0.5"><CdHeading>{asset.name || 'Image'}</CdHeading><CdAssetFacts asset={asset} /></div>
      <CdTagCloud tags={asset.tags} />
      {zoom && src && <CdImageZoom images={[{ src, alt: asset.name }]} at={0} onAt={() => {}} onClose={() => setZoom(false)} />}
    </div>
  );
}
