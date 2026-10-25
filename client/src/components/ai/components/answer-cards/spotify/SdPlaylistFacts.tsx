// A playlist's song count, total length and public/private
import React from 'react';
import { SdFactLine } from './SdFactLine';
import { SdCount } from './SdCount';
import { SdTotalDuration } from './SdTotalDuration';
import { SdPrivacyTag } from './SdPrivacyTag';
import { type SdTrackData } from './SdTrackItem';

export function SdPlaylistFacts({ total, tracks, isPublic }: { total?: number; tracks?: SdTrackData[]; isPublic?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SdFactLine items={[typeof total === 'number' ? <SdCount n={total} one="song" /> : null, tracks?.length ? <SdTotalDuration tracks={tracks} /> : null]} />
      <SdPrivacyTag isPublic={isPublic} />
    </div>
  );
}
