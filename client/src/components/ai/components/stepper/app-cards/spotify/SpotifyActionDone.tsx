// "Done" line for player and library actions that send no data back (paused, skipped, saved…).
import React from 'react';
import { DoneLine } from '../shared';

export function SpotifyActionDone({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return <DoneLine brand="spotify" icon={icon} text={text} sub={sub} />;
}
