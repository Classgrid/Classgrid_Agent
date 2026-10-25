// Back, the slide number, next
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CdActionIcon } from './CdActionIcon';
import { CdSlideCounter } from './CdSlideCounter';

export function CdSlideControls({ at, total, onPrev, onNext, right }: { at: number; total: number; onPrev: () => void; onNext: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <CdActionIcon label="Previous slide" disabled={at <= 1} onClick={onPrev}><ChevronLeft className="h-4 w-4" /></CdActionIcon>
      <CdSlideCounter at={at} total={total} />
      <CdActionIcon label="Next slide" disabled={at >= total} onClick={onNext}><ChevronRight className="h-4 w-4" /></CdActionIcon>
      {right && <div className="ml-auto flex items-center gap-1">{right}</div>}
    </div>
  );
}
