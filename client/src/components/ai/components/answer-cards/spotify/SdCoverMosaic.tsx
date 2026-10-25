// Four song covers in a square, for a playlist that has no cover of its own
import React from 'react';
import { cn } from '@/lib/utils';
import { SdArt } from './SdArt';

export function SdCoverMosaic({ images, className }: { images: (string | null | undefined)[]; className?: string }) {
  const four = images.filter(Boolean).slice(0, 4);
  return (
    <div className={cn('grid shrink-0 grid-cols-2 overflow-hidden rounded-lg', className)}>
      {four.map((src, i) => <SdArt key={i} src={src} className="h-full w-full rounded-none" />)}
    </div>
  );
}
