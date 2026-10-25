// Albums: one album big, or found albums in a grid
import React from 'react';
import { SdAlbumSpotlight } from './SdAlbumSpotlight';
import { SdAlbumShelf } from './SdAlbumShelf';
import { type SpotifyDisplayData } from './SdDisplay';

export function SdAlbumsPanel({ data }: { data: SpotifyDisplayData }) {
  if (data.albums.length === 1 && data.albums[0]) return <SdAlbumSpotlight album={data.albums[0]} />;
  return <SdAlbumShelf albums={data.albums} />;
}
