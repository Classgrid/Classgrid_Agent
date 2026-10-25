// get_devices: every phone, computer and speaker with Spotify open.
import { AppCard } from '../shared';
import { SpotifyDeviceRow, type SpotifyDevice } from './SpotifyDeviceRow';
import { SpotifyDeviceIcon } from './SpotifyDeviceIcon';
import { SpotifyEmptyState } from './SpotifyEmptyState';

export function SpotifyDevicesCard({ data }: { args: any; data: any }) {
  const devices: SpotifyDevice[] = data?.devices || [];
  if (!devices.length) return <SpotifyEmptyState icon={<SpotifyDeviceIcon className="h-[18px] w-[18px]" />} text="No devices online" sub="Open Spotify on a phone, computer or speaker." />;
  return (
    <AppCard brand="spotify" title="Your devices">
      <div className="flex flex-col gap-1">
        {devices.map((d) => <SpotifyDeviceRow key={d.id ?? d.name} device={d} />)}
      </div>
    </AppCard>
  );
}
