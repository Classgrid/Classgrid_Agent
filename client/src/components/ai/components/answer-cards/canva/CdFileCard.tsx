// One downloadable file: type icon, name, type and expiry, download icon
import React from 'react';
import { CdFileGlyph } from './CdFileGlyph';
import { CdFileName, cdFileName } from './CdFileName';
import { CdFileKindTag } from './CdFileKindTag';
import { CdFileExpiry } from './CdFileExpiry';
import { CdFactLine } from './CdFactLine';
import { CdDownloadAction } from './CdDownloadAction';

export function CdFileCard({ url, format, index }: { url: string; format: string; index: number }) {
  const fallback = 'file-' + index + '.' + format;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-[#2a2a2a]">
      <CdFileGlyph kind={format} />
      <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 hover:underline">
        <CdFileName url={url} fallback={fallback} />
        <CdFactLine items={[<CdFileKindTag format={format} />, <CdFileExpiry />]} />
      </a>
      <CdDownloadAction url={url} name={cdFileName(url, fallback)} />
    </div>
  );
}
