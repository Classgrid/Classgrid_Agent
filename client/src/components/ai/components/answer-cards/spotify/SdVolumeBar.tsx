// The volume as a small filled bar
import React from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';

export function SdVolumeBar({ value }: { value?: number }) {
  if (typeof value !== 'number') return null;
  const Icon = value === 0 ? VolumeX : value < 50 ? Volume1 : Volume2;
  return <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-[#9a9a9a]"><Icon className="h-3.5 w-3.5" /><span className="h-1 w-14 overflow-hidden rounded-full bg-slate-200 dark:bg-[#333]"><span className="block h-full rounded-full bg-slate-600 dark:bg-[#b5b5b5]" style={{ width: value + '%' }} /></span></span>;
}
