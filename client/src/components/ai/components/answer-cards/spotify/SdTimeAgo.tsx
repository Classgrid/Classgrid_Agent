// "5 min ago", "yesterday" for recently played songs
import React from 'react';

export function SdTimeAgo({ value }: { value?: string }) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  const text = sec < 60 ? 'just now' : sec < 3600 ? Math.floor(sec / 60) + ' min ago' : sec < 86400 ? Math.floor(sec / 3600) + ' h ago' : sec < 172800 ? 'yesterday' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return <time dateTime={d.toISOString()} title={d.toLocaleString()}>{text}</time>;
}
