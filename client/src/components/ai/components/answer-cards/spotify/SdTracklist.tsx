// A list of songs: 6 first, then "Show more"; tapping a song opens the player under it
import React, { useState } from 'react';
import { SdTrackItem, type SdTrackData } from './SdTrackItem';
import { SdShowMore } from './SdShowMore';

export function SdTracklist({ tracks, liked }: { tracks: SdTrackData[]; liked?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const shown = all ? tracks : tracks.slice(0, 6);
  return (
    <div className="flex flex-col">
      {shown.map((t, i) => <SdTrackItem key={(t.id || '') + i} track={t} n={i + 1} liked={liked} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />)}
      <div className="mt-1"><SdShowMore hidden={tracks.length - 6} open={all} onToggle={() => setAll((a) => !a)} /></div>
    </div>
  );
}
