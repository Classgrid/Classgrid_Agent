// One design on its own card: big preview, title, last edit, and Edit / View buttons
import React from 'react';
import { PenLine, Eye, Layers } from 'lucide-react';
import { AppCard, CardButton, Pill, fmtWhen } from '../shared';
import { CanvaImagePreview } from './CanvaImagePreview';
import { type CanvaDesign, canvaEditUrl, canvaViewUrl } from './CanvaDesignTile';

// ─── One design ───
export function CanvaDesignCard({ design, label }: { design: CanvaDesign; label: string }) {
  const edit = canvaEditUrl(design);
  const view = canvaViewUrl(design);
  return (
    <AppCard brand="canva" title={label} right={design.page_count ? <Pill tone="purple"><Layers className="h-3 w-3" />{design.page_count} page{design.page_count === 1 ? '' : 's'}</Pill> : undefined}>
      <CanvaImagePreview src={design.thumbnail?.url} alt={design.title} center />
      <div className="mt-2.5 min-w-0">
        <div className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{design.title || 'Untitled design'}</div>
        {(design.updated_at || design.created_at) && <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">Edited {fmtWhen(design.updated_at || design.created_at)}</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {edit && <CardButton brand="canva" primary href={edit} icon={<PenLine className="h-3.5 w-3.5" />}>Edit in Canva</CardButton>}
        {view && <CardButton brand="canva" href={view} icon={<Eye className="h-3.5 w-3.5" />}>View</CardButton>}
      </div>
    </AppCard>
  );
}
