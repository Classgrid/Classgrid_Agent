// "1 song" / "24 songs" with the right word
import React from 'react';

export function SdCount({ n, one, many }: { n?: number; one: string; many?: string }) {
  if (typeof n !== 'number') return null;
  return <span className="tabular-nums">{n.toLocaleString()} {n === 1 ? one : (many ?? one + 's')}</span>;
}
