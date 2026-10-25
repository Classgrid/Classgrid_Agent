// An artist's round photo
import React from 'react';
import { SdArt } from './SdArt';

export function SdArtistPortrait({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
  return <SdArt src={src} alt={alt} round className={className} />;
}
