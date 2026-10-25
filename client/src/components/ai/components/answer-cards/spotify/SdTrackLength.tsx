// A song's length on the right of a list row
import React from 'react';
import { SdTime } from './SdTime';

export function SdTrackLength({ ms }: { ms?: number }) {
  if (!ms) return null;
  return <SdTime ms={ms} className="shrink-0 text-[12px] text-slate-400 dark:text-[#7d7d7d]" />;
}
