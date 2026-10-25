// The display card's top line: Spotify logo, "Your Spotify", and the time range of a top list
import React from 'react';
import { SdTopBar } from './SdTopBar';
import { SdTimeRangeTag } from './SdTimeRangeTag';

export function SdResultHeader({ timeRange }: { timeRange?: string }) {
  return <SdTopBar label="Your Spotify" right={<SdTimeRangeTag range={timeRange} />} />;
}
