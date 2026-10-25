// The one main button of a display card, in Canva purple
import React from 'react';

const CLS = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#7D2AE8] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#8b3df0] cursor-pointer select-none';

export function CdActionPrimary({ href, onClick, icon, children, download }: { href?: string; onClick?: () => void; icon?: React.ReactNode; children: React.ReactNode; download?: boolean }) {
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" download={download || undefined} className={CLS}>{icon}{children}</a>;
  return <button type="button" onClick={onClick} className={CLS}>{icon}{children}</button>;
}
