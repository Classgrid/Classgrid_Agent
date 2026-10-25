// Export format names (pdf → PDF, pptx → PowerPoint…) and the small badge that shows one
import React from 'react';
import { Pill } from '../shared';

const FORMAT_LABEL: Record<string, string> = { pdf: 'PDF', jpg: 'JPG', png: 'PNG', gif: 'GIF', pptx: 'PowerPoint', mp4: 'MP4 video', csv: 'CSV', html_bundle: 'HTML bundle', html_standalone: 'HTML' };
export const canvaFormatLabel = (format: string) => FORMAT_LABEL[format] ?? format.toUpperCase();

// ─── Format badge ───
export function CanvaFormatBadge({ format }: { format: string }) {
  return <Pill tone="purple">{canvaFormatLabel(format)}</Pill>;
}
