// The design's size like "1920 × 1080" (from the cover picture's shape)
import React from 'react';
import { Maximize2 } from 'lucide-react';

export function CdDesignSizeTag({ width, height }: { width?: number; height?: number }) {
  if (!width || !height) return null;
  const ratio = width / height;
  const shape = Math.abs(ratio - 16 / 9) < 0.05 ? 'Widescreen' : Math.abs(ratio - 1) < 0.05 ? 'Square' : ratio < 1 ? 'Portrait' : 'Landscape';
  return <span className="inline-flex items-center gap-1"><Maximize2 className="h-3 w-3" />{shape}</span>;
}
