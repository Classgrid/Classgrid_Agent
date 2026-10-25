// set_repeat: done line (this song / on / off).
import { Repeat } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyRepeatCard({ args }: { args: any; data: any }) {
  const text = args.repeat && args.repeat !== 'off' ? `Repeat ${args.repeat === 'track' ? 'this song' : 'on'}` : 'Repeat off';
  return <SpotifyActionDone icon={<Repeat className="h-[18px] w-[18px]" />} text={text} />;
}
