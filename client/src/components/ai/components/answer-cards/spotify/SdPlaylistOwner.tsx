// "By Nikhil" under a playlist name
import React from 'react';
import { SdSubheading } from './SdSubheading';

export function SdPlaylistOwner({ owner }: { owner?: string }) {
  if (!owner) return null;
  return <SdSubheading>By {owner}</SdSubheading>;
}
