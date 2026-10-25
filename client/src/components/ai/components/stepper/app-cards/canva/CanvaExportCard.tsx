// export_design: previews for exported images, a download row for every other file
import React from 'react';
import { Download } from 'lucide-react';
import { AppCard, CardButton, Carousel, Pill, Thumb } from '../shared';
import { CanvaJobFailed } from './CanvaJobFailed';
import { CanvaJobRunning } from './CanvaJobRunning';
import { CanvaImagePreview } from './CanvaImagePreview';
import { CanvaExportFileRow } from './CanvaExportFileRow';
import { canvaFormatLabel } from './CanvaFormatBadge';

// ─── Export result ───
export function CanvaExportCard({ args, data }: { args: any; data: any }) {
  const job = data?.job;
  const format = String(args?.format || 'pdf');
  if (job?.status === 'failed') return <CanvaJobFailed what="Export" job={job} />;
  if (job?.status === 'in_progress') return <CanvaJobRunning icon={Download} text="Export is still running in Canva" sub="Ask again in a moment for the download links." />;
  const urls: string[] = job?.urls || [];
  const isImage = ['png', 'jpg', 'gif'].includes(format);
  const label = canvaFormatLabel(format);
  return (
    <AppCard brand="canva" title={`Exported as ${label}`} right={<Pill tone="purple">{urls.length} file{urls.length === 1 ? '' : 's'}</Pill>}>
      {isImage && urls.length > 0 && (
        urls.length === 1
          ? <CanvaImagePreview src={urls[0]} />
          : <Carousel itemClass="basis-[46%] sm:basis-[31%]">{urls.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1"><Thumb src={u} className="aspect-[4/3] w-full" /><span className="text-[11px] text-slate-500">Page {i + 1}</span></a>)}</Carousel>
      )}
      {!isImage && (
        <div className="flex flex-col gap-1.5">
          {urls.map((u, i) => <CanvaExportFileRow key={u} href={u} name={`${label} file${urls.length > 1 ? ` ${i + 1}` : ''}`} />)}
        </div>
      )}
      {urls.length === 1 && <div className="mt-3"><CardButton brand="canva" primary href={urls[0]} icon={<Download className="h-3.5 w-3.5" />}>Download {label}</CardButton></div>}
    </AppCard>
  );
}
