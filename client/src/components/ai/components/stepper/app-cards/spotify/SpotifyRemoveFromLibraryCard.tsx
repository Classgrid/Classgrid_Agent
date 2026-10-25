// remove_from_library: done line.
import { HeartOff } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyRemoveFromLibraryCard(_: { args: any; data: any }) {
  return <SpotifyActionDone icon={<HeartOff className="h-[18px] w-[18px]" />} text="Removed from your library" />;
}
