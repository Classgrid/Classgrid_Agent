// Spotify's tall player for a whole playlist or album, inside the chat
import React from 'react';
import { SdEmbed } from './SdEmbed';

export function SdPlaylistPlayer({ uri }: { uri?: string }) {
  return <SdEmbed uri={uri} tall />;
}
