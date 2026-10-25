// One device row: sign, name, type and volume; "Playing here" on the active one.
import { cn } from '@/lib/utils';
import { Pill } from '../shared';
import { SpotifyDeviceIcon } from './SpotifyDeviceIcon';

export type SpotifyDevice = { id?: string; name?: string; type?: string; is_active?: boolean; volume_percent?: number };

export function SpotifyDeviceRow({ device: d }: { device: SpotifyDevice }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-1.5 py-1.5">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', d.is_active ? 'bg-[#1DB954]/15 text-[#13843c] dark:text-[#1ed760]' : 'bg-slate-100 dark:bg-[#262626] text-slate-500 dark:text-[#9a9a9a]')}>
        <SpotifyDeviceIcon type={d.type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-slate-900 dark:text-white truncate">{d.name}</div>
        <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">{d.type}{typeof d.volume_percent === 'number' ? ` · ${d.volume_percent}% volume` : ''}</div>
      </div>
      {d.is_active && <Pill tone="green">Playing here</Pill>}
    </div>
  );
}
