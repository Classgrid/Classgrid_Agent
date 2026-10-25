// The quiet outline button next to the main one
import React from 'react';

const CLS = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#333] dark:text-[#e2e2e2] dark:hover:bg-[#222] cursor-pointer select-none';

export function CdActionSecondary({ href, onClick, icon, children, download }: { href?: string; onClick?: () => void; icon?: React.ReactNode; children: React.ReactNode; download?: boolean }) {
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" download={download || undefined} className={CLS}>{icon}{children}</a>;
  return <button type="button" onClick={onClick} className={CLS}>{icon}{children}</button>;
}
