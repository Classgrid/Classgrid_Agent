// When a song was played or liked, on the right of a list row
import React from 'react';
import { SdTimeAgo } from './SdTimeAgo';

export function SdTrackWhen({ value }: { value?: string }) {
  if (!value) return null;
  return <span className="shrink-0 text-[12px] text-slate-400 dark:text-[#7d7d7d]"><SdTimeAgo value={value} /></span>;
}
