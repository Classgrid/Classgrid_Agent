// get_brand_template_dataset: the fields autofill can fill in this template
import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { AppCard, Pill } from '../shared';
import { CanvaEmptyState } from './CanvaEmptyState';
import { CanvaFieldRow } from './CanvaFieldRow';

// ─── Template fields ───
export function CanvaTemplateDatasetCard({ data }: { data: any }) {
  const fields = Object.entries((data?.dataset || {}) as Record<string, any>);
  if (!fields.length) return <CanvaEmptyState icon={LayoutTemplate} text="This template has no fillable fields" />;
  return (
    <AppCard brand="canva" title="Template fields" right={<Pill tone="purple">{fields.length}</Pill>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {fields.map(([name, f]) => <CanvaFieldRow key={name} name={name} type={f?.type} />)}
      </div>
    </AppCard>
  );
}
