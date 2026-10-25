// An album's square cover
import React from 'react';
import { SdArt } from './SdArt';

export function SdAlbumCover({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
  return <SdArt src={src} alt={alt} className={className} />;
}
