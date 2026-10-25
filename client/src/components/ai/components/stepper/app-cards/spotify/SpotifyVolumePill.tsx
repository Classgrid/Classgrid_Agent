// Small volume badge (speaker sign and %).
import { Volume2 } from 'lucide-react';
import { Pill } from '../shared';

export function SpotifyVolumePill({ volume }: { volume: number }) {
  return <Pill><Volume2 className="h-3 w-3" />{volume}%</Pill>;
}
