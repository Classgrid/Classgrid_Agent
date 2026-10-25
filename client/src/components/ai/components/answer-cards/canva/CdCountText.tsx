// "1 page" / "6 pages" with the right word
import React from 'react';

export function CdCountText({ n, one, many }: { n?: number; one: string; many?: string }) {
  if (typeof n !== 'number') return null;
  return <span className="tabular-nums">{n} {n === 1 ? one : (many ?? one + 's')}</span>;
}
