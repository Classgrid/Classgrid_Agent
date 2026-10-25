// "Nothing here" line (no songs, nothing playing, no devices…), music sign by default.
import React from 'react';
import { Music2 } from 'lucide-react';
import { DoneLine } from '../shared';

export function SpotifyEmptyState({ icon, text, sub }: { icon?: React.ReactNode; text: string; sub?: string }) {
  return <DoneLine brand="spotify" icon={icon ?? <Music2 className="h-[18px] w-[18px]" />} text={text} sub={sub} />;
}
