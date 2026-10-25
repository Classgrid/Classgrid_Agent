// A display title (design, file or folder name) on one line
import React from 'react';
import { cn } from '@/lib/utils';

export function CdHeading({ children, size = 'md', href }: { children: React.ReactNode; size?: 'sm' | 'md' | 'lg'; href?: string }) {
  const cls = cn('block min-w-0 truncate font-semibold text-slate-900 dark:text-white', size === 'lg' ? 'text-[17px] leading-snug' : size === 'sm' ? 'text-[13.5px]' : 'text-[15px]');
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cn(cls, 'hover:underline')}>{children}</a>;
  return <div className={cls}>{children}</div>;
}
