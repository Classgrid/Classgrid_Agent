// The cover as a record that spins while music plays
import React from 'react';
import { motion } from 'framer-motion';
import { SdArt } from './SdArt';

export function SdSpinningDisc({ src, playing }: { src?: string | null; playing?: boolean }) {
  return (
    <motion.div className="relative h-10 w-10 shrink-0 rounded-full shadow ring-2 ring-black/80" animate={playing ? { rotate: 360 } : { rotate: 0 }} transition={playing ? { duration: 6, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}>
      <SdArt src={src} round className="h-full w-full" />
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-black/30" />
    </motion.div>
  );
}
