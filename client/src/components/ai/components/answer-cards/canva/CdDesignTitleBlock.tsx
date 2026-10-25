// A design's name with its facts underneath
import React from 'react';
import { CdHeading } from './CdHeading';
import { CdFactLine } from './CdFactLine';

export function CdDesignTitleBlock({ title, href, facts }: { title?: string; href?: string; facts: React.ReactNode[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <CdHeading size="lg" href={href}>{title || 'Untitled design'}</CdHeading>
      <CdFactLine items={facts} />
    </div>
  );
}
