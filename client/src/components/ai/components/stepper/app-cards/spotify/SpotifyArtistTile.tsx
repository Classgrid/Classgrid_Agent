// Artist tile: round picture, name and up to 2 genres.
import { SpotifyMediaTile } from './SpotifyMediaTile';

export type SpotifyArtist = { id?: string; name?: string; uri?: string; genres?: string[]; image?: string; url?: string };

export function SpotifyArtistTile({ artist, onPlay }: { artist: SpotifyArtist; onPlay?: () => void }) {
  return (
    <SpotifyMediaTile
      image={artist.image}
      title={artist.name}
      round
      href={artist.url}
      sub={(artist.genres || []).slice(0, 2).join(', ')}
      onPlay={onPlay}
    />
  );
}
