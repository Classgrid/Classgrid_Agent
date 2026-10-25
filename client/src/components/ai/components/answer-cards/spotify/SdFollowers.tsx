// How many people follow the account
import React from 'react';
import { Users } from 'lucide-react';
import { SdBadge } from './SdBadge';
import { SdCount } from './SdCount';

export function SdFollowers({ n }: { n?: number }) {
  if (typeof n !== 'number') return null;
  return <SdBadge icon={<Users className="h-3 w-3" />}><SdCount n={n} one="follower" /></SdBadge>;
}
