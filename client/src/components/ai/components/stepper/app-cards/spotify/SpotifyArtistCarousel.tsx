// Artists carousel: round artist tiles (short player under it).
import { SpotifyMediaCarousel } from './SpotifyMediaCarousel';
import { SpotifyArtistTile, type SpotifyArtist } from './SpotifyArtistTile';

export function SpotifyArtistCarousel({ title = 'Artists', items }: { title?: string; items: SpotifyArtist[] }) {
  return (
    <SpotifyMediaCarousel
      title={title}
      items={items}
      tile={(x, onPlay) => <SpotifyArtistTile artist={x} onPlay={onPlay} />}
    />
  );
}
