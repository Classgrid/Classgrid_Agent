// The connected Canva account
import React from 'react';
import { CdIdentityAvatar } from './CdIdentityAvatar';
import { CdHeading } from './CdHeading';
import { CdSubheading } from './CdSubheading';
import { CdBadgeGroup } from './CdBadgeGroup';
import { CdTeamTag } from './CdTeamTag';

export function CdIdentity({ profile }: { profile: any }) {
  const name = profile?.profile?.display_name || 'Canva account';
  return (
    <div className="flex items-center gap-3">
      <CdIdentityAvatar name={name} />
      <div className="flex min-w-0 flex-col gap-1">
        <CdHeading>{name}</CdHeading>
        <CdSubheading>Connected Canva account</CdSubheading>
        <CdBadgeGroup><CdTeamTag team={profile?.team_user?.team_id} /></CdBadgeGroup>
      </div>
    </div>
  );
}
