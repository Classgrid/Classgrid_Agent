// list_brand_templates: the team's brand templates as a carousel
import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { AppCard, Carousel, Pill } from '../shared';
import { CanvaEmptyState } from './CanvaEmptyState';
import { CanvaTemplateTile } from './CanvaTemplateTile';

// ─── Brand templates ───
export function CanvaBrandTemplatesCard({ data }: { data: any }) {
  const templates: any[] = data?.items || [];
  if (!templates.length) return <CanvaEmptyState icon={LayoutTemplate} text="No brand templates found" sub="Brand templates need Canva Teams or Enterprise." />;
  return (
    <AppCard brand="canva" title="Brand templates" right={<Pill tone="purple">{templates.length}</Pill>}>
      <Carousel>{templates.map((t) => <CanvaTemplateTile key={t.id} template={t} />)}</Carousel>
    </AppCard>
  );
}
