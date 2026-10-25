// The display card's outer surface in the chat's own light / dark colors
import React from 'react';
import { cn } from '@/lib/utils';

export function SdSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-[#2a2a2a] dark:bg-[#171717] dark:text-white', className)}>{children}</div>;
}
