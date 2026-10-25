// remove_from_playlist: done line with how many songs were removed.
import { ListMusic } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyRemoveFromPlaylistCard({ args }: { args: any; data: any }) {
  const n = (args.uris || []).length;
  return <SpotifyActionDone icon={<ListMusic className="h-[18px] w-[18px]" />} text={`Removed ${n || 'the'} song${n === 1 ? '' : 's'} from the playlist`} />;
}
