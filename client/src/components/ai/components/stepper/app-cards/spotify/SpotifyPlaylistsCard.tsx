// list_playlists: the user's playlists as a carousel.
import { SpotifyPlaylistCarousel } from './SpotifyPlaylistCarousel';

export function SpotifyPlaylistsCard({ data }: { args: any; data: any }) {
  return <SpotifyPlaylistCarousel title="Your playlists" items={data?.playlists || []} />;
}
