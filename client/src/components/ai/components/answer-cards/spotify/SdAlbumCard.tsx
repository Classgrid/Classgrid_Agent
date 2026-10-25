// One album in a grid: cover, name, artists and year
import React from 'react';
import { SdAlbumCover } from './SdAlbumCover';
import { SdCaption } from './SdCaption';
import { type SdAlbumData } from './SdDisplay';

export function SdAlbumCard({ album }: { album: SdAlbumData }) {
  const body = (
    <>
      <SdAlbumCover src={album.image} alt={album.name} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.02]" />
      <span className="mt-2 block min-w-0 truncate text-[13px] font-medium text-slate-900 dark:text-white">{album.name || 'Album'}</span>
      <SdCaption>{[album.artists, album.release_date?.slice(0, 4)].filter(Boolean).join(' · ')}</SdCaption>
    </>
  );
  if (album.url) return <a href={album.url} target="_blank" rel="noopener noreferrer" className="group block min-w-0">{body}</a>;
  return <div className="min-w-0">{body}</div>;
}
