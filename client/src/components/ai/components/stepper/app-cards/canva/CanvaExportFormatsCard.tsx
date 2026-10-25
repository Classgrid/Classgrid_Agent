// get_export_formats: the file types this design can be exported as
import React from 'react';
import { AppCard } from '../shared';
import { CanvaFormatBadge } from './CanvaFormatBadge';

// ─── Export formats ───
export function CanvaExportFormatsCard({ data }: { data: any }) {
  const keys = Object.keys(data?.formats || {});
  return (
    <AppCard brand="canva" title="Can be exported as">
      <div className="flex flex-wrap gap-1.5">{keys.length ? keys.map((k) => <CanvaFormatBadge key={k} format={k} />) : <span className="text-[13px] text-slate-500">No export formats</span>}</div>
    </AppCard>
  );
}
