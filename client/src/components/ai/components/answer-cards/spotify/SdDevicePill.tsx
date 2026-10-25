// Which device the music is playing on
import React from 'react';
import { MonitorSpeaker } from 'lucide-react';
import { SdBadge } from './SdBadge';

export function SdDevicePill({ name }: { name?: string }) {
  if (!name) return null;
  return <SdBadge icon={<MonitorSpeaker className="h-3 w-3" />}>{name}</SdBadge>;
}
