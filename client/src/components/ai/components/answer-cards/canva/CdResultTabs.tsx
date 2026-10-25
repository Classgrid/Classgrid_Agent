// The tabs row; only kinds that have something show up
import React from 'react';
import { CdTabButton } from './CdTabButton';

export function CdResultTabs({ tabs, active, onPick }: { tabs: { id: string; label: string; count: number }[]; active: string; onPick: (id: string) => void }) {
  const shown = tabs.filter((t) => t.count > 0);
  if (shown.length < 2) return null;
  return <div role="tablist" className="flex flex-wrap gap-1.5">{shown.map((t) => <CdTabButton key={t.id} label={t.label} count={t.count} active={active === t.id} onClick={() => onPick(t.id)} />)}</div>;
}
