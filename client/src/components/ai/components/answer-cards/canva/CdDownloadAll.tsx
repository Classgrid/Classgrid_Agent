// "Download all" opens every file of an export one after another
import React from 'react';
import { Download } from 'lucide-react';
import { CdActionPrimary } from './CdActionPrimary';

export function CdDownloadAll({ urls, label }: { urls: string[]; label: string }) {
  if (!urls.length) return null;
  if (urls.length === 1) return <CdActionPrimary href={urls[0]} download icon={<Download className="h-3.5 w-3.5" />}>{label}</CdActionPrimary>;
  const all = () => urls.forEach((u, i) => setTimeout(() => window.open(u, '_blank', 'noopener'), i * 400));
  return <CdActionPrimary onClick={all} icon={<Download className="h-3.5 w-3.5" />}>{label} ({urls.length})</CdActionPrimary>;
}
