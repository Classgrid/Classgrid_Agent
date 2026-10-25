// play: done line.
import { Play } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyPlayCard(_: { args: any; data: any }) {
  return <SpotifyActionDone icon={<Play className="h-[18px] w-[18px] fill-current" />} text="Playing" />;
}
