// Songs in the AI's answer (play_song / download_song). Same look as the Spotify display (its card, rows, covers),
// but songs play with YouTube's own embedded player, and downloaded songs with a private signed link.
import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { fetchWithRescue } from '@/lib/rescue';
import { SdBoundary } from '../spotify/SdBoundary';
import { SdSurface } from '../spotify/SdSurface';
import { SdStack } from '../spotify/SdStack';
import { SdSectionTitle } from '../spotify/SdSectionTitle';
import { SdTrackIndex } from '../spotify/SdTrackIndex';
import { SdTrackArtThumb } from '../spotify/SdTrackArtThumb';
import { SdTrackTitle } from '../spotify/SdTrackTitle';
import { SdTrackArtists } from '../spotify/SdTrackArtists';
import { SdTrackLength } from '../spotify/SdTrackLength';
import { SdErrorBox } from '../spotify/SdErrorBox';
import { SdHighlight } from '../spotify/SdHighlight';

type Song = { videoId: string; title: string; channel: string; durationSec?: number; thumbnail?: string; url?: string };
type Saved = Song & { id: string; url?: string; mimeType?: string };

function read(result: unknown): any {
  if (result && typeof result === 'object') return result;
  try { return JSON.parse(String(result ?? '')); } catch { return null; }
}

/** This answer's song results: the newest list, every saved song, and errors */
export function collectSongs(steps: any[]) {
  let songs: Song[] = [];
  const saved: Saved[] = [];
  const errors: string[] = [];
  for (const s of steps || []) {
    if (s?.type !== 'tool' || (s.tool !== 'play_song' && s.tool !== 'download_song') || s.status === 'loading') continue;
    const d = read(s.result);
    if (!d) continue;
    if (d.error) errors.push(String(d.error));
    if (Array.isArray(d.songs)) songs = d.songs;
    if (d.saved?.id && !saved.some((x) => x.id === d.saved.id)) saved.push(d.saved);
  }
  return { songs, saved, errors };
}

function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="mt-1.5 mb-1 overflow-hidden rounded-xl border border-slate-200 dark:border-[#2a2a2a] aspect-video w-full bg-black">
      <iframe
        title={title || 'YouTube player'}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
        className="h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

function SongRow({ song, n, open, onToggle }: { song: Song; n: number; open: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col">
      <button type="button" onClick={onToggle} className="group flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#1f1f1f] cursor-pointer">
        <SdTrackIndex n={n} />
        <SdTrackArtThumb src={song.thumbnail} alt={song.title} open={open} />
        <span className="flex min-w-0 flex-1 flex-col">
          <SdTrackTitle name={song.title} />
          <span className="flex min-w-0 gap-1.5 text-[12px] text-slate-500 dark:text-[#9a9a9a]"><SdTrackArtists artists={song.channel} /></span>
        </span>
        {song.durationSec ? <SdTrackLength ms={song.durationSec * 1000} /> : null}
      </button>
      {open && <YouTubePlayer videoId={song.videoId} title={song.title} />}
    </div>
  );
}

/** A downloaded song: audio player and download button. The signed link is fetched fresh (they last 15 minutes). */
function SavedSongRow({ song }: { song: Saved }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const api = import.meta.env.VITE_API_URL || 'https://api.classgrid.in';
    fetchWithRescue(`${api}/api/music/${song.id}/url`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => (d?.url ? setUrl(d.url) : setErr(d?.message || 'This song is no longer saved.')))
      .catch(() => setErr("Couldn't load the song."));
  }, [song.id]);
  const ext = song.mimeType === 'audio/webm' ? 'webm' : song.mimeType === 'audio/mpeg' ? 'mp3' : 'm4a';
  const fileName = `${(song.title || 'song').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80)}.${ext}`;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-[#2a2a2a]">
      <div className="flex items-center gap-3">
        <SdTrackArtThumb src={song.thumbnail} alt={song.title} open={false} />
        <span className="flex min-w-0 flex-1 flex-col">
          <SdTrackTitle name={song.title} />
          <span className="text-[12px] text-slate-500 dark:text-[#9a9a9a] truncate">{song.channel}</span>
        </span>
        {url && (
          <a href={url} download={fileName} className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[12.5px] font-medium hover:bg-slate-50 dark:border-[#2a2a2a] dark:hover:bg-[#1f1f1f]">
            <Download className="h-3.5 w-3.5" />Download
          </a>
        )}
      </div>
      {url ? <audio controls preload="none" src={url} className="w-full h-9" /> : err ? <SdErrorBox text={err} /> : null}
    </div>
  );
}

export function SongsDisplay({ steps }: { steps: any[] }) {
  const { songs, saved, errors } = collectSongs(steps);
  const [open, setOpen] = useState<string | null>(songs[0]?.videoId ?? null);
  if (!songs.length && !saved.length && !errors.length) return null;
  return (
    <SdBoundary>
      <SdSurface>
        <div className="p-3.5">
          <SdStack>
            {errors.map((e, i) => <SdErrorBox key={i} text={e} />)}
            {saved.length > 0 && (
              <>
                <SdHighlight text={saved.length === 1 ? 'Saved to your songs' : `${saved.length} songs saved`} />
                {saved.map((s) => <SavedSongRow key={s.id} song={s} />)}
              </>
            )}
            {songs.length > 0 && (
              <>
                <SdSectionTitle>Songs</SdSectionTitle>
                <div className="flex flex-col">
                  {songs.map((s, i) => (
                    <SongRow key={s.videoId} song={s} n={i + 1} open={open === s.videoId} onToggle={() => setOpen((o) => (o === s.videoId ? null : s.videoId))} />
                  ))}
                </div>
              </>
            )}
          </SdStack>
        </div>
      </SdSurface>
    </SdBoundary>
  );
}
