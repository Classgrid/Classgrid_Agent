// A playlist's name, big, linking to Spotify
import React from 'react';
import { SdHeading } from './SdHeading';

export function SdPlaylistTitle({ name, url }: { name?: string; url?: string }) {
  return <SdHeading href={url} size="lg">{name || 'Playlist'}</SdHeading>;
}
