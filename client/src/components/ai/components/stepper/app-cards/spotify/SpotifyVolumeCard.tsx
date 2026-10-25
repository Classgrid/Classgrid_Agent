// set_volume: done line with the new volume.
import { Volume2 } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyVolumeCard({ args }: { args: any; data: any }) {
  return <SpotifyActionDone icon={<Volume2 className="h-[18px] w-[18px]" />} text={`Volume set to ${args.volume ?? 0}%`} />;
}
