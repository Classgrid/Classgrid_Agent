// A song's name and artists together
import React from 'react';
import { SdHeading } from './SdHeading';
import { SdArtistLine } from './SdArtistLine';

export function SdTrackHeadline({ name, url, artists, album, size = 'lg' }: { name?: string; url?: string; artists?: string; album?: string; size?: 'md' | 'lg' }) {
  return <div className="flex min-w-0 flex-col gap-0.5"><SdHeading size={size} href={url}>{name || 'Unknown song'}</SdHeading><SdArtistLine artists={artists} album={album} /></div>;
}
