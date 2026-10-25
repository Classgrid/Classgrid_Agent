// A short date like "25 Oct" (Canva sends Unix seconds; ISO strings also work)
import React from 'react';

/** Unix seconds, milliseconds or an ISO string -> Date */
export function cdDate(v?: number | string | null) {
  if (!v) return undefined;
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function CdTimeText({ value, prefix }: { value?: number | string | null; prefix?: string }) {
  const d = cdDate(value);
  if (!d) return null;
  const text = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  return <time dateTime={d.toISOString()} title={d.toLocaleString()}>{prefix ? prefix + ' ' + text : text}</time>;
}
