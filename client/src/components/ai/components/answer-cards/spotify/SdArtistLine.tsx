// The artists of a song, softer than the title
import React from 'react';
import { SdSubheading } from './SdSubheading';

export function SdArtistLine({ artists, album }: { artists?: string; album?: string }) {
  return <SdSubheading>{[artists, album].filter(Boolean).join(' · ')}</SdSubheading>;
}
