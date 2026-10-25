// next: done line.
import { SkipForward } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyNextCard(_: { args: any; data: any }) {
  return <SpotifyActionDone icon={<SkipForward className="h-[18px] w-[18px]" />} text="Skipped to the next song" />;
}
