// search: songs first, then albums, artists and playlists.
import { SpotifyTrackList } from './SpotifyTrackList';
import { SpotifyAlbumCarousel } from './SpotifyAlbumCarousel';
import { SpotifyArtistCarousel } from './SpotifyArtistCarousel';
import { SpotifyPlaylistCarousel } from './SpotifyPlaylistCarousel';
import { SpotifyEmptyState } from './SpotifyEmptyState';

export function SpotifySearchCard({ args, data }: { args: any; data: any }) {
  const query: string | undefined = args.query;
  const parts = [
    data.tracks?.length ? <SpotifyTrackList key="t" title={query ? `Songs for "${query}"` : 'Songs'} tracks={data.tracks} /> : null,
    data.albums?.length ? <SpotifyAlbumCarousel key="al" items={data.albums} /> : null,
    data.artists?.length ? <SpotifyArtistCarousel key="ar" items={data.artists} /> : null,
    data.playlists?.length ? <SpotifyPlaylistCarousel key="p" items={data.playlists} /> : null,
  ].filter(Boolean);
  if (!parts.length) return <SpotifyEmptyState text="Nothing found" sub={query} />;
  return <div className="flex flex-col gap-2.5">{parts}</div>;
}
