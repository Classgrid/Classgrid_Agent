// get_playlist_items: the songs of one playlist.
import { SpotifyTrackList } from './SpotifyTrackList';

export function SpotifyPlaylistItemsCard({ data }: { args: any; data: any }) {
  return <SpotifyTrackList title="Playlist songs" tracks={(data?.items || []).filter(Boolean)} total={data?.total} />;
}
