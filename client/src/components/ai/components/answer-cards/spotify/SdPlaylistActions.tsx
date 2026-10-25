// "Listen here" and "Open in Spotify" for a playlist or album
import React from 'react';
import { SdActionBar } from './SdActionBar';
import { SdListenButton } from './SdListenButton';
import { SdOpenSpotify } from './SdOpenSpotify';

export function SdPlaylistActions({ url, canListen, listening, onToggle }: { url?: string; canListen: boolean; listening: boolean; onToggle: () => void }) {
  return <SdActionBar>{canListen && <SdListenButton open={listening} onToggle={onToggle} />}<SdOpenSpotify href={url} /></SdActionBar>;
}
