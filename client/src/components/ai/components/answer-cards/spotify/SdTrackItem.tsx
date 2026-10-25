// One song row: number, cover, name, artists, album, liked, length or when; tap to listen
import React from 'react';
import { SdTrackIndex } from './SdTrackIndex';
import { SdTrackArtThumb } from './SdTrackArtThumb';
import { SdTrackTitle } from './SdTrackTitle';
import { SdTrackArtists } from './SdTrackArtists';
import { SdTrackAlbum } from './SdTrackAlbum';
import { SdTrackLength } from './SdTrackLength';
import { SdTrackWhen } from './SdTrackWhen';
import { SdTrackHeart } from './SdTrackHeart';
import { SdTrackPlayInline } from './SdTrackPlayInline';

export type SdTrackData = { id?: string; name?: string; uri?: string; artists?: string; album?: string; image?: string; duration_ms?: number; url?: string; played_at?: string; added_at?: string };

export function SdTrackItem({ track, n, open, onToggle, liked }: { track: SdTrackData; n: number; open: boolean; onToggle: () => void; liked?: boolean }) {
  return (
    <div className="flex flex-col">
      <button type="button" onClick={onToggle} className="group flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#1f1f1f] cursor-pointer">
        <SdTrackIndex n={n} />
        <SdTrackArtThumb src={track.image} alt={track.album} open={open} />
        <span className="flex min-w-0 flex-1 flex-col">
          <SdTrackTitle name={track.name} />
          <span className="flex min-w-0 gap-1.5 text-[12px] text-slate-500 dark:text-[#9a9a9a]"><SdTrackArtists artists={track.artists} /><SdTrackAlbum album={track.album} /></span>
        </span>
        <SdTrackHeart on={liked} />
        {track.played_at || track.added_at ? <SdTrackWhen value={track.played_at || track.added_at} /> : <SdTrackLength ms={track.duration_ms} />}
      </button>
      {open && <SdTrackPlayInline uri={track.uri} />}
    </div>
  );
}
