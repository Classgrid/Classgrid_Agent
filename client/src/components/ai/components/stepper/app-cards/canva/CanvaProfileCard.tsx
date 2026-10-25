// get_profile: the connected Canva account (name and team)
import React from 'react';
import { AppCard } from '../shared';
import { CanvaAvatar } from './CanvaAvatar';

// ─── Profile ───
export function CanvaProfileCard({ data }: { data: any }) {
  const name = data?.profile?.display_name || 'Canva account';
  return (
    <AppCard brand="canva" title="Canva account">
      <div className="flex items-center gap-3">
        <CanvaAvatar name={name} big />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{name}</div>
          {data?.team_user?.team_id && <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a] truncate">Team {data.team_user.team_id}</div>}
        </div>
      </div>
    </AppCard>
  );
}
