// One album shown big: cover, name, artists, year, songs and a player to listen here
import React, { useState } from 'react';
import { SdPlayerShell } from './SdPlayerShell';
import { SdAlbumCover } from './SdAlbumCover';
import { SdTrackHeadline } from './SdTrackHeadline';
import { SdFactLine } from './SdFactLine';
import { SdCount } from './SdCount';
import { SdCopyLink } from './SdCopyLink';
import { SdPlaylistPlayer } from './SdPlaylistPlayer';
import { SdPlaylistActions } from './SdPlaylistActions';
import { type SdAlbumData } from './SdDisplay';

export function SdAlbumSpotlight({ album }: { album: SdAlbumData }) {
  const [listening, setListening] = useState(false);
  return (
    <SdPlayerShell art={album.image}>
      <div className="flex items-start gap-3.5">
        <SdAlbumCover src={album.image} alt={album.name} className="h-24 w-24 shadow-lg sm:h-28 sm:w-28" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <SdTrackHeadline name={album.name} url={album.url} artists={album.artists} />
          <SdFactLine items={[album.release_date?.slice(0, 4), typeof album.total_tracks === 'number' ? <SdCount n={album.total_tracks} one="song" /> : null]} />
        </div>
        <SdCopyLink url={album.url} />
      </div>
      {listening && <div className="mt-3"><SdPlaylistPlayer uri={album.uri} /></div>}
      <div className="mt-3"><SdPlaylistActions url={album.url} canListen={!!album.uri} listening={listening} onToggle={() => setListening((l) => !l)} /></div>
    </SdPlayerShell>
  );
}
