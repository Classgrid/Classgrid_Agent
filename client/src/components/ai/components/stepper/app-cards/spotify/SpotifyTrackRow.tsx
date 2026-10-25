// One song row (tap the picture to open the player under it).
import { fmtTime, fmtWhen } from '../shared';
import { SpotifyAlbumArt } from './SpotifyAlbumArt';
import { SpotifyEmbedPlayer } from './SpotifyEmbedPlayer';

export type SpotifyTrack = { id?: string; name?: string; uri?: string; artists?: string; album?: string; image?: string; duration_ms?: number; url?: string; played_at?: string; added_at?: string };

export function SpotifyTrackRow({ t, index, open, onToggle }: { t: SpotifyTrack; index: number; open: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="group flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-slate-50 dark:hover:bg-[#1f1f1f] transition-colors">
        <SpotifyAlbumArt src={t.image} alt={t.album} name={t.name} open={open} onToggle={onToggle} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium text-slate-900 dark:text-white truncate">{t.name}</div>
          <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a] truncate">{t.artists}{t.album ? ` · ${t.album}` : ''}</div>
        </div>
        <span className="shrink-0 text-[11.5px] tabular-nums text-slate-400 dark:text-[#7d7d7d]">
          {t.played_at ? fmtWhen(t.played_at) : t.added_at ? fmtWhen(t.added_at) : fmtTime(t.duration_ms)}
        </span>
        <span className="hidden sm:block w-4 shrink-0 text-right text-[11px] tabular-nums text-slate-300 dark:text-[#555]">{index + 1}</span>
      </div>
      {open && <div className="px-1.5 pb-2"><SpotifyEmbedPlayer uri={t.uri} /></div>}
    </div>
  );
}
