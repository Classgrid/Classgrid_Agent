// One playlist in a grid: cover, name, song count and owner
import React from 'react';
import { SdPlaylistCover } from './SdPlaylistCover';
import { SdCaption } from './SdCaption';
import { type SdPlaylistData } from './SdDisplay';

export function SdPlaylistCard({ playlist }: { playlist: SdPlaylistData }) {
  const count = typeof playlist.total === 'number' ? playlist.total + (playlist.total === 1 ? ' song' : ' songs') : '';
  const body = (
    <>
      <SdPlaylistCover src={playlist.image} alt={playlist.name} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.02]" />
      <span className="mt-2 block min-w-0 truncate text-[13px] font-medium text-slate-900 dark:text-white">{playlist.name || 'Playlist'}</span>
      <SdCaption>{[count, playlist.owner].filter(Boolean).join(' · ')}</SdCaption>
    </>
  );
  if (playlist.url) return <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="group block min-w-0">{body}</a>;
  return <div className="min-w-0">{body}</div>;
}
