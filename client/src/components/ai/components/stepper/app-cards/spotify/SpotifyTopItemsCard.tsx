// get_top_items: top artists (carousel) or top songs (list) for the chosen time range.
import { SpotifyArtistCarousel } from './SpotifyArtistCarousel';
import { SpotifyTrackList } from './SpotifyTrackList';

export function SpotifyTopItemsCard({ args, data }: { args: any; data: any }) {
  const items = Array.isArray(data) ? data : [];
  const range = args.time_range === 'short_term' ? 'last 4 weeks' : args.time_range === 'long_term' ? 'all time' : 'last 6 months';
  return args.type === 'artists'
    ? <SpotifyArtistCarousel title={`Your top artists · ${range}`} items={items} />
    : <SpotifyTrackList title={`Your top songs · ${range}`} tracks={items} />;
}
