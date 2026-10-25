// The connected Spotify account: photo, name, full email, plan, country and followers
import React from 'react';
import { SdProfileAvatar } from './SdProfileAvatar';
import { SdHeading } from './SdHeading';
import { SdSubheading } from './SdSubheading';
import { SdBadgeGroup } from './SdBadgeGroup';
import { SdPlanTag } from './SdPlanTag';
import { SdCountryTag } from './SdCountryTag';
import { SdFollowers } from './SdFollowers';
import { SdCopyLink } from './SdCopyLink';

export function SdProfileCard({ profile }: { profile: any }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-[#2a2a2a] dark:bg-[#1c1c1c]">
      <SdProfileAvatar src={profile?.image} name={profile?.name} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="min-w-0"><SdHeading href={profile?.url}>{profile?.name || 'Spotify account'}</SdHeading>{profile?.email && <SdSubheading>{profile.email}</SdSubheading>}</div>
        <SdBadgeGroup><SdPlanTag plan={profile?.plan} /><SdCountryTag country={profile?.country} /><SdFollowers n={profile?.followers} /></SdBadgeGroup>
      </div>
      <SdCopyLink url={profile?.url} />
    </div>
  );
}
