// Who wrote a comment and when
import React from 'react';
import { CdTimeText } from './CdTimeText';

export function CdMessageMeta({ name, when }: { name?: string; when?: number }) {
  return <div className="flex items-baseline gap-2"><span className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{name || 'Someone'}</span><span className="text-[11px] text-slate-400 dark:text-[#7d7d7d]"><CdTimeText value={when} /></span></div>;
}
