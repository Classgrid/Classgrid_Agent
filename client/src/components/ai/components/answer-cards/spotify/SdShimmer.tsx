// A soft pulsing block while a cover or player loads
import React from 'react';
import { cn } from '@/lib/utils';

export function SdShimmer({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse bg-slate-100 dark:bg-[#232323]', className)} />;
}
