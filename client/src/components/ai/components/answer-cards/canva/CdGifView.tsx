// An exported GIF shown moving
import React from 'react';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';

export function CdGifView({ url }: { url: string }) {
  return <CdAspect ratio="16/9" className="bg-slate-50 dark:bg-[#1c1c1c]"><CdImage src={url} alt="Animated GIF" fit="contain" /></CdAspect>;
}
