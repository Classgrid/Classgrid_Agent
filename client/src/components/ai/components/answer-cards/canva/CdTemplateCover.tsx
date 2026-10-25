// One brand template: cover and name; opens a new design from it
import React from 'react';
import { CdDesignCover } from './CdDesignCover';
import { CdCaption } from './CdCaption';

export function CdTemplateCover({ template }: { template: any }) {
  const href = template.create_url || template.view_url;
  return <div className="flex min-w-0 flex-col gap-1"><CdDesignCover src={template.thumbnail?.url} alt={template.title} ratio="4/3" href={href} /><CdCaption className="font-medium text-slate-700 dark:text-[#d6d6d6]">{template.title || 'Template'}</CdCaption></div>;
}
