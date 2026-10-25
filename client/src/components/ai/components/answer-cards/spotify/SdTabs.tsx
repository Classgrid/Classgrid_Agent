// Tabs when the answer has more than one kind of result; nothing when there is only one
import React from 'react';
import { SdTab } from './SdTab';

export type SdTabItem = { id: string; label: string; count?: number };

export function SdTabs({ tabs, active, onChange }: { tabs: SdTabItem[]; active: string; onChange: (id: string) => void }) {
  if (tabs.length < 2) return null;
  return <div role="tablist" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">{tabs.map((t) => <SdTab key={t.id} label={t.label} count={t.count} active={t.id === active} onClick={() => onChange(t.id)} />)}</div>;
}
