// previous: done line.
import { SkipBack } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyPreviousCard(_: { args: any; data: any }) {
  return <SpotifyActionDone icon={<SkipBack className="h-[18px] w-[18px]" />} text="Back to the previous song" />;
}
