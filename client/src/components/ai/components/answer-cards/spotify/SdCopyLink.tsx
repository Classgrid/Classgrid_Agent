// Copies a Spotify link and shows a tick for a moment
import React, { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { SdActionIcon } from './SdActionIcon';

export function SdCopyLink({ url }: { url?: string }) {
  const [done, setDone] = useState(false);
  if (!url) return null;
  const copy = () => { try { void navigator.clipboard?.writeText(url); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } };
  return <SdActionIcon label={done ? 'Copied' : 'Copy link'} onClick={copy}>{done ? <Check className="h-4 w-4 text-[#1DB954]" /> : <Link2 className="h-4 w-4" />}</SdActionIcon>;
}
