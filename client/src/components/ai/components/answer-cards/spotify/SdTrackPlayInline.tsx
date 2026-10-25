// The player that opens under a song row
import React from 'react';
import { SdEmbed } from './SdEmbed';

export function SdTrackPlayInline({ uri }: { uri?: string }) {
  return <div className="px-1 pb-2"><SdEmbed uri={uri} /></div>;
}
