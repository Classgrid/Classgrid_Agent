// One song shown big: cover, name, artists and Spotify's player
import React from 'react';
import { SdPlayerShell } from './SdPlayerShell';
import { SdBigArt } from './SdBigArt';
import { SdTrackHeadline } from './SdTrackHeadline';
import { SdFactLine } from './SdFactLine';
import { SdTime } from './SdTime';
import { SdEmbed } from './SdEmbed';
import { SdCopyLink } from './SdCopyLink';
import { type SdTrackData } from './SdTrackItem';

export function SdTrackShowcase({ track }: { track: SdTrackData }) {
  return (
    <SdPlayerShell art={track.image}>
      <div className="flex items-start gap-3.5">
        <SdBigArt src={track.image} alt={track.album} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <SdTrackHeadline name={track.name} url={track.url} artists={track.artists} />
          <SdFactLine items={[track.album, track.duration_ms ? <SdTime ms={track.duration_ms} /> : null]} />
        </div>
        <SdCopyLink url={track.url} />
      </div>
      <div className="mt-3"><SdEmbed uri={track.uri} /></div>
    </SdPlayerShell>
  );
}
