// A small status badge at the top of the display (how many results)
import React from 'react';
import { CdBadge } from './CdBadge';

export function CdStatusPill({ count, word }: { count: number; word: string }) {
  if (!count) return null;
  return <CdBadge tone="purple">{count} {count === 1 ? word : word + 's'}</CdBadge>;
}
