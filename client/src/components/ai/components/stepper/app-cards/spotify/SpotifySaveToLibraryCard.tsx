// save_to_library: done line.
import { Heart } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifySaveToLibraryCard(_: { args: any; data: any }) {
  return <SpotifyActionDone icon={<Heart className="h-[18px] w-[18px] fill-current" />} text="Saved to your library" />;
}
