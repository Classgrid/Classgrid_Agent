// The Spotify logo
import React from 'react';
import { cn } from '@/lib/utils';

export const SPOTIFY_LOGO_URL = 'https://cdn.classgrid.in/classgrid_intgration/spotify.svg';

export function SdBrandMark({ className }: { className?: string }) {
  return <img src={SPOTIFY_LOGO_URL} alt="" loading="lazy" className={cn('h-4 w-4 shrink-0', className)} />;
}
