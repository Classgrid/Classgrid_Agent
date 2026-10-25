// add_to_playlist: done line with how many songs were added.
import { ListPlus } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyAddToPlaylistCard({ args }: { args: any; data: any }) {
  const n = (args.uris || []).length;
  return <SpotifyActionDone icon={<ListPlus className="h-[18px] w-[18px]" />} text={`Added ${n || 'the'} song${n === 1 ? '' : 's'} to the playlist`} />;
}
