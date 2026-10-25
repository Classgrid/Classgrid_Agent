// One artist in a grid: round photo, name, music style; a place number for top artists
import React from 'react';
import { SdArtistPortrait } from './SdArtistPortrait';
import { SdArtistRank } from './SdArtistRank';
import { SdCaption } from './SdCaption';
import { type SdArtistData } from './SdDisplay';

export function SdArtistCard({ artist, rank }: { artist: SdArtistData; rank?: number }) {
  const body = (
    <>
      <span className="relative block">
        <SdArtistPortrait src={artist.image} alt={artist.name} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.03]" />
        {rank && <SdArtistRank n={rank} className="absolute -bottom-1 left-1/2 -translate-x-1/2" />}
      </span>
      <span className="mt-2.5 block min-w-0 truncate text-center text-[13px] font-medium text-slate-900 dark:text-white">{artist.name || 'Artist'}</span>
      <SdCaption className="text-center capitalize">{artist.genres?.[0] || 'Artist'}</SdCaption>
    </>
  );
  if (artist.url) return <a href={artist.url} target="_blank" rel="noopener noreferrer" className="group block min-w-0">{body}</a>;
  return <div className="min-w-0">{body}</div>;
}
