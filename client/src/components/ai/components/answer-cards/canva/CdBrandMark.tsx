// The Canva logo
import React from 'react';
import { cn } from '@/lib/utils';

export const CANVA_LOGO_URL = 'https://cdn.classgrid.in/classgrid_intgration/canva.svg';

export function CdBrandMark({ className }: { className?: string }) {
  return <img src={CANVA_LOGO_URL} alt="" loading="lazy" className={cn('h-[18px] w-[18px] shrink-0 rounded', className)} />;
}
