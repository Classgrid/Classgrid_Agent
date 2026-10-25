// A playlist's description in two lines (Spotify sends some of it as HTML)
import React from 'react';

export function SdPlaylistDescription({ text }: { text?: string }) {
  const clean = String(text || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-[#b5b5b5]">{clean}</p>;
}
