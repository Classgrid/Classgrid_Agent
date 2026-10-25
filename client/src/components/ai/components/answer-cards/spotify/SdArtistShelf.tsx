// Artists in a grid: 6 first, then "Show more"; numbered when they are top artists
import React, { useState } from 'react';
import { SdGrid } from './SdGrid';
import { SdArtistCard } from './SdArtistCard';
import { SdShowMore } from './SdShowMore';
import { type SdArtistData } from './SdDisplay';

export function SdArtistShelf({ artists, firstRank }: { artists: SdArtistData[]; firstRank?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? artists : artists.slice(0, 6);
  return (
    <div className="flex flex-col gap-2">
      <SdGrid cols={3}>{shown.map((a, i) => <SdArtistCard key={(a.id || '') + i} artist={a} rank={firstRank ? firstRank + i : undefined} />)}</SdGrid>
      <SdShowMore hidden={artists.length - 6} open={all} onToggle={() => setAll((x) => !x)} />
    </div>
  );
}
