// A small green heart on liked songs
import React from 'react';
import { Heart } from 'lucide-react';

export function SdTrackHeart({ on }: { on?: boolean }) {
  if (!on) return null;
  return <Heart className="h-3.5 w-3.5 shrink-0 fill-[#1DB954] text-[#1DB954]" aria-label="Liked" />;
}
