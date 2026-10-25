// Slides full screen, one at a time (uses the shared full-screen picture view)
import React from 'react';
import { CdImageZoom } from './CdImageZoom';

export function CdSlideFullscreen({ slides, at, onAt, onClose }: { slides: { src?: string }[]; at: number; onAt: (i: number) => void; onClose: () => void }) {
  const images = slides.map((s, i) => ({ src: s.src || '', alt: 'Slide ' + (i + 1) })).filter((s) => s.src);
  if (!images.length) return null;
  return <CdImageZoom images={images} at={Math.min(at, images.length - 1)} onAt={onAt} onClose={onClose} />;
}
