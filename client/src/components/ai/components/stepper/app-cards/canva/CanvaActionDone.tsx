// "Done" line for Canva actions that send no data back (deleted, moved)
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { DoneLine } from '../shared';

// ─── Action done ───
export function CanvaActionDone({ icon: Icon, text, sub }: { icon: LucideIcon; text: string; sub?: string }) {
  return <DoneLine brand="canva" icon={<Icon className="h-[18px] w-[18px]" />} text={text} sub={sub} />;
}
