// Spotify's own player (open.spotify.com/embed): plays in the chat, full songs when signed in to Spotify here
import React, { useState } from 'react';
import { SdShimmer } from './SdShimmer';

/** "spotify:track:abc" or an open.spotify.com link -> { type, id } */
export function sdParseUri(uri?: string): { type: string; id: string } | null {
  const s = String(uri || '').trim();
  const m = s.match(/^spotify:(track|album|artist|playlist|episode|show):([A-Za-z0-9]+)$/) || s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|artist|playlist|episode|show)\/([A-Za-z0-9]+)/);
  return m && m[1] && m[2] ? { type: m[1], id: m[2] } : null;
}

export function SdEmbed({ uri, tall }: { uri?: string; tall?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const ref = sdParseUri(uri);
  if (!ref) return null;
  const height = tall ? 352 : 152;
  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ height }}>
      {!loaded && <SdShimmer className="absolute inset-0 rounded-xl" />}
      <iframe title="Spotify player" src={'https://open.spotify.com/embed/' + ref.type + '/' + ref.id + '?utm_source=classgrid'} width="100%" height={height} loading="lazy" onLoad={() => setLoaded(true)} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="block rounded-xl border-0" />
    </div>
  );
}
