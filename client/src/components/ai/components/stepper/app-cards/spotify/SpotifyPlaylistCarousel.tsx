// Playlists carousel: cover, name, owner and number of songs.
import { SpotifyMediaCarousel } from './SpotifyMediaCarousel';
import { SpotifyMediaTile } from './SpotifyMediaTile';

type Playlist = { id?: string; name?: string; uri?: string; owner?: string; total?: number; image?: string; url?: string };

export function SpotifyPlaylistCarousel({ title = 'Playlists', items }: { title?: string; items: Playlist[] }) {
  return (
    <SpotifyMediaCarousel
      title={title}
      items={items}
      tallPlayer
      tile={(x, onPlay) => (
        <SpotifyMediaTile image={x.image} title={x.name} href={x.url} sub={[x.owner, typeof x.total === 'number' ? `${x.total} songs` : ''].filter(Boolean).join(' · ')} onPlay={onPlay} />
      )}
    />
  );
}
