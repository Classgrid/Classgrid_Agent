// Albums carousel: picture, name, artists and year.
import { SpotifyMediaCarousel } from './SpotifyMediaCarousel';
import { SpotifyMediaTile } from './SpotifyMediaTile';

type Album = { id?: string; name?: string; uri?: string; artists?: string; release_date?: string; image?: string; url?: string };

export function SpotifyAlbumCarousel({ title = 'Albums', items }: { title?: string; items: Album[] }) {
  return (
    <SpotifyMediaCarousel
      title={title}
      items={items}
      tallPlayer
      tile={(x, onPlay) => (
        <SpotifyMediaTile image={x.image} title={x.name} href={x.url} sub={[x.artists, x.release_date?.slice(0, 4)].filter(Boolean).join(' · ')} onPlay={onPlay} />
      )}
    />
  );
}
