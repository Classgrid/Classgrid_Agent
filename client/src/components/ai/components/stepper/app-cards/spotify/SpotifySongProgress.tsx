// Minutes bar (counts up every second while the song plays).
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fmtTime } from '../shared';

export function SpotifySongProgress({ progress, duration, playing }: { progress?: number; duration?: number; playing?: boolean }) {
  const [now, setNow] = useState(progress ?? 0);
  useEffect(() => { setNow(progress ?? 0); }, [progress]);
  useEffect(() => {
    if (!playing || !duration) return;
    const t = setInterval(() => setNow((n) => Math.min(n + 1000, duration)), 1000);
    return () => clearInterval(t);
  }, [playing, duration]);
  const pct = duration ? Math.min(100, (now / duration) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-[#333] overflow-hidden">
        <motion.div className="h-full rounded-full bg-slate-900 dark:bg-white" initial={false} animate={{ width: `${pct}%` }} transition={{ ease: 'linear', duration: 0.9 }} />
      </div>
      <div className="flex justify-between text-[11px] tabular-nums text-slate-500 dark:text-[#8a8a8a]">
        <span>{fmtTime(now)}</span>
        <span>{fmtTime(duration)}</span>
      </div>
    </div>
  );
}
