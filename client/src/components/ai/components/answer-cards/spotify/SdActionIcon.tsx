// A small round button with only an icon
import React from 'react';
import { cn } from '@/lib/utils';

export function SdActionIcon({ label, href, onClick, children, className }: { label: string; href?: string; onClick?: () => void; children: React.ReactNode; className?: string }) {
  const cls = cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-[#9a9a9a] dark:hover:bg-[#262626] dark:hover:text-white cursor-pointer', className);
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={cls}>{children}</a>;
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>{children}</button>;
}
