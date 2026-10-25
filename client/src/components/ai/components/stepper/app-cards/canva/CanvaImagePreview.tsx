// A big picture inside a soft grey box (design preview, chosen page, exported image)
import React from 'react';
import { cn } from '@/lib/utils';
import { Thumb } from '../shared';

// ─── Big picture: "center" keeps a design preview centred, "short" is the slightly lower page preview ───
export function CanvaImagePreview({ src, alt, center, short, className }: { src?: string | null; alt?: string; center?: boolean; short?: boolean; className?: string }) {
  return (
    <div className={cn('rounded-xl bg-slate-100 dark:bg-[#222] overflow-hidden', center && 'flex items-center justify-center', className)} style={center ? { maxHeight: 340 } : undefined}>
      {/* min height: with no picture yet (Canva makes it a little after an import) the box keeps its shape instead of a thin bar */}
      <Thumb src={src} alt={alt} className={cn('w-full min-h-[160px] object-contain', short ? 'max-h-[320px]' : 'max-h-[340px]')} rounded="rounded-none" />
    </div>
  );
}
