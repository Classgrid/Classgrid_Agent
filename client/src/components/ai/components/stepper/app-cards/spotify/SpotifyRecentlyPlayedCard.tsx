// get_recently_played: songs played lately, with the day each was played.
import { SpotifyTrackList } from './SpotifyTrackList';

export function SpotifyRecentlyPlayedCard({ data }: { args: any; data: any }) {
  return <SpotifyTrackList title="Recently played" tracks={Array.isArray(data) ? data : []} />;
}
