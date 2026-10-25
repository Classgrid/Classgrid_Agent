// The bar above a PDF: its name, open in a new tab, download
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { CdFileGlyph } from './CdFileGlyph';
import { CdFileName } from './CdFileName';
import { CdActionIcon } from './CdActionIcon';
import { CdDownloadAction } from './CdDownloadAction';

export function CdPdfToolbar({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <CdFileGlyph kind="pdf" size="sm" />
      <div className="min-w-0 flex-1"><CdFileName url={url} fallback="design.pdf" /></div>
      <CdActionIcon label="Open in new tab" href={url}><ExternalLink className="h-4 w-4" /></CdActionIcon>
      <CdDownloadAction url={url} name="PDF" />
    </div>
  );
}
