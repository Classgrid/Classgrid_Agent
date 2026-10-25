// Card with a swipe row of tiles (max 8) and the player under it for the tile being played.
import React, { useState } from 'react';
import { AppCard, Carousel, Pill } from '../shared';
import { SpotifyEmbedPlayer } from './SpotifyEmbedPlayer';

export function SpotifyMediaCarousel<T extends { id?: string; uri?: string }>({ title, items, tallPlayer, tile }: {
  title: React.ReactNode;
  items: T[];
  tallPlayer?: boolean;
  tile: (item: T, onPlay?: () => void) => React.ReactNode;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (!items.length) return null;
  return (
    <AppCard brand="spotify" title={title} right={<Pill>{items.length}</Pill>}>
      <Carousel>
        {items.map((x) => {
          const uri = x.uri;
          return <React.Fragment key={x.id ?? uri}>{tile(x, uri ? () => setPlaying(playing === uri ? null : uri) : undefined)}</React.Fragment>;
        })}
      </Carousel>
      {playing && <div className="mt-3"><SpotifyEmbedPlayer uri={playing} tall={tallPlayer} /></div>}
    </AppCard>
  );
}
