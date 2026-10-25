// Several finished designs as a gallery: 4 first, up to 8 with "Show more"
import React, { useState } from 'react';
import { CdGrid } from './CdGrid';
import { CdDesignGalleryItem, type CdDesignData } from './CdDesignGalleryItem';
import { CdShowMore } from './CdShowMore';

export function CdDesignGallery({ designs }: { designs: CdDesignData[] }) {
  const [open, setOpen] = useState(false);
  const all = designs.slice(0, 8);
  const shown = open ? all : all.slice(0, 4);
  return (
    <div className="flex flex-col gap-2.5">
      <CdGrid cols={2}>{shown.map((d, i) => <CdDesignGalleryItem key={d.id ?? i} design={d} />)}</CdGrid>
      <CdShowMore hidden={all.length - 4} open={open} onToggle={() => setOpen((o) => !o)} />
    </div>
  );
}
