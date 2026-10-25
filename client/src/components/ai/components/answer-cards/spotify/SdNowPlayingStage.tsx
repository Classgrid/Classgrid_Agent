// What is playing right now, shown big: cover, song, live minutes bar, device and modes, and a player to listen here
import React, { useState } from 'react';
import { SdPlayerShell } from './SdPlayerShell';
import { SdBigArt } from './SdBigArt';
import { SdTrackHeadline } from './SdTrackHeadline';
import { SdPlayState } from './SdPlayState';
import { SdLiveProgress } from './SdLiveProgress';
import { SdDevicePill } from './SdDevicePill';
import { SdVolumeBar } from './SdVolumeBar';
import { SdModeBadges } from './SdModeBadges';
import { SdActionBar } from './SdActionBar';
import { SdListenButton } from './SdListenButton';
import { SdOpenSpotify } from './SdOpenSpotify';
import { SdEmbed } from './SdEmbed';

export function SdNowPlayingStage({ playback }: { playback: any }) {
  const [listen, setListen] = useState(false);
  const t = playback?.track || {};
  return (
    <SdPlayerShell art={t.image}>
      <div className="flex gap-3.5">
        <SdBigArt src={t.image} alt={t.album} />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1"><SdPlayState playing={playback?.playing} /><SdTrackHeadline name={t.name} url={t.url} artists={t.artists} album={t.album} /></div>
          <SdLiveProgress progress={playback?.progress_ms} duration={t.duration_ms} playing={playback?.playing} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><SdDevicePill name={playback?.device} /><SdVolumeBar value={playback?.volume} /><SdModeBadges shuffle={playback?.shuffle} repeat={playback?.repeat} /></div>
      {listen && <div className="mt-3"><SdEmbed uri={t.uri} /></div>}
      <div className="mt-3"><SdActionBar><SdListenButton open={listen} onToggle={() => setListen((l) => !l)} /><SdOpenSpotify href={t.url} /></SdActionBar></div>
    </SdPlayerShell>
  );
}
