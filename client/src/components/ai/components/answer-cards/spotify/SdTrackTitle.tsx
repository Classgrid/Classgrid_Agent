// A song's name in a list
import React from 'react';

export function SdTrackTitle({ name }: { name?: string }) {
  return <span className="block min-w-0 truncate text-[13.5px] font-medium text-slate-900 dark:text-white">{name || 'Unknown song'}</span>;
}
