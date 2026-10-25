// Albums in a grid: 6 first, then "Show more"
import React, { useState } from 'react';
import { SdGrid } from './SdGrid';
import { SdAlbumCard } from './SdAlbumCard';
import { SdShowMore } from './SdShowMore';
import { type SdAlbumData } from './SdDisplay';

export function SdAlbumShelf({ albums }: { albums: SdAlbumData[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? albums : albums.slice(0, 6);
  return (
    <div className="flex flex-col gap-2">
      <SdGrid cols={3}>{shown.map((a, i) => <SdAlbumCard key={(a.id || '') + i} album={a} />)}</SdGrid>
      <SdShowMore hidden={albums.length - 6} open={all} onToggle={() => setAll((x) => !x)} />
    </div>
  );
}
