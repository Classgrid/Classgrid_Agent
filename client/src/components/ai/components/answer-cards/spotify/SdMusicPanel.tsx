// Songs: what is playing now, one song big, or a list (top, recent, liked, found), and the devices
import React from 'react';
import { Disc3 } from 'lucide-react';
import { SdNowPlayingStage } from './SdNowPlayingStage';
import { SdSpinningDisc } from './SdSpinningDisc';
import { SdTrackShowcase } from './SdTrackShowcase';
import { SdSection } from './SdSection';
import { SdTracklist } from './SdTracklist';
import { SdTotalDuration } from './SdTotalDuration';
import { SdCount } from './SdCount';
import { SdDeviceShelf } from './SdDeviceShelf';
import { SdDivider } from './SdDivider';
import { SdEmpty } from './SdEmpty';
import { SdTimeAgo } from './SdTimeAgo';
import { type SpotifyDisplayData } from './SdDisplay';

export function SdMusicPanel({ data }: { data: SpotifyDisplayData }) {
  const pb = data.playback;
  const lastPlayed = data.tracks[0]?.played_at;
  return (
    <div className="flex flex-col gap-3.5">
      {pb?.track ? <SdNowPlayingStage playback={pb} /> : pb && (
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-[#2a2a2a] dark:bg-[#1c1c1c]">
          <SdSpinningDisc playing={false} />
          <div className="text-[13.5px] text-slate-600 dark:text-[#b5b5b5]">{pb.note || 'Nothing is playing right now.'}</div>
        </div>
      )}
      {data.tracks.length === 1 && data.tracks[0] ? <SdTrackShowcase track={data.tracks[0]} /> : data.tracks.length > 1 && (
        <SdSection
          title={data.trackTitle}
          right={<span className="text-[11.5px] text-slate-400 dark:text-[#7d7d7d]">{lastPlayed ? <SdTimeAgo value={lastPlayed} /> : typeof data.tracksTotal === 'number' && data.tracksTotal > data.tracks.length ? <SdCount n={data.tracksTotal} one="song" /> : <SdTotalDuration tracks={data.tracks} />}</span>}
        >
          <SdTracklist tracks={data.tracks} liked={data.liked} />
        </SdSection>
      )}
      {data.tracksAsked && !data.tracks.length && <SdEmpty icon={Disc3} text="No songs found" />}
      {data.devices && <>{(pb || data.tracks.length > 0) && <SdDivider />}<SdSection title="Devices"><SdDeviceShelf devices={data.devices} /></SdSection></>}
    </div>
  );
}
