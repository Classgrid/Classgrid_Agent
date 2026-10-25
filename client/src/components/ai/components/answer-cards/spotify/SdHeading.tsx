// A display title (song, playlist, artist) on one line; a link when it has a Spotify url
import React from 'react';
import { cn } from '@/lib/utils';

export function SdHeading({ children, href, size = 'md' }: { children: React.ReactNode; href?: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = cn('block min-w-0 truncate font-semibold text-slate-900 dark:text-white', size === 'lg' ? 'text-[18px] leading-snug' : size === 'sm' ? 'text-[13.5px]' : 'text-[15px]');
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cn(cls, 'hover:underline')}>{children}</a>;
  return <div className={cls}>{children}</div>;
}
