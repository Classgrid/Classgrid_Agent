// Brand templates as a gallery
import React from 'react';
import { CdGrid } from './CdGrid';
import { CdTemplateCover } from './CdTemplateCover';

export function CdTemplateShelf({ templates }: { templates: any[] }) {
  return <CdGrid cols={3}>{templates.slice(0, 9).map((t, i) => <CdTemplateCover key={t.id ?? i} template={t} />)}</CdGrid>;
}
