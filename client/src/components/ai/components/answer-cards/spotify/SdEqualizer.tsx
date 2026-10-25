// Little moving bars while music plays
import React from 'react';
import { motion } from 'framer-motion';

export function SdEqualizer({ on }: { on: boolean }) {
  return (
    <span className="inline-flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => <motion.span key={i} className="w-[3px] rounded-full bg-[#1DB954]" animate={on ? { height: ['30%', '100%', '45%', '85%', '30%'] } : { height: '30%' }} transition={on ? { duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' } : { duration: 0.2 }} />)}
    </span>
  );
}
