// The Canva team the account belongs to
import React from 'react';
import { Users } from 'lucide-react';
import { CdBadge } from './CdBadge';

export function CdTeamTag({ team }: { team?: string }) {
  if (!team) return null;
  return <CdBadge icon={<Users className="h-3 w-3" />}>Team</CdBadge>;
}
