// Album / playlist / artist tile: square (or round) picture, green play button on hover, name and a short line.
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Thumb } from '../shared';

export function SpotifyMediaTile({ image, title, sub, round, onPlay, href }: { image?: string; title?: string; sub?: string; round?: boolean; onPlay?: () => void; href?: string }) {
  return (
    <div className="group flex flex-col gap-1.5 min-w-0">
      <div className="relative">
        <Thumb src={image} alt={title} className="aspect-square w-full" rounded={round ? 'rounded-full' : 'rounded-xl'} />
        {onPlay && (
          <button type="button" onClick={onPlay} aria-label={`Play ${title}`} className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all cursor-pointer">
            <Play className="h-4 w-4 fill-current" />
          </button>
        )}
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn('min-w-0', round && 'text-center')}>
        <div className="text-[13px] font-medium text-slate-900 dark:text-white truncate hover:underline">{title}</div>
        {sub && <div className="text-[11.5px] text-slate-500 dark:text-[#9a9a9a] truncate">{sub}</div>}
      </a>
    </div>
  );
}
