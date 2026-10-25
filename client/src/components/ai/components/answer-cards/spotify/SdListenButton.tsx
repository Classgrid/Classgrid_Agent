// "Listen here" opens Spotify's player inside the chat
import React from 'react';
import { Play, X } from 'lucide-react';
import { SdActionPrimary } from './SdActionPrimary';

export function SdListenButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return <SdActionPrimary onClick={onToggle} icon={open ? <X className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}>{open ? 'Close player' : 'Listen here'}</SdActionPrimary>;
}
