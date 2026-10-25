// update_playlist: the changed playlist.
import { SpotifyPlaylistSummary } from './SpotifyPlaylistSummary';

export function SpotifyUpdatePlaylistCard({ args, data }: { args: any; data: any }) {
  return <SpotifyPlaylistSummary data={data || {}} args={args} title="Playlist updated" />;
}
