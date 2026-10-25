// A box that keeps its shape (square, 4:3, 16:9) so tiles line up before pictures load
import React from 'react';
import { cn } from '@/lib/utils';

const RATIOS = { square: 'aspect-square', '4/3': 'aspect-[4/3]', '16/9': 'aspect-video', '3/4': 'aspect-[3/4]' } as const;

export function CdAspect({ ratio = '4/3', className, children }: { ratio?: keyof typeof RATIOS; className?: string; children: React.ReactNode }) {
  return <div className={cn('relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#222]', RATIOS[ratio], className)}>{children}</div>;
}
