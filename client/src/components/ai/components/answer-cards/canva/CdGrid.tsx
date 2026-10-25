// A neat grid of tiles (2 columns on phones, more on wide screens)
import React from 'react';
import { cn } from '@/lib/utils';

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-3 sm:grid-cols-4' } as const;

export function CdGrid({ children, cols = 2, className }: { children: React.ReactNode; cols?: keyof typeof COLS; className?: string }) {
  return <div className={cn('grid gap-3', COLS[cols], className)}>{children}</div>;
}
