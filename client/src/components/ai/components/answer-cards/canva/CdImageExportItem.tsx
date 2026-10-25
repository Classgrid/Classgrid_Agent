// One exported page picture (tap to see it full screen)
import React from 'react';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';
import { CdCaption } from './CdCaption';

export function CdImageExportItem({ src, number, onOpen }: { src: string; number: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex min-w-0 flex-col gap-1 text-left cursor-zoom-in">
      <CdAspect ratio="16/9"><CdImage src={src} alt={'Page ' + number} /></CdAspect>
      <CdCaption>Page {number}</CdCaption>
    </button>
  );
}
