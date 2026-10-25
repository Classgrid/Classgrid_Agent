// The big slide on screen (tap to see it full screen)
import React from 'react';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';

export function CdSlideStage({ src, number, onZoom }: { src?: string; number: number; onZoom?: () => void }) {
  return (
    <button type="button" onClick={onZoom} disabled={!src} aria-label={'See slide ' + number + ' full screen'} className="block w-full cursor-zoom-in disabled:cursor-default">
      <CdAspect ratio="16/9" className="bg-slate-50 dark:bg-[#1c1c1c]"><CdImage src={src} alt={'Slide ' + number} fit="contain" /></CdAspect>
    </button>
  );
}
