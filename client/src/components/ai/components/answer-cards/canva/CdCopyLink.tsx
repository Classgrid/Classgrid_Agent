// Copies a link and shows a tick for a moment
import React, { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { CdActionIcon } from './CdActionIcon';

export function CdCopyLink({ url, label = 'Copy link' }: { url?: string; label?: string }) {
  const [done, setDone] = useState(false);
  if (!url) return null;
  const copy = () => {
    try { void navigator.clipboard?.writeText(url); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  };
  return <CdActionIcon label={done ? 'Copied' : label} onClick={copy}>{done ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}</CdActionIcon>;
}
