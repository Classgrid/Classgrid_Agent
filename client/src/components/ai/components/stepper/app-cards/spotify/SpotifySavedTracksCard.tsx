// get_saved_tracks: liked songs, with the day each was saved.
import { SpotifyTrackList } from './SpotifyTrackList';

export function SpotifySavedTracksCard({ data }: { args: any; data: any }) {
  return <SpotifyTrackList title="Liked songs" tracks={data?.tracks || []} total={data?.total} />;
}
