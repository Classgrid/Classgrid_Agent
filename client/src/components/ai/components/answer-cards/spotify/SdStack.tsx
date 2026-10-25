// The display card's body: parts stacked with even spacing
import React from 'react';
import { cn } from '@/lib/utils';

export function SdStack({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-3.5 px-4 pb-4', className)}>{children}</div>;
}
