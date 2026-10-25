// A soft pulsing block shown while a picture is still loading
import React from 'react';
import { cn } from '@/lib/utils';

export function CdShimmer({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse bg-slate-100 dark:bg-[#232323]', className)} />;
}
