// Tiny grey text under a cover
import React from 'react';
import { cn } from '@/lib/utils';

export function SdCaption({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('block min-w-0 truncate text-[11.5px] text-slate-500 dark:text-[#9a9a9a]', className)}>{children}</span>;
}
