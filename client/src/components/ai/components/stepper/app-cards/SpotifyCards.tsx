// Spotify cards for the spotify_connector tool: the real Spotify player (official embed), now playing with a live
// minutes bar, track lists, album / artist / playlist carousels, devices, profile and done cards for player actions.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, Shuffle, Repeat, ListPlus, MonitorSpeaker, Smartphone, Laptop, Speaker,
  Heart, HeartOff, ListMusic, ExternalLink, Music2, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppCard, CardButton, Carousel, DoneLine, Pill, ShortList, Thumb, fmtTime, fmtWhen } from './shared';

type Track = { id?: string; name?: string; uri?: string; artists?: string; album?: string; image?: string; duration_ms?: number; url?: string; played_at?: string; added_at?: string };

/** "spotify:track:abc" → { type: "track", id: "abc" } */
function fromUri(uri?: string) {
  const m = String(uri || '').match(/^spotify:(track|album|artist|playlist|episode|show):([A-Za-z0-9]+)$/);
  return m ? { type: m[1], id: m[2] } : null;
}

// ─── 1. The real player: Spotify's official embed (plays in the chat; full songs when signed in to Spotify in this browser) ───
export function SpotifyPlayer({ uri, tall }: { uri?: string; tall?: boolean }) {
  const ref = fromUri(uri);
  if (!ref) return null;
  return (
    <iframe
      title="Spotify player"
      src={`https://open.spotify.com/embed/${ref.type}/${ref.id}?utm_source=classgrid`}
      width="100%"
      height={tall ? 352 : 152}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="block rounded-xl border-0"
    />
  );
}

// ─── 2. Moving "playing" bars ───
function Equalizer({ on }: { on: boolean }) {
  return (
    <span className="inline-flex items-end gap-[2px] h-3.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-[#1DB954]"
          animate={on ? { height: ['30%', '100%', '45%', '85%', '30%'] } : { height: '30%' }}
          transition={on ? { duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' } : { duration: 0.2 }}
        />
      ))}
    </span>
  );
}

// ─── 3. Minutes bar (counts up while the song plays) ───
export function SongProgress({ progress, duration, playing }: { progress?: number; duration?: number; playing?: boolean }) {
  const [now, setNow] = useState(progress ?? 0);
  useEffect(() => { setNow(progress ?? 0); }, [progress]);
  useEffect(() => {
    if (!playing || !duration) return;
    const t = setInterval(() => setNow((n) => Math.min(n + 1000, duration)), 1000);
    return () => clearInterval(t);
  }, [playing, duration]);
  const pct = duration ? Math.min(100, (now / duration) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-[#333] overflow-hidden">
        <motion.div className="h-full rounded-full bg-slate-900 dark:bg-white" initial={false} animate={{ width: `${pct}%` }} transition={{ ease: 'linear', duration: 0.9 }} />
      </div>
      <div className="flex justify-between text-[11px] tabular-nums text-slate-500 dark:text-[#8a8a8a]">
        <span>{fmtTime(now)}</span>
        <span>{fmtTime(duration)}</span>
      </div>
    </div>
  );
}

// ─── 4. Now playing ───
function NowPlayingCard({ data }: { data: any }) {
  const [listen, setListen] = useState(false);
  const t: Track | undefined = data.track;
  if (!t) return <DoneLine brand="spotify" icon={<Music2 className="h-[18px] w-[18px]" />} text="Nothing is playing" sub={data.note || 'Open Spotify on a phone or computer to start.'} />;
  return (
    <AppCard brand="spotify" title={data.playing ? 'Now playing' : 'Paused'} right={data.device ? <Pill><MonitorSpeaker className="h-3 w-3" />{data.device}</Pill> : undefined}>
      <div className="flex gap-3">
        <Thumb src={t.image} alt={t.album} className="h-20 w-20 shrink-0 shadow-sm" />
        <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Equalizer on={!!data.playing} />
              <span className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{t.name}</span>
            </div>
            <div className="text-[13px] text-slate-500 dark:text-[#9a9a9a] truncate">{t.artists}{t.album ? ` · ${t.album}` : ''}</div>
          </div>
          <SongProgress progress={data.progress_ms} duration={t.duration_ms} playing={!!data.playing} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
        {typeof data.volume === 'number' && <Pill><Volume2 className="h-3 w-3" />{data.volume}%</Pill>}
        {data.shuffle && <Pill tone="green"><Shuffle className="h-3 w-3" />Shuffle</Pill>}
        {data.repeat && data.repeat !== 'off' && <Pill tone="green"><Repeat className="h-3 w-3" />Repeat {data.repeat}</Pill>}
      </div>
      {listen && <div className="mt-3"><SpotifyPlayer uri={t.uri} /></div>}
      <div className="mt-3 flex gap-2">
        <CardButton brand="spotify" primary icon={<Play className="h-3.5 w-3.5" />} onClick={() => setListen((l) => !l)}>{listen ? 'Hide player' : 'Play here'}</CardButton>
        {t.url && <CardButton brand="spotify" href={t.url} icon={<ExternalLink className="h-3.5 w-3.5" />}>Open in Spotify</CardButton>}
      </div>
    </AppCard>
  );
}

// ─── 5. One song row (tap play to open the player under it) ───
function TrackRow({ t, index, open, onToggle }: { t: Track; index: number; open: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="group flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-slate-50 dark:hover:bg-[#1f1f1f] transition-colors">
        <button type="button" onClick={onToggle} aria-label={open ? 'Hide player' : `Play ${t.name}`} className="relative h-10 w-10 shrink-0 cursor-pointer">
          <Thumb src={t.image} alt={t.album} className="h-10 w-10" rounded="rounded-md" />
          <span className={cn('absolute inset-0 flex items-center justify-center rounded-md bg-black/45 text-white transition-opacity', open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
            {open ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium text-slate-900 dark:text-white truncate">{t.name}</div>
          <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a] truncate">{t.artists}{t.album ? ` · ${t.album}` : ''}</div>
        </div>
        <span className="shrink-0 text-[11.5px] tabular-nums text-slate-400 dark:text-[#7d7d7d]">
          {t.played_at ? fmtWhen(t.played_at) : t.added_at ? fmtWhen(t.added_at) : fmtTime(t.duration_ms)}
        </span>
        <span className="hidden sm:block w-4 shrink-0 text-right text-[11px] tabular-nums text-slate-300 dark:text-[#555]">{index + 1}</span>
      </div>
      {open && <div className="px-1.5 pb-2"><SpotifyPlayer uri={t.uri} /></div>}
    </div>
  );
}

// ─── 6. Song list ───
function TrackList({ title, tracks, total }: { title: string; tracks: Track[]; total?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!tracks.length) return <DoneLine brand="spotify" icon={<Music2 className="h-[18px] w-[18px]" />} text="No songs found" />;
  return (
    <AppCard brand="spotify" title={title} right={<Pill>{total ?? tracks.length} songs</Pill>}>
      <ShortList items={tracks} first={5} render={(t, i) => <TrackRow key={`${t.id}-${i}`} t={t} index={i} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />} />
    </AppCard>
  );
}

// ─── 7. Album / playlist tile, 8. artist tile ───
function MediaTile({ image, title, sub, round, onPlay, href }: { image?: string; title?: string; sub?: string; round?: boolean; onPlay?: () => void; href?: string }) {
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

function MediaCarousel({ title, items, kind }: { title: string; items: any[]; kind: 'album' | 'artist' | 'playlist' }) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (!items.length) return null;
  return (
    <AppCard brand="spotify" title={title} right={<Pill>{items.length}</Pill>}>
      <Carousel>
        {items.map((x) => (
          <MediaTile
            key={x.id ?? x.uri}
            image={x.image}
            title={x.name}
            round={kind === 'artist'}
            href={x.url}
            sub={kind === 'album' ? [x.artists, x.release_date?.slice(0, 4)].filter(Boolean).join(' · ')
              : kind === 'playlist' ? [x.owner, typeof x.total === 'number' ? `${x.total} songs` : ''].filter(Boolean).join(' · ')
                : (x.genres || []).slice(0, 2).join(', ')}
            onPlay={x.uri ? () => setPlaying(playing === x.uri ? null : x.uri) : undefined}
          />
        ))}
      </Carousel>
      {playing && <div className="mt-3"><SpotifyPlayer uri={playing} tall={kind !== 'artist'} /></div>}
    </AppCard>
  );
}

// ─── 9. Search results (songs, then albums, artists, playlists) ───
function SearchCard({ data, query }: { data: any; query?: string }) {
  const parts = [
    data.tracks?.length ? <TrackList key="t" title={query ? `Songs for "${query}"` : 'Songs'} tracks={data.tracks} /> : null,
    data.albums?.length ? <MediaCarousel key="al" title="Albums" items={data.albums} kind="album" /> : null,
    data.artists?.length ? <MediaCarousel key="ar" title="Artists" items={data.artists} kind="artist" /> : null,
    data.playlists?.length ? <MediaCarousel key="p" title="Playlists" items={data.playlists} kind="playlist" /> : null,
  ].filter(Boolean);
  if (!parts.length) return <DoneLine brand="spotify" icon={<Music2 className="h-[18px] w-[18px]" />} text="Nothing found" sub={query} />;
  return <div className="flex flex-col gap-2.5">{parts}</div>;
}

// ─── 10. Devices ───
const deviceIcon = (type?: string) => /phone/i.test(type || '') ? Smartphone : /computer/i.test(type || '') ? Laptop : /speaker|tv|cast/i.test(type || '') ? Speaker : MonitorSpeaker;
function DevicesCard({ devices }: { devices: any[] }) {
  if (!devices.length) return <DoneLine brand="spotify" icon={<MonitorSpeaker className="h-[18px] w-[18px]" />} text="No devices online" sub="Open Spotify on a phone, computer or speaker." />;
  return (
    <AppCard brand="spotify" title="Your devices">
      <div className="flex flex-col gap-1">
        {devices.map((d) => {
          const Icon = deviceIcon(d.type);
          return (
            <div key={d.id ?? d.name} className="flex items-center gap-3 rounded-lg px-1.5 py-1.5">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', d.is_active ? 'bg-[#1DB954]/15 text-[#13843c] dark:text-[#1ed760]' : 'bg-slate-100 dark:bg-[#262626] text-slate-500 dark:text-[#9a9a9a]')}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-slate-900 dark:text-white truncate">{d.name}</div>
                <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">{d.type}{typeof d.volume_percent === 'number' ? ` · ${d.volume_percent}% volume` : ''}</div>
              </div>
              {d.is_active && <Pill tone="green">Playing here</Pill>}
            </div>
          );
        })}
      </div>
    </AppCard>
  );
}

// ─── 11. Profile ───
function ProfileCard({ data }: { data: any }) {
  return (
    <AppCard brand="spotify" title="Spotify account">
      <div className="flex items-center gap-3">
        <Thumb src={data.image} alt={data.name} className="h-14 w-14 shrink-0" rounded="rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{data.name}</div>
          <div className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] truncate">{data.email}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {data.plan && <Pill tone={data.plan === 'premium' ? 'green' : 'plain'}>{data.plan === 'premium' ? 'Premium' : 'Free'}</Pill>}
            {typeof data.followers === 'number' && <Pill><Users className="h-3 w-3" />{data.followers} followers</Pill>}
            {data.country && <Pill>{data.country}</Pill>}
          </div>
        </div>
      </div>
      {data.url && <div className="mt-3"><CardButton brand="spotify" href={data.url} icon={<ExternalLink className="h-3.5 w-3.5" />}>Open profile</CardButton></div>}
    </AppCard>
  );
}

// ─── 12. Playlist made or changed ───
function PlaylistCard({ data, args, text }: { data: any; args: any; text: string }) {
  const [listen, setListen] = useState(false);
  return (
    <AppCard brand="spotify" title={text}>
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
      {listen && data.uri && <div className="mt-3"><SpotifyPlayer uri={data.uri} tall /></div>}
      <div className="mt-3 flex gap-2">
        {data.uri && <CardButton brand="spotify" primary icon={<Play className="h-3.5 w-3.5" />} onClick={() => setListen((l) => !l)}>{listen ? 'Hide player' : 'Play here'}</CardButton>}
        {data.url && <CardButton brand="spotify" href={data.url} icon={<ExternalLink className="h-3.5 w-3.5" />}>Open in Spotify</CardButton>}
      </div>
    </AppCard>
  );
}

// ─── 13. Player actions (play, pause, next, volume…) ───
const ACTIONS: Record<string, { icon: React.ReactNode; text: (a: any) => string }> = {
  play: { icon: <Play className="h-[18px] w-[18px] fill-current" />, text: () => 'Playing' },
  pause: { icon: <Pause className="h-[18px] w-[18px]" />, text: () => 'Paused' },
  next: { icon: <SkipForward className="h-[18px] w-[18px]" />, text: () => 'Skipped to the next song' },
  previous: { icon: <SkipBack className="h-[18px] w-[18px]" />, text: () => 'Back to the previous song' },
  set_volume: { icon: <Volume2 className="h-[18px] w-[18px]" />, text: (a) => `Volume set to ${a.volume ?? 0}%` },
  set_shuffle: { icon: <Shuffle className="h-[18px] w-[18px]" />, text: (a) => `Shuffle ${a.state ? 'on' : 'off'}` },
  set_repeat: { icon: <Repeat className="h-[18px] w-[18px]" />, text: (a) => (a.repeat && a.repeat !== 'off' ? `Repeat ${a.repeat === 'track' ? 'this song' : 'on'}` : 'Repeat off') },
  add_to_queue: { icon: <ListPlus className="h-[18px] w-[18px]" />, text: () => 'Added to your queue' },
  transfer_playback: { icon: <MonitorSpeaker className="h-[18px] w-[18px]" />, text: () => 'Moved playback to the other device' },
  add_to_playlist: { icon: <ListPlus className="h-[18px] w-[18px]" />, text: (a) => `Added ${(a.uris || []).length || 'the'} song${(a.uris || []).length === 1 ? '' : 's'} to the playlist` },
  remove_from_playlist: { icon: <ListMusic className="h-[18px] w-[18px]" />, text: (a) => `Removed ${(a.uris || []).length || 'the'} song${(a.uris || []).length === 1 ? '' : 's'} from the playlist` },
  save_to_library: { icon: <Heart className="h-[18px] w-[18px] fill-current" />, text: () => 'Saved to your library' },
  remove_from_library: { icon: <HeartOff className="h-[18px] w-[18px]" />, text: () => 'Removed from your library' },
};

// ─── Which card for which operation ───
export function SpotifyResult({ args, data }: { args: any; data: any }) {
  const op = String(args?.operation || '');
  if (op === 'get_current_playback') return <NowPlayingCard data={data} />;
  if (op === 'search') return <SearchCard data={data} query={args.query} />;
  if (op === 'get_devices') return <DevicesCard devices={data?.devices || []} />;
  if (op === 'get_profile') return <ProfileCard data={data} />;
  if (op === 'list_playlists') return <MediaCarousel title="Your playlists" items={data?.playlists || []} kind="playlist" />;
  if (op === 'get_playlist_items') return <TrackList title="Playlist songs" tracks={(data?.items || []).filter(Boolean)} total={data?.total} />;
  if (op === 'get_saved_tracks') return <TrackList title="Liked songs" tracks={data?.tracks || []} total={data?.total} />;
  if (op === 'get_recently_played') return <TrackList title="Recently played" tracks={Array.isArray(data) ? data : []} />;
  if (op === 'get_top_items') {
    const items = Array.isArray(data) ? data : [];
    const range = args.time_range === 'short_term' ? 'last 4 weeks' : args.time_range === 'long_term' ? 'all time' : 'last 6 months';
    return args.type === 'artists' ? <MediaCarousel title={`Your top artists · ${range}`} items={items} kind="artist" /> : <TrackList title={`Your top songs · ${range}`} tracks={items} />;
  }
  if (op === 'create_playlist') return <PlaylistCard data={data || {}} args={args} text="Playlist created" />;
  if (op === 'update_playlist') return <PlaylistCard data={data || {}} args={args} text="Playlist updated" />;
  const action = ACTIONS[op];
  if (action) return <DoneLine brand="spotify" icon={action.icon} text={action.text(args)} />;
  return null;
}
