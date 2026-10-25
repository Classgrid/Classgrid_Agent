// A soft blurred copy of the cover behind a big player, for a little color
import React from 'react';

export function SdArtGlow({ src }: { src?: string | null }) {
  if (!src) return null;
  return <img src={src} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.18] blur-3xl dark:opacity-25" />;
}
