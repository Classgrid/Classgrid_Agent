// An image as a small square tile with its name (for the image carousel inside a folder)
import React from 'react';
import { Thumb } from '../shared';

// ─── Image tile ───
export function CanvaImageTile({ image }: { image: any }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <Thumb src={image?.thumbnail?.url} alt={image?.name} className="aspect-square w-full" />
      <span className="text-[11px] text-slate-500 dark:text-[#9a9a9a] truncate">{image?.name}</span>
    </div>
  );
}
