// A lazy picture: shimmers while loading, shows a soft icon when it is missing or fails
import React, { useEffect, useState } from 'react';
import { ImageOff, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CdShimmer } from './CdShimmer';

export function CdImage({ src, alt, icon: Icon = ImageOff, fit = 'cover', className }: { src?: string | null; alt?: string; icon?: LucideIcon; fit?: 'cover' | 'contain'; className?: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>(src ? 'loading' : 'failed');
  useEffect(() => { setState(src ? 'loading' : 'failed'); }, [src]);
  if (!src || state === 'failed') {
    return <div className={cn('flex h-full w-full items-center justify-center bg-slate-100 text-slate-300 dark:bg-[#222] dark:text-[#4a4a4a]', className)}><Icon className="h-6 w-6" /></div>;
  }
  return (
    <>
      {state === 'loading' && <CdShimmer className="absolute inset-0" />}
      <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" onLoad={() => setState('ok')} onError={() => setState('failed')}
        className={cn('h-full w-full transition-opacity duration-300', fit === 'contain' ? 'object-contain' : 'object-cover', state === 'loading' ? 'opacity-0' : 'opacity-100', className)} />
    </>
  );
}
