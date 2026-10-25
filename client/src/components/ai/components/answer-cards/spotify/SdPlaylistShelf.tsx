// Playlists in a grid: 6 first, then "Show more"
import React, { useState } from 'react';
import { SdGrid } from './SdGrid';
import { SdPlaylistCard } from './SdPlaylistCard';
import { SdShowMore } from './SdShowMore';
import { type SdPlaylistData } from './SdDisplay';

export function SdPlaylistShelf({ playlists }: { playlists: SdPlaylistData[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? playlists : playlists.slice(0, 6);
  return (
    <div className="flex flex-col gap-2">
      <SdGrid cols={3}>{shown.map((p, i) => <SdPlaylistCard key={(p.id || '') + i} playlist={p} />)}</SdGrid>
      <SdShowMore hidden={playlists.length - 6} open={all} onToggle={() => setAll((a) => !a)} />
    </div>
  );
}
