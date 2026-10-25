// A neat grid of covers (2 columns on phones, more on wide screens)
import React from 'react';
import { cn } from '@/lib/utils';

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-3 sm:grid-cols-4' } as const;

export function SdGrid({ children, cols = 3, className }: { children: React.ReactNode; cols?: keyof typeof COLS; className?: string }) {
  return <div className={cn('grid gap-3', COLS[cols], className)}>{children}</div>;
}
