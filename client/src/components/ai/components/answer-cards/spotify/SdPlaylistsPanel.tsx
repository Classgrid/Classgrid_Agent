// Playlists: the one opened or just made, shown big, and the list of playlists
import React from 'react';
import { SdPlaylistShowcase } from './SdPlaylistShowcase';
import { SdPlaylistShelf } from './SdPlaylistShelf';
import { SdSection } from './SdSection';
import { SdCount } from './SdCount';
import { type SpotifyDisplayData } from './SdDisplay';

export function SdPlaylistsPanel({ data }: { data: SpotifyDisplayData }) {
  const open = data.playlist;
  const others = data.playlists.filter((p) => p.id !== open?.playlist?.id);
  return (
    <div className="flex flex-col gap-3.5">
      {open && <SdPlaylistShowcase playlist={open.playlist} items={open.items} total={open.total} />}
      {others.length > 0 && (
        <SdSection title={open ? 'More playlists' : 'Playlists'} right={typeof data.playlistsTotal === 'number' ? <span className="text-[11.5px] text-slate-400 dark:text-[#7d7d7d]"><SdCount n={data.playlistsTotal} one="playlist" /></span> : undefined}>
          <SdPlaylistShelf playlists={others} />
        </SdSection>
      )}
    </div>
  );
}
