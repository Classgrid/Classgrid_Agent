// Milliseconds as 3:12 (or 1:04:05 for long things)
import React from 'react';

export function sdTime(ms?: number) {
  if (!ms || ms < 0) return '0:00';
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, '0');
  return h ? h + ':' + String(m).padStart(2, '0') + ':' + sec : m + ':' + sec;
}

export function SdTime({ ms, className }: { ms?: number; className?: string }) {
  return <span className={'tabular-nums ' + (className || '')}>{sdTime(ms)}</span>;
}
