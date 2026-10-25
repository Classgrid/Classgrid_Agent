// import_design_from_url: the file imported into Canva as a design
import React from 'react';
import { Sparkles } from 'lucide-react';
import { CanvaJobFailed } from './CanvaJobFailed';
import { CanvaJobRunning } from './CanvaJobRunning';
import { CanvaDesignsCarousel } from './CanvaDesignsCarousel';
import type { CanvaDesign } from './CanvaDesignTile';

const LABEL = 'Imported into Canva';

// ─── Import result ───
export function CanvaImportCard({ data }: { data: any }) {
  const job = data?.job;
  if (job?.status === 'failed') return <CanvaJobFailed what={LABEL} job={job} />;
  if (job?.status === 'in_progress') return <CanvaJobRunning icon={Sparkles} text={`${LABEL} is still running in Canva`} sub="Ask again in a moment." />;
  const designs: CanvaDesign[] = job?.result?.designs || (job?.result?.design ? [job.result.design] : []);
  return <CanvaDesignsCarousel designs={designs} title={LABEL} />;
}
