// The file type in plain words (pptx -> PowerPoint)
import React from 'react';

const NAMES: Record<string, string> = { pdf: 'PDF document', pptx: 'PowerPoint', png: 'PNG image', jpg: 'JPG image', gif: 'GIF', mp4: 'MP4 video', csv: 'CSV table', html_bundle: 'Web page (ZIP)', html_standalone: 'Web page' };
export const cdKindName = (format?: string) => NAMES[String(format || '').toLowerCase()] ?? String(format || 'File').toUpperCase();

export function CdFileKindTag({ format }: { format?: string }) {
  return <span>{cdKindName(format)}</span>;
}
