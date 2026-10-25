// An exported PowerPoint as a small file row: name, open in a new tab, download
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { CdFileGlyph } from './CdFileGlyph';
import { CdFileName } from './CdFileName';
import { CdActionIcon } from './CdActionIcon';
import { CdDownloadAction } from './CdDownloadAction';

export function CdPptxPreview({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-[#2a2a2a]">
      <CdFileGlyph kind="pptx" size="sm" />
      <div className="min-w-0 flex-1"><CdFileName url={url} fallback="design.pptx" /></div>
      <CdActionIcon label="Open in new tab" href={url}><ExternalLink className="h-4 w-4" /></CdActionIcon>
      <CdDownloadAction url={url} name="PowerPoint" />
    </div>
  );
}
