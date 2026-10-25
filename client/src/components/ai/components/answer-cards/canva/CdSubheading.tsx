// A soft second line under a title
import React from 'react';
import { cn } from '@/lib/utils';

export function CdSubheading({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('min-w-0 truncate text-[13px] text-slate-500 dark:text-[#9a9a9a]', className)}>{children}</div>;
}
