// set_shuffle: done line (on / off).
import { Shuffle } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyShuffleCard({ args }: { args: any; data: any }) {
  return <SpotifyActionDone icon={<Shuffle className="h-[18px] w-[18px]" />} text={`Shuffle ${args.state ? 'on' : 'off'}`} />;
}
