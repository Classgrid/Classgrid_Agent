// "Open in Spotify"
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { SdActionSecondary } from './SdActionSecondary';

export function SdOpenSpotify({ href }: { href?: string }) {
  if (!href) return null;
  return <SdActionSecondary href={href} icon={<ExternalLink className="h-3.5 w-3.5" />}>Open in Spotify</SdActionSecondary>;
}
