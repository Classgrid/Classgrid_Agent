// Secondary button that opens the song / playlist / profile on open.spotify.com in a new tab.
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { CardButton } from '../shared';

export function SpotifyOpenButton({ href, children = 'Open in Spotify' }: { href?: string; children?: React.ReactNode }) {
  if (!href) return null;
  return <CardButton brand="spotify" href={href} icon={<ExternalLink className="h-3.5 w-3.5" />}>{children}</CardButton>;
}
