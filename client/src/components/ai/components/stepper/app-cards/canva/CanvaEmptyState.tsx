// "Nothing here" line for Canva lists that came back empty (no designs, no pages, empty folder…)
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { DoneLine } from '../shared';

// ─── Empty list ───
export function CanvaEmptyState({ icon: Icon, text, sub }: { icon: LucideIcon; text: string; sub?: string }) {
  return <DoneLine brand="canva" icon={<Icon className="h-[18px] w-[18px]" />} text={text} sub={sub} />;
}
