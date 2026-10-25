// All tags of an image, wrapping
import React from 'react';
import { CdTag } from './CdTag';

export function CdTagCloud({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return <div className="flex flex-wrap gap-1.5">{tags.slice(0, 12).map((t) => <CdTag key={t} text={t} />)}</div>;
}
