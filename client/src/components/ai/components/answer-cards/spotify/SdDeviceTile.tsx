// One device Spotify can play on: icon, name, kind, "Playing here" with moving bars, and its volume
import React from 'react';
import { SdDeviceGlyph } from './SdDeviceGlyph';
import { SdEqualizer } from './SdEqualizer';
import { SdVolumeBar } from './SdVolumeBar';

export function SdDeviceTile({ device }: { device: any }) {
  const active = !!device?.is_active;
  return (
    <div className="flex items-center gap-3 rounded-xl px-1 py-1.5">
      <SdDeviceGlyph type={device?.type} active={active} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium text-slate-900 dark:text-white">{device?.name || 'Device'}</span>
        <span className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-[#9a9a9a]">{active ? <><SdEqualizer on /><span className="text-[#13843c] dark:text-[#1ed760]">Playing here</span></> : <span className="capitalize">{String(device?.type || '').toLowerCase()}</span>}</span>
      </div>
      <SdVolumeBar value={device?.volume_percent} />
    </div>
  );
}
