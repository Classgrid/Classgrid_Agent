// Spotify display in the AI's answer: collects what the Spotify steps of this answer produced and shows the finished results
import React from 'react';
import { SdDisplay, type SpotifyDisplayData } from './SdDisplay';

/** A step's result as data (tool results arrive as JSON text; an error arrives as plain text) */
function read(result: unknown): { data?: any; error?: string } {
  if (result && typeof result === 'object') return { data: result };
  const raw = String(result ?? '').trim();
  try { return { data: JSON.parse(raw) }; } catch { return /^error\b/i.test(raw) ? { error: raw.replace(/^error:\s*/i, '') } : {}; }
}

const DONE: Record<string, (a: any) => string> = {
  play: () => 'Playing now',
  pause: () => 'Paused',
  next: () => 'Skipped to the next song',
  previous: () => 'Back to the previous song',
  set_volume: (a) => 'Volume set to ' + Math.max(0, Math.min(100, Number(a?.volume) || 0)) + '%',
  set_shuffle: (a) => (a?.state ? 'Shuffle on' : 'Shuffle off'),
  set_repeat: (a) => (a?.repeat && a.repeat !== 'off' ? 'Repeat ' + (a.repeat === 'track' ? 'this song' : 'on') : 'Repeat off'),
  add_to_queue: () => 'Added to the queue',
  transfer_playback: () => 'Music moved to the other device',
  add_to_playlist: () => 'Added to the playlist',
  remove_from_playlist: () => 'Removed from the playlist',
  update_playlist: () => 'Playlist updated',
  save_to_library: () => 'Saved to your library',
  remove_from_library: () => 'Removed from your library',
};

/** Turns this answer's Spotify steps into what the display shows (finished results only; a later step wins) */
export function collectSpotify(steps: any[]): SpotifyDisplayData {
  const out: SpotifyDisplayData = { tracks: [], trackTitle: 'Songs', artists: [], albums: [], playlists: [], errors: [] };
  for (const s of steps) {
    if (s?.type !== 'tool' || s.tool !== 'spotify_connector') continue;
    const op = String(s.args?.operation || '');
    const { data, error } = read(s.result);
    if (error || s.status === 'error') {
      const text = error || String(s.result || 'Spotify could not do this.');
      if (/premium/i.test(text)) out.premium = /owner of the app/i.test(text) ? 'owner' : 'player';
      else out.errors.push(text);
      continue;
    }
    if (s.status !== 'success' || !data) continue;
    if (op === 'get_profile') out.profile = data;
    else if (op === 'search') {
      if (data.tracks) { out.tracks = data.tracks.filter(Boolean); out.trackTitle = 'Songs'; out.liked = false; out.tracksAsked = true; }
      if (data.artists) { out.artists = data.artists; out.topArtists = false; }
      if (data.albums) out.albums = data.albums;
      if (data.playlists) out.playlists = data.playlists;
    } else if (op === 'get_current_playback') out.playback = data;
    else if (op === 'get_devices') out.devices = Array.isArray(data.devices) ? data.devices : [];
    else if (op === 'list_playlists') { out.playlists = data.playlists || []; out.playlistsTotal = data.total; }
    else if (op === 'get_playlist_items') {
      const id = s.args?.playlist_id;
      const known = out.playlists.find((p) => p.id === id) || (out.playlist?.playlist?.id === id ? out.playlist?.playlist : undefined);
      out.playlist = { playlist: known || { id, uri: id ? 'spotify:playlist:' + id : undefined, url: id ? 'https://open.spotify.com/playlist/' + id : undefined }, items: (data.items || []).filter(Boolean), total: data.total };
    } else if (op === 'create_playlist') { out.playlist = { playlist: { ...data, total: 0 }, items: [] }; out.highlight = 'Playlist created'; }
    else if (op === 'get_top_items') {
      out.timeRange = s.args?.time_range || 'medium_term';
      if (s.args?.type === 'artists') { out.artists = Array.isArray(data) ? data : []; out.topArtists = true; }
      else { out.tracks = Array.isArray(data) ? data.filter(Boolean) : []; out.trackTitle = 'Your top songs'; out.liked = false; out.tracksAsked = true; }
    } else if (op === 'get_recently_played') { out.tracks = Array.isArray(data) ? data.filter(Boolean) : []; out.trackTitle = 'Recently played'; out.liked = false; out.tracksAsked = true; }
    else if (op === 'get_saved_tracks') { out.tracks = (data.tracks || []).filter(Boolean); out.tracksTotal = data.total; out.trackTitle = 'Liked songs'; out.liked = true; out.tracksAsked = true; }
    else if (DONE[op]) out.highlight = DONE[op]!(s.args);
  }
  return out;
}

function hasSomething(d: SpotifyDisplayData) {
  return !!(d.profile || d.playback || d.devices || d.tracks.length || d.tracksAsked || d.artists.length || d.albums.length || d.playlists.length || d.playlist || d.highlight || d.premium || d.errors.length);
}

export function SpotifyDisplay({ steps }: { steps: any[] }) {
  if (!steps?.some((s) => s?.type === 'tool' && s.tool === 'spotify_connector')) return null;
  const data = collectSpotify(steps);
  if (!hasSomething(data)) return null;
  return <SdDisplay data={data} />;
}
