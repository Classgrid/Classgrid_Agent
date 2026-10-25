// "Playing" with moving bars, or "Paused"
import React from 'react';
import { SdEqualizer } from './SdEqualizer';

export function SdPlayState({ playing }: { playing?: boolean }) {
  return <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-[#b5b5b5]"><SdEqualizer on={!!playing} />{playing ? 'Playing' : 'Paused'}</span>;
}
