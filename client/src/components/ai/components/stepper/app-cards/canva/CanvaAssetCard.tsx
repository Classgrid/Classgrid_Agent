// One image (asset) in Canva: thumbnail, name, type and date, and its tags
import React from 'react';
import { Tag } from 'lucide-react';
import { AppCard, Pill, Thumb, fmtWhen } from '../shared';

// ─── Image (asset) ───
export function CanvaAssetCard({ asset, label }: { asset: any; label: string }) {
  return (
    <AppCard brand="canva" title={label}>
      <div className="flex gap-3">
        <Thumb src={asset?.thumbnail?.url} alt={asset?.name} className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-slate-900 dark:text-white truncate">{asset?.name || 'Image'}</div>
          <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">{[asset?.type, fmtWhen(asset?.updated_at || asset?.created_at)].filter(Boolean).join(' · ')}</div>
          {asset?.tags?.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{asset.tags.slice(0, 6).map((t: string) => <Pill key={t}><Tag className="h-3 w-3" />{t}</Pill>)}</div>}
        </div>
      </div>
    </AppCard>
  );
}
