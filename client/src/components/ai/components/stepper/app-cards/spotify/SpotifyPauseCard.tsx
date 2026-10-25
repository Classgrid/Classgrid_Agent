// pause: done line.
import { Pause } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyPauseCard(_: { args: any; data: any }) {
  return <SpotifyActionDone icon={<Pause className="h-[18px] w-[18px]" />} text="Paused" />;
}
