// Artists: one artist big, your top artists on a podium, or found artists in a grid
import React from 'react';
import { SdArtistSpotlight } from './SdArtistSpotlight';
import { SdTopArtistsPodium } from './SdTopArtistsPodium';
import { SdArtistShelf } from './SdArtistShelf';
import { type SpotifyDisplayData } from './SdDisplay';

export function SdArtistsPanel({ data }: { data: SpotifyDisplayData }) {
  const list = data.artists;
  if (list.length === 1 && list[0]) return <SdArtistSpotlight artist={list[0]} />;
  if (data.topArtists) return <SdTopArtistsPodium artists={list} />;
  return <SdArtistShelf artists={list} />;
}
