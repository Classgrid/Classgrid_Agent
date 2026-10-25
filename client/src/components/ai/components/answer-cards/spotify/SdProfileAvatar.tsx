// The Spotify account's photo, or its first letter
import React from 'react';
import { SdArt } from './SdArt';

export function SdProfileAvatar({ src, name }: { src?: string | null; name?: string }) {
  if (src) return <SdArt src={src} alt={name} round className="h-14 w-14" />;
  return <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1DB954] text-[20px] font-bold text-black">{(name || '?').charAt(0).toUpperCase()}</div>;
}
