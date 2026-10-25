// The minutes bar: counts up every second while the song plays
import React, { useEffect, useState } from 'react';
import { SdProgressTrack } from './SdProgressTrack';
import { SdTime } from './SdTime';

export function SdLiveProgress({ progress, duration, playing }: { progress?: number; duration?: number; playing?: boolean }) {
  const [now, setNow] = useState(progress ?? 0);
  useEffect(() => { setNow(progress ?? 0); }, [progress]);
  useEffect(() => {
    if (!playing || !duration) return;
    const t = setInterval(() => setNow((n) => Math.min(n + 1000, duration)), 1000);
    return () => clearInterval(t);
  }, [playing, duration]);
  return (
    <div className="flex flex-col gap-1">
      <SdProgressTrack pct={duration ? (now / duration) * 100 : 0} />
      <div className="flex justify-between text-[11px] text-slate-500 dark:text-[#8a8a8a]"><SdTime ms={now} /><SdTime ms={duration} /></div>
    </div>
  );
}
