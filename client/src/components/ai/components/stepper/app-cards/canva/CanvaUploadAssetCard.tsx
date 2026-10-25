// upload_asset_from_url: the image now in Canva (or that the upload is still running / failed)
import React from 'react';
import { Upload } from 'lucide-react';
import { CanvaAssetCard } from './CanvaAssetCard';
import { CanvaJobFailed } from './CanvaJobFailed';
import { CanvaJobRunning } from './CanvaJobRunning';

// ─── Upload image ───
export function CanvaUploadAssetCard({ data }: { data: any }) {
  const job = data?.job;
  if (job?.status === 'failed') return <CanvaJobFailed what="Upload" job={job} />;
  return job?.asset ? <CanvaAssetCard asset={job.asset} label="Uploaded to Canva" /> : <CanvaJobRunning icon={Upload} text="Upload is still running in Canva" />;
}
