// Small album picture of a song row, with a play / pause sign on top (tap to open or hide the player).
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Thumb } from '../shared';

export function SpotifyAlbumArt({ src, alt, name, open, onToggle }: { src?: string; alt?: string; name?: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={open ? 'Hide player' : `Play ${name}`} className="relative h-10 w-10 shrink-0 cursor-pointer">
      <Thumb src={src} alt={alt} className="h-10 w-10" rounded="rounded-md" />
      <span className={cn('absolute inset-0 flex items-center justify-center rounded-md bg-black/45 text-white transition-opacity', open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {open ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </span>
    </button>
  );
}
