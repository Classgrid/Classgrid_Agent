// Main green button: "Play here" opens the player in the card, "Hide player" closes it.
import { Play } from 'lucide-react';
import { CardButton } from '../shared';

export function SpotifyPlayHereButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return <CardButton brand="spotify" primary icon={<Play className="h-3.5 w-3.5" />} onClick={onToggle}>{open ? 'Hide player' : 'Play here'}</CardButton>;
}
