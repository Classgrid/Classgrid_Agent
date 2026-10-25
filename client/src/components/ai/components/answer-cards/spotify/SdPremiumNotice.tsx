// A calm note when Spotify needs Premium (for the app owner, or to control playback)
import React from 'react';
import { Crown } from 'lucide-react';

export function SdPremiumNotice({ owner }: { owner?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-500/10">
      <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="text-[13px] text-amber-800 dark:text-amber-300">{owner ? 'Spotify needs Premium on the account that owns this app before it answers. It can take a few hours after upgrading.' : 'Playing, pausing and skipping need Spotify Premium and Spotify open on a device.'}</div>
    </div>
  );
}
