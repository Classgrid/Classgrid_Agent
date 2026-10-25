// create_playlist: the new playlist.
import { SpotifyPlaylistSummary } from './SpotifyPlaylistSummary';

export function SpotifyCreatePlaylistCard({ args, data }: { args: any; data: any }) {
  return <SpotifyPlaylistSummary data={data || {}} args={args} title="Playlist created" />;
}
