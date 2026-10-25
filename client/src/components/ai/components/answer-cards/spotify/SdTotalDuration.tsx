// The total length of a list of songs ("1 h 12 min")
import React from 'react';

export function SdTotalDuration({ tracks }: { tracks: { duration_ms?: number }[] }) {
  const ms = tracks.reduce((n, t) => n + (t.duration_ms || 0), 0);
  if (!ms) return null;
  const min = Math.round(ms / 60000);
  return <span>{min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min'}</span>;
}
