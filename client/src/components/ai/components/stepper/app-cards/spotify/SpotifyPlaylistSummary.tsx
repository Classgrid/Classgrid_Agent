// Playlist made or changed: cover, name, description, public / private, the player and two buttons.
import { useState } from 'react';
import { ListMusic } from 'lucide-react';
import { AppCard, Pill, Thumb } from '../shared';
import { SpotifyEmbedPlayer } from './SpotifyEmbedPlayer';
import { SpotifyPlayHereButton } from './SpotifyPlayHereButton';
import { SpotifyOpenButton } from './SpotifyOpenButton';

export function SpotifyPlaylistSummary({ data, args, title }: { data: any; args: any; title: string }) {
  const [listen, setListen] = useState(false);
  return (
    <AppCard brand="spotify" title={title}>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-[#1DB954] to-[#0d6e30] flex items-center justify-center overflow-hidden">
          {data.image ? <Thumb src={data.image} className="h-16 w-16" /> : <ListMusic className="h-7 w-7 text-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{data.name || args.name || 'Playlist'}</div>
          {(data.description || args.description) && <div className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] line-clamp-2">{data.description || args.description}</div>}
          <div className="mt-1"><Pill>{data.public ?? args.public ? 'Public' : 'Private'}</Pill></div>
        </div>
      </div>
      {listen && data.uri && <div className="mt-3"><SpotifyEmbedPlayer uri={data.uri} tall /></div>}
      <div className="mt-3 flex gap-2">
        {data.uri && <SpotifyPlayHereButton open={listen} onToggle={() => setListen((l) => !l)} />}
        <SpotifyOpenButton href={data.url} />
      </div>
    </AppCard>
  );
}
