// Spotify plan badge: green "Premium" or plain "Free".
import { Pill } from '../shared';

export function SpotifyPlanBadge({ plan }: { plan?: string }) {
  if (!plan) return null;
  return <Pill tone={plan === 'premium' ? 'green' : 'plain'}>{plan === 'premium' ? 'Premium' : 'Free'}</Pill>;
}
