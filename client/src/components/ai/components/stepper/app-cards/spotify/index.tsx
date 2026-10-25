// Spotify cards for the spotify_connector tool: one card per operation (the files next to this one).
import React from 'react';
import { SpotifyProfileCard } from './SpotifyProfileCard';
import { SpotifySearchCard } from './SpotifySearchCard';
import { SpotifyNowPlayingCard } from './SpotifyNowPlayingCard';
import { SpotifyDevicesCard } from './SpotifyDevicesCard';
import { SpotifyPlayCard } from './SpotifyPlayCard';
import { SpotifyPauseCard } from './SpotifyPauseCard';
import { SpotifyNextCard } from './SpotifyNextCard';
import { SpotifyPreviousCard } from './SpotifyPreviousCard';
import { SpotifyVolumeCard } from './SpotifyVolumeCard';
import { SpotifyShuffleCard } from './SpotifyShuffleCard';
import { SpotifyRepeatCard } from './SpotifyRepeatCard';
import { SpotifyQueueCard } from './SpotifyQueueCard';
import { SpotifyTransferCard } from './SpotifyTransferCard';
import { SpotifyPlaylistsCard } from './SpotifyPlaylistsCard';
import { SpotifyPlaylistItemsCard } from './SpotifyPlaylistItemsCard';
import { SpotifyCreatePlaylistCard } from './SpotifyCreatePlaylistCard';
import { SpotifyAddToPlaylistCard } from './SpotifyAddToPlaylistCard';
import { SpotifyRemoveFromPlaylistCard } from './SpotifyRemoveFromPlaylistCard';
import { SpotifyUpdatePlaylistCard } from './SpotifyUpdatePlaylistCard';
import { SpotifyTopItemsCard } from './SpotifyTopItemsCard';
import { SpotifyRecentlyPlayedCard } from './SpotifyRecentlyPlayedCard';
import { SpotifySavedTracksCard } from './SpotifySavedTracksCard';
import { SpotifySaveToLibraryCard } from './SpotifySaveToLibraryCard';
import { SpotifyRemoveFromLibraryCard } from './SpotifyRemoveFromLibraryCard';

type CardProps = { args: any; data: any };

// Which card for which operation
const CARDS: Record<string, (p: CardProps) => React.ReactNode> = {
  get_profile: SpotifyProfileCard,
  search: SpotifySearchCard,
  get_current_playback: SpotifyNowPlayingCard,
  get_devices: SpotifyDevicesCard,
  play: SpotifyPlayCard,
  pause: SpotifyPauseCard,
  next: SpotifyNextCard,
  previous: SpotifyPreviousCard,
  set_volume: SpotifyVolumeCard,
  set_shuffle: SpotifyShuffleCard,
  set_repeat: SpotifyRepeatCard,
  add_to_queue: SpotifyQueueCard,
  transfer_playback: SpotifyTransferCard,
  list_playlists: SpotifyPlaylistsCard,
  get_playlist_items: SpotifyPlaylistItemsCard,
  create_playlist: SpotifyCreatePlaylistCard,
  add_to_playlist: SpotifyAddToPlaylistCard,
  remove_from_playlist: SpotifyRemoveFromPlaylistCard,
  update_playlist: SpotifyUpdatePlaylistCard,
  get_top_items: SpotifyTopItemsCard,
  get_recently_played: SpotifyRecentlyPlayedCard,
  get_saved_tracks: SpotifySavedTracksCard,
  save_to_library: SpotifySaveToLibraryCard,
  remove_from_library: SpotifyRemoveFromLibraryCard,
};

export function SpotifyResult({ args, data }: { args: any; data: any }) {
  const Card = CARDS[String(args?.operation || '')];
  return Card ? <Card args={args} data={data} /> : null;
}
