// Song list: first 5 rows and "Show N more"; only one player open at a time.
import React, { useState } from 'react';
import { AppCard, Pill, ShortList } from '../shared';
import { SpotifyTrackRow, type SpotifyTrack } from './SpotifyTrackRow';
import { SpotifyEmptyState } from './SpotifyEmptyState';

export function SpotifyTrackList({ title, tracks, total }: { title: React.ReactNode; tracks: SpotifyTrack[]; total?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!tracks.length) return <SpotifyEmptyState text="No songs found" />;
  return (
    <AppCard brand="spotify" title={title} right={<Pill>{total ?? tracks.length} songs</Pill>}>
      <ShortList items={tracks} first={5} render={(t, i) => <SpotifyTrackRow key={`${t.id}-${i}`} t={t} index={i} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />} />
    </AppCard>
  );
}
