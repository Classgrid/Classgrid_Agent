// The one main button of a display card, in Spotify green
import React from 'react';

const CLS = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#1DB954] px-4 text-[13px] font-semibold text-black transition-colors hover:bg-[#1ed760] cursor-pointer select-none';

export function SdActionPrimary({ href, onClick, icon, children }: { href?: string; onClick?: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={CLS}>{icon}{children}</a>;
  return <button type="button" onClick={onClick} className={CLS}>{icon}{children}</button>;
}
