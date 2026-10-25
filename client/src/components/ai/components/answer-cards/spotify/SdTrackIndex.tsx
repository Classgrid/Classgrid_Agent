// The song's number in a list (or its rank in a top list)
import React from 'react';

export function SdTrackIndex({ n }: { n: number }) {
  return <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-slate-400 dark:text-[#6b6b6b]">{n}</span>;
}
