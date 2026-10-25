// A file's name from its link (without the long download query)
import React from 'react';

export function cdFileName(url: string, fallback: string) {
  try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || fallback); } catch { return fallback; }
}

export function CdFileName({ url, fallback }: { url: string; fallback: string }) {
  return <span className="block min-w-0 truncate text-[13.5px] font-medium text-slate-900 dark:text-white">{cdFileName(url, fallback)}</span>;
}
