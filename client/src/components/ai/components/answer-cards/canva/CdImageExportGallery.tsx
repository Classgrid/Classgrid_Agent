// Exported page pictures (PNG / JPG): one big, or a grid that opens full screen
import React, { useState } from 'react';
import { CdGrid } from './CdGrid';
import { CdImageExportItem } from './CdImageExportItem';
import { CdImageZoom } from './CdImageZoom';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';

export function CdImageExportGallery({ urls }: { urls: string[] }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const images = urls.map((src, i) => ({ src, alt: 'Page ' + (i + 1) }));
  return (
    <>
      {urls.length === 1
        ? <button type="button" onClick={() => setZoom(0)} className="block w-full cursor-zoom-in"><CdAspect ratio="16/9" className="bg-slate-50 dark:bg-[#1c1c1c]"><CdImage src={urls[0]} alt="Exported image" fit="contain" /></CdAspect></button>
        : <CdGrid cols={3}>{urls.map((u, i) => <CdImageExportItem key={u} src={u} number={i + 1} onOpen={() => setZoom(i)} />)}</CdGrid>}
      {zoom !== null && <CdImageZoom images={images} at={zoom} onAt={setZoom} onClose={() => setZoom(null)} />}
    </>
  );
}
