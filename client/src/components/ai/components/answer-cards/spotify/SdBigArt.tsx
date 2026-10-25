// A large square cover for the now playing view
import React from 'react';
import { SdArt } from './SdArt';

export function SdBigArt({ src, alt }: { src?: string | null; alt?: string }) {
  return <SdArt src={src} alt={alt} className="h-24 w-24 shadow-lg sm:h-28 sm:w-28" />;
}
