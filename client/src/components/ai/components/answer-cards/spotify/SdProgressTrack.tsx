// The thin bar that fills as the song plays
import React from 'react';
import { motion } from 'framer-motion';

export function SdProgressTrack({ pct }: { pct: number }) {
  return <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#333]"><motion.div className="h-full rounded-full bg-slate-900 dark:bg-white" initial={false} animate={{ width: Math.max(0, Math.min(100, pct)) + '%' }} transition={{ ease: 'linear', duration: 0.9 }} /></div>;
}
