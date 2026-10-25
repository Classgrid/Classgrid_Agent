// The real player: Spotify's official embed (plays in the chat; full songs when signed in to Spotify in this browser).

/** "spotify:track:abc" → { type: "track", id: "abc" } */
function fromUri(uri?: string) {
  const m = String(uri || '').match(/^spotify:(track|album|artist|playlist|episode|show):([A-Za-z0-9]+)$/);
  return m ? { type: m[1], id: m[2] } : null;
}

export function SpotifyEmbedPlayer({ uri, tall }: { uri?: string; tall?: boolean }) {
  const ref = fromUri(uri);
  if (!ref) return null;
  return (
    <iframe
      title="Spotify player"
      src={`https://open.spotify.com/embed/${ref.type}/${ref.id}?utm_source=classgrid`}
      width="100%"
      height={tall ? 352 : 152}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="block rounded-xl border-0"
    />
  );
}
