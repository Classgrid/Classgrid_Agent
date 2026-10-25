// One artist shown big: photo, name, music styles and Spotify's player with their top songs
import React from 'react';
import { SdPlayerShell } from './SdPlayerShell';
import { SdArtistPortrait } from './SdArtistPortrait';
import { SdHeading } from './SdHeading';
import { SdGenreTags } from './SdGenreTags';
import { SdCopyLink } from './SdCopyLink';
import { SdEmbed } from './SdEmbed';
import { SdActionBar } from './SdActionBar';
import { SdOpenSpotify } from './SdOpenSpotify';
import { type SdArtistData } from './SdDisplay';

export function SdArtistSpotlight({ artist }: { artist: SdArtistData }) {
  return (
    <SdPlayerShell art={artist.image}>
      <div className="flex items-center gap-3.5">
        <SdArtistPortrait src={artist.image} alt={artist.name} className="h-20 w-20 shadow-lg sm:h-24 sm:w-24" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <SdHeading href={artist.url} size="lg">{artist.name || 'Artist'}</SdHeading>
          <SdGenreTags genres={artist.genres} />
        </div>
        <SdCopyLink url={artist.url} />
      </div>
      <div className="mt-3"><SdEmbed uri={artist.uri} /></div>
      <div className="mt-3"><SdActionBar><SdOpenSpotify href={artist.url} /></SdActionBar></div>
    </SdPlayerShell>
  );
}
