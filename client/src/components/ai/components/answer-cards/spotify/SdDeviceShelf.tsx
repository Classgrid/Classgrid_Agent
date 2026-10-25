// The devices Spotify can play on; a calm note when none is open
import React from 'react';
import { MonitorSpeaker } from 'lucide-react';
import { SdDeviceTile } from './SdDeviceTile';
import { SdEmpty } from './SdEmpty';

export function SdDeviceShelf({ devices }: { devices: any[] }) {
  if (!devices.length) return <SdEmpty icon={MonitorSpeaker} text="No device is open" sub="Open Spotify on your phone or computer, then ask again." />;
  return <div className="flex flex-col">{devices.map((d, i) => <SdDeviceTile key={(d?.id || '') + i} device={d} />)}</div>;
}
