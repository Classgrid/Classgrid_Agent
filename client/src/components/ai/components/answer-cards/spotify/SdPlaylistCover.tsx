// A playlist's cover; without one, four of its song covers; without those, a music note
import React from 'react';
import { SdArt } from './SdArt';
import { SdCoverMosaic } from './SdCoverMosaic';

export function SdPlaylistCover({ src, mosaic, alt, className }: { src?: string | null; mosaic?: (string | null | undefined)[]; alt?: string; className?: string }) {
  if (!src && (mosaic || []).filter(Boolean).length >= 4) return <SdCoverMosaic images={mosaic || []} className={className} />;
  return <SdArt src={src} alt={alt} className={className} />;
}
