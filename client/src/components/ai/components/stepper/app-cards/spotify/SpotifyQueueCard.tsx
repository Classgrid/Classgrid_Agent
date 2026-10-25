// add_to_queue: done line.
import { ListPlus } from 'lucide-react';
import { SpotifyActionDone } from './SpotifyActionDone';

export function SpotifyQueueCard(_: { args: any; data: any }) {
  return <SpotifyActionDone icon={<ListPlus className="h-[18px] w-[18px]" />} text="Added to your queue" />;
}
