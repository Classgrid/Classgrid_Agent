// get_design_pages: a strip of page thumbnails; tap one to see it big above the strip
import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { AppCard, Carousel, Pill } from '../shared';
import { CanvaEmptyState } from './CanvaEmptyState';
import { CanvaImagePreview } from './CanvaImagePreview';
import { CanvaPageThumb } from './CanvaPageThumb';

// ─── Design pages ───
export function CanvaDesignPagesCard({ data }: { data: any }) {
  const pages: any[] = data?.items || [];
  const [big, setBig] = useState<number | null>(null);
  if (!pages.length) return <CanvaEmptyState icon={Layers} text="No pages found" />;
  const sel = big !== null ? pages[big] : null;
  return (
    <AppCard brand="canva" title="Design pages" right={<Pill tone="purple">{pages.length} pages</Pill>}>
      {sel && <CanvaImagePreview src={sel.thumbnail?.url} alt={`Page ${sel.index}`} short className="mb-2.5" />}
      <Carousel itemClass="basis-[30%] sm:basis-[22%]">
        {pages.map((p, i) => <CanvaPageThumb key={p.index ?? i} page={p} number={i + 1} active={big === i} onClick={() => setBig(big === i ? null : i)} />)}
      </Carousel>
    </AppCard>
  );
}
