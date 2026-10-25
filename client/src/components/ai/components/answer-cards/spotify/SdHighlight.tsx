// A green line for what was just done ("Playlist created", "Added to queue")
import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export function SdHighlight({ text }: { text?: string }) {
  if (!text) return null;
  return <div className="flex items-center gap-2 rounded-xl bg-[#1DB954]/10 px-3 py-2.5 text-[13px] font-medium text-[#13843c] dark:text-[#1ed760]"><CheckCircle2 className="h-4 w-4 shrink-0" />{text}</div>;
}
