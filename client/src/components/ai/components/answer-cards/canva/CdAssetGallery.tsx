// Uploaded images: one shown big, several as a square grid that opens full screen
import React, { useState } from 'react';
import { CdGrid } from './CdGrid';
import { CdAssetTile, type CdAssetData } from './CdAssetTile';
import { CdAssetSpotlight } from './CdAssetSpotlight';
import { CdImageZoom } from './CdImageZoom';

export function CdAssetGallery({ assets }: { assets: CdAssetData[] }) {
  const [zoom, setZoom] = useState<number | null>(null);
  if (assets.length === 1 && assets[0]) return <CdAssetSpotlight asset={assets[0]} />;
  const images = assets.map((a) => ({ src: a.thumbnail?.url || '', alt: a.name })).filter((x) => x.src);
  return (
    <>
      <CdGrid cols={4}>{assets.slice(0, 12).map((a, i) => <CdAssetTile key={a.id ?? i} asset={a} onOpen={() => setZoom(i)} />)}</CdGrid>
      {zoom !== null && images.length > 0 && <CdImageZoom images={images} at={Math.min(zoom, images.length - 1)} onAt={setZoom} onClose={() => setZoom(null)} />}
    </>
  );
}
