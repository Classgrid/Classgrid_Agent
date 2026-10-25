// Back / next arrows on the full-screen picture view
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CdLightboxNav({ onPrev, onNext, canPrev, canNext }: { onPrev: () => void; onNext: () => void; canPrev: boolean; canNext: boolean }) {
  const btn = 'absolute top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer disabled:opacity-30';
  return (
    <>
      <button type="button" aria-label="Previous" disabled={!canPrev} onClick={(e) => { e.stopPropagation(); onPrev(); }} className={btn + ' left-4'}><ChevronLeft className="h-5 w-5" /></button>
      <button type="button" aria-label="Next" disabled={!canNext} onClick={(e) => { e.stopPropagation(); onNext(); }} className={btn + ' right-4'}><ChevronRight className="h-5 w-5" /></button>
    </>
  );
}
