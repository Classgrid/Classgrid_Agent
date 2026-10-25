// Shuffle and repeat, shown only when they are on
import React from 'react';
import { Repeat, Repeat1, Shuffle } from 'lucide-react';
import { SdBadge } from './SdBadge';
import { SdBadgeGroup } from './SdBadgeGroup';

export function SdModeBadges({ shuffle, repeat }: { shuffle?: boolean; repeat?: string }) {
  return (
    <SdBadgeGroup>
      {shuffle && <SdBadge tone="green" icon={<Shuffle className="h-3 w-3" />}>Shuffle</SdBadge>}
      {repeat && repeat !== 'off' && <SdBadge tone="green" icon={repeat === 'track' ? <Repeat1 className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}>{repeat === 'track' ? 'Repeat song' : 'Repeat'}</SdBadge>}
    </SdBadgeGroup>
  );
}
