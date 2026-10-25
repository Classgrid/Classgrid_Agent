// The exported files: each shown the best way for its type, then a list to download
import React from 'react';
import { CdSection } from './CdSection';
import { CdPdfReader } from './CdPdfReader';
import { CdImageExportGallery } from './CdImageExportGallery';
import { CdVideoPlayer } from './CdVideoPlayer';
import { CdGifView } from './CdGifView';
import { CdPptxPreview } from './CdPptxPreview';
import { CdHtmlPreview } from './CdHtmlPreview';
import { CdCsvNote } from './CdCsvNote';
import { CdFileCard } from './CdFileCard';
import { CdDownloadAll } from './CdDownloadAll';
import { cdKindName } from './CdFileKindTag';

function Viewer({ format, urls }: { format: string; urls: string[] }) {
  const first = urls[0];
  if (!first) return null;
  if (format === 'pdf') return <CdPdfReader url={first} />;
  if (format === 'png' || format === 'jpg') return <CdImageExportGallery urls={urls} />;
  if (format === 'mp4') return <CdVideoPlayer url={first} />;
  if (format === 'gif') return <CdGifView url={first} />;
  if (format === 'pptx') return <CdPptxPreview url={first} />;
  if (format === 'html_standalone') return <CdHtmlPreview url={first} />;
  if (format === 'csv') return <CdCsvNote />;
  return null;
}

export function CdFilesPanel({ exports }: { exports: { format: string; urls: string[] }[] }) {
  return (
    <div className="flex flex-col gap-4">
      {exports.map((e, i) => (
        <CdSection key={i} title={cdKindName(e.format)} right={<CdDownloadAll urls={e.urls} label="Download" />}>
          <Viewer format={e.format} urls={e.urls} />
          {e.urls.length > 1 && <div className="flex flex-col gap-1.5">{e.urls.map((u, j) => <CdFileCard key={u} url={u} format={e.format} index={j + 1} />)}</div>}
          {e.urls.length === 1 && e.urls[0] && <CdFileCard url={e.urls[0]} format={e.format} index={1} />}
        </CdSection>
      ))}
    </div>
  );
}
