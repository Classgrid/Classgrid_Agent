// The top 3 artists on a podium (#1 in the middle, bigger), the rest in a numbered grid below
import React from 'react';
import { cn } from '@/lib/utils';
import { SdArtistPortrait } from './SdArtistPortrait';
import { SdArtistRank } from './SdArtistRank';
import { SdArtistShelf } from './SdArtistShelf';
import { type SdArtistData } from './SdDisplay';

export function SdTopArtistsPodium({ artists }: { artists: SdArtistData[] }) {
  const top = artists.slice(0, 3);
  const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {order.map((i) => {
          const a = top[i];
          if (!a) return null;
          const first = i === 0;
          const body = (
            <>
              <span className="relative block">
                <SdArtistPortrait src={a.image} alt={a.name} className={cn('shadow-lg transition-transform duration-300 group-hover:scale-[1.04]', first ? 'h-24 w-24 ring-2 ring-[#1DB954] ring-offset-2 ring-offset-white sm:h-28 sm:w-28 dark:ring-offset-[#171717]' : 'h-16 w-16 sm:h-20 sm:w-20')} />
                <SdArtistRank n={i + 1} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
              </span>
              <span className={cn('mt-3 block max-w-[110px] truncate text-center font-medium text-slate-900 dark:text-white', first ? 'text-[14px]' : 'text-[12.5px]')}>{a.name}</span>
            </>
          );
          return a.url
            ? <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center">{body}</a>
            : <div key={i} className="flex flex-col items-center">{body}</div>;
        })}
      </div>
      {artists.length > 3 && <SdArtistShelf artists={artists.slice(3)} firstRank={4} />}
    </div>
  );
}
