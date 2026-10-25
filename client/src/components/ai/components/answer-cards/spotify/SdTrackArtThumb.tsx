// A song's small cover; shows a play / pause sign on hover
import React from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SdArt } from './SdArt';

export function SdTrackArtThumb({ src, alt, open }: { src?: string; alt?: string; open: boolean }) {
  return (
    <span className="relative h-11 w-11 shrink-0">
      <SdArt src={src} alt={alt} className="h-11 w-11 rounded-md" />
      <span className={cn('absolute inset-0 flex items-center justify-center rounded-md bg-black/45 text-white transition-opacity', open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>{open ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}</span>
    </span>
  );
}
