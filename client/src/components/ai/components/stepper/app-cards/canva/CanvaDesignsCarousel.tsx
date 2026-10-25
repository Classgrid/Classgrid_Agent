// Several designs as a swipe carousel (one design gets the big card, none gets an empty line)
import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { AppCard, Carousel, Pill } from '../shared';
import { CanvaDesignCard } from './CanvaDesignCard';
import { CanvaEmptyState } from './CanvaEmptyState';
import { type CanvaDesign, CanvaDesignTile } from './CanvaDesignTile';

// ─── Designs carousel ───
export function CanvaDesignsCarousel({ designs, title, more }: { designs: CanvaDesign[]; title: string; more?: boolean }) {
  if (!designs.length) return <CanvaEmptyState icon={LayoutTemplate} text="No designs found" />;
  if (designs.length === 1) return <CanvaDesignCard design={designs[0]!} label={title} />;
  return (
    <AppCard brand="canva" title={title} right={<Pill tone="purple">{designs.length}{more ? '+' : ''} designs</Pill>}>
      <Carousel>{designs.map((d) => <CanvaDesignTile key={d.id} design={d} />)}</Carousel>
      {designs.length > 8 && <div className="mt-2 text-[12px] text-slate-500 dark:text-[#9a9a9a]">Showing 8 of {designs.length}. Ask to see more.</div>}
    </AppCard>
  );
}
