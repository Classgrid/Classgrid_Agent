// A box around a player, with a soft color from the cover behind it
import React from 'react';
import { SdArtGlow } from './SdArtGlow';

export function SdPlayerShell({ art, children }: { art?: string | null; children: React.ReactNode }) {
  return <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-[#2a2a2a] dark:bg-[#1c1c1c]"><SdArtGlow src={art} /><div className="relative">{children}</div></div>;
}
