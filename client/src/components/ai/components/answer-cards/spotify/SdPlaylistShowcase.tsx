// One playlist shown big: cover, name, owner, description, facts, a player to listen here, and its songs
import React, { useState } from 'react';
import { ListMusic } from 'lucide-react';
import { SdPlayerShell } from './SdPlayerShell';
import { SdPlaylistCover } from './SdPlaylistCover';
import { SdPlaylistTitle } from './SdPlaylistTitle';
import { SdPlaylistOwner } from './SdPlaylistOwner';
import { SdPlaylistDescription } from './SdPlaylistDescription';
import { SdPlaylistFacts } from './SdPlaylistFacts';
import { SdPlaylistActions } from './SdPlaylistActions';
import { SdPlaylistPlayer } from './SdPlaylistPlayer';
import { SdCopyLink } from './SdCopyLink';
import { SdTracklist } from './SdTracklist';
import { SdEmpty } from './SdEmpty';
import { type SdTrackData } from './SdTrackItem';
import { type SdPlaylistData } from './SdDisplay';

export function SdPlaylistShowcase({ playlist, items, total }: { playlist?: SdPlaylistData; items?: SdTrackData[]; total?: number }) {
  const [listening, setListening] = useState(false);
  const p = playlist || {};
  const songs = items || [];
  return (
    <div className="flex flex-col gap-3">
      <SdPlayerShell art={p.image}>
        <div className="flex items-start gap-3.5">
          <SdPlaylistCover src={p.image} mosaic={songs.map((t) => t.image)} alt={p.name} className="h-24 w-24 shadow-lg sm:h-28 sm:w-28" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <SdPlaylistTitle name={p.name} url={p.url} />
            <SdPlaylistOwner owner={p.owner} />
            <SdPlaylistDescription text={p.description} />
            <SdPlaylistFacts total={total ?? p.total} tracks={songs} isPublic={p.public} />
          </div>
          <SdCopyLink url={p.url} />
        </div>
        {listening && <div className="mt-3"><SdPlaylistPlayer uri={p.uri} /></div>}
        <div className="mt-3"><SdPlaylistActions url={p.url} canListen={!!p.uri} listening={listening} onToggle={() => setListening((l) => !l)} /></div>
      </SdPlayerShell>
      {songs.length > 0 ? <SdTracklist tracks={songs} /> : items && <SdEmpty icon={ListMusic} text="No songs in this playlist yet" />}
    </div>
  );
}
