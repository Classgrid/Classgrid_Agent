// get_current_playback: now playing with moving bars, the live minutes bar, volume / shuffle / repeat and the player.
import { useState } from 'react';
import { Shuffle, Repeat } from 'lucide-react';
import { AppCard, Pill, Thumb } from '../shared';
import type { SpotifyTrack } from './SpotifyTrackRow';
import { SpotifyEqualizer } from './SpotifyEqualizer';
import { SpotifySongProgress } from './SpotifySongProgress';
import { SpotifyEmbedPlayer } from './SpotifyEmbedPlayer';
import { SpotifyDeviceIcon } from './SpotifyDeviceIcon';
import { SpotifyVolumePill } from './SpotifyVolumePill';
import { SpotifyEmptyState } from './SpotifyEmptyState';
import { SpotifyPlayHereButton } from './SpotifyPlayHereButton';
import { SpotifyOpenButton } from './SpotifyOpenButton';

export function SpotifyNowPlayingCard({ data }: { args: any; data: any }) {
  const [listen, setListen] = useState(false);
  const t: SpotifyTrack | undefined = data.track;
  if (!t) return <SpotifyEmptyState text="Nothing is playing" sub={data.note || 'Open Spotify on a phone or computer to start.'} />;
  return (
    <AppCard brand="spotify" title={data.playing ? 'Now playing' : 'Paused'} right={data.device ? <Pill><SpotifyDeviceIcon className="h-3 w-3" />{data.device}</Pill> : undefined}>
      <div className="flex gap-3">
        <Thumb src={t.image} alt={t.album} className="h-20 w-20 shrink-0 shadow-sm" />
        <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <SpotifyEqualizer on={!!data.playing} />
              <span className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{t.name}</span>
            </div>
            <div className="text-[13px] text-slate-500 dark:text-[#9a9a9a] truncate">{t.artists}{t.album ? ` · ${t.album}` : ''}</div>
          </div>
          <SpotifySongProgress progress={data.progress_ms} duration={t.duration_ms} playing={!!data.playing} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
        {typeof data.volume === 'number' && <SpotifyVolumePill volume={data.volume} />}
        {data.shuffle && <Pill tone="green"><Shuffle className="h-3 w-3" />Shuffle</Pill>}
        {data.repeat && data.repeat !== 'off' && <Pill tone="green"><Repeat className="h-3 w-3" />Repeat {data.repeat}</Pill>}
      </div>
      {listen && <div className="mt-3"><SpotifyEmbedPlayer uri={t.uri} /></div>}
      <div className="mt-3 flex gap-2">
        <SpotifyPlayHereButton open={listen} onToggle={() => setListen((l) => !l)} />
        <SpotifyOpenButton href={t.url} />
      </div>
    </AppCard>
  );
}
