// Cover art (album, playlist, artist): shimmers while loading, a music note when missing
import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SdShimmer } from './SdShimmer';

export function SdArt({ src, alt, round, className }: { src?: string | null; alt?: string; round?: boolean; className?: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>(src ? 'loading' : 'failed');
  useEffect(() => { setState(src ? 'loading' : 'failed'); }, [src]);
  const shape = round ? 'rounded-full' : 'rounded-lg';
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-slate-100 dark:bg-[#222]', shape, className)}>
      {(!src || state === 'failed') ? <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-[#4a4a4a]"><Music className="h-1/3 w-1/3" /></div> : (
        <>
          {state === 'loading' && <SdShimmer className="absolute inset-0" />}
          <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" onLoad={() => setState('ok')} onError={() => setState('failed')} className={cn('h-full w-full object-cover transition-opacity duration-300', state === 'loading' ? 'opacity-0' : 'opacity-100')} />
        </>
      )}
    </div>
  );
}
