// One music style ("indie pop")
import React from 'react';
import { SdBadge } from './SdBadge';

export function SdGenreTag({ genre }: { genre: string }) {
  return <SdBadge><span className="capitalize">{genre}</span></SdBadge>;
}
