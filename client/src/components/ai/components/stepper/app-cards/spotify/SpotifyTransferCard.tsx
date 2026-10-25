// transfer_playback: done line.
import { SpotifyActionDone } from './SpotifyActionDone';
import { SpotifyDeviceIcon } from './SpotifyDeviceIcon';

export function SpotifyTransferCard(_: { args: any; data: any }) {
  return <SpotifyActionDone icon={<SpotifyDeviceIcon className="h-[18px] w-[18px]" />} text="Moved playback to the other device" />;
}
