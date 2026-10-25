// The Spotify display under the AI's answer: what was just done, the account, and the finished results in tabs
import React, { useState } from 'react';
import { SdBoundary } from './SdBoundary';
import { SdSurface } from './SdSurface';
import { SdResultHeader } from './SdResultHeader';
import { SdStack } from './SdStack';
import { SdHighlight } from './SdHighlight';
import { SdPremiumNotice } from './SdPremiumNotice';
import { SdErrorBox } from './SdErrorBox';
import { SdProfileCard } from './SdProfileCard';
import { SdTabs, type SdTabItem } from './SdTabs';
import { SdMusicPanel } from './SdMusicPanel';
import { SdPlaylistsPanel } from './SdPlaylistsPanel';
import { SdArtistsPanel } from './SdArtistsPanel';
import { SdAlbumsPanel } from './SdAlbumsPanel';
import { type SdTrackData } from './SdTrackItem';

export type SdArtistData = { id?: string; name?: string; uri?: string; genres?: string[]; image?: string | null; url?: string };
export type SdAlbumData = { id?: string; name?: string; uri?: string; artists?: string; release_date?: string; total_tracks?: number; image?: string | null; url?: string };
export type SdPlaylistData = { id?: string; name?: string; uri?: string; owner?: string; public?: boolean; total?: number; description?: string; image?: string | null; url?: string };
export type SpotifyDisplayData = {
  profile?: any;
  playback?: any;
  devices?: any[];
  tracks: SdTrackData[];
  tracksTotal?: number;
  tracksAsked?: boolean;
  trackTitle: string;
  liked?: boolean;
  artists: SdArtistData[];
  topArtists?: boolean;
  albums: SdAlbumData[];
  playlists: SdPlaylistData[];
  playlistsTotal?: number;
  playlist?: { playlist?: SdPlaylistData; items?: SdTrackData[]; total?: number };
  timeRange?: string;
  highlight?: string;
  premium?: 'owner' | 'player';
  errors: string[];
};

export function SdDisplay({ data }: { data: SpotifyDisplayData }) {
  const tabs: SdTabItem[] = [];
  if (data.playback || data.devices || data.tracks.length || data.tracksAsked) tabs.push({ id: 'music', label: 'Music', count: data.tracks.length });
  if (data.playlist || data.playlists.length) tabs.push({ id: 'playlists', label: 'Playlists', count: data.playlists.length });
  if (data.artists.length) tabs.push({ id: 'artists', label: 'Artists', count: data.artists.length });
  if (data.albums.length) tabs.push({ id: 'albums', label: 'Albums', count: data.albums.length });
  const [picked, setPicked] = useState<string | null>(null);
  const active = tabs.some((t) => t.id === picked) ? picked! : tabs[0]?.id;
  return (
    <SdBoundary>
      <SdSurface>
        <SdResultHeader timeRange={data.timeRange} />
        <SdStack>
          <SdHighlight text={data.highlight} />
          {data.premium && <SdPremiumNotice owner={data.premium === 'owner'} />}
          {data.errors.map((e, i) => <SdErrorBox key={i} text={e} />)}
          {data.profile && <SdProfileCard profile={data.profile} />}
          <SdTabs tabs={tabs} active={active || ''} onChange={setPicked} />
          {active === 'music' && <SdBoundary><SdMusicPanel data={data} /></SdBoundary>}
          {active === 'playlists' && <SdBoundary><SdPlaylistsPanel data={data} /></SdBoundary>}
          {active === 'artists' && <SdBoundary><SdArtistsPanel data={data} /></SdBoundary>}
          {active === 'albums' && <SdBoundary><SdAlbumsPanel data={data} /></SdBoundary>}
        </SdStack>
      </SdSurface>
    </SdBoundary>
  );
}
