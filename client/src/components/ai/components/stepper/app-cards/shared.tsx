// Building blocks for the Canva and Spotify cards shown under their tool step in the chat.
// Follows the inline-card rules of chat apps: brand color only on the main button and badges, at most two buttons,
// carousels of up to 8 items, no scrolling inside a card, and the same colors as the rest of the chat in light and dark mode.
import React, { useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BRAND = {
  spotify: { name: 'Spotify', logo: 'https://cdn.classgrid.in/classgrid_intgration/spotify.svg', button: 'bg-[#1DB954] hover:bg-[#1ed760] text-black' },
  canva: { name: 'Canva', logo: 'https://cdn.classgrid.in/classgrid_intgration/canva.svg', button: 'bg-[#7D2AE8] hover:bg-[#8b3df0] text-white' },
} as const;
export type Brand = keyof typeof BRAND;

/** 3:12 from milliseconds */
export function fmtTime(ms?: number) {
  if (!ms || ms < 0) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Canva sends Unix seconds, Spotify ISO strings */
export function fmtWhen(v?: number | string) {
  if (!v) return undefined;
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

/** The outer card: brand logo and a short title on top, content below */
export function AppCard({ brand, title, right, children, className }: { brand: Brand; title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] overflow-hidden', className)}>
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <img src={BRAND[brand].logo} alt="" className="h-4 w-4 shrink-0" />
        <span className="text-[12.5px] font-medium text-slate-500 dark:text-[#9a9a9a] truncate">{title ?? BRAND[brand].name}</span>
        {right && <span className="ml-auto shrink-0">{right}</span>}
      </div>
      <div className="px-3.5 pb-3.5">{children}</div>
    </div>
  );
}

/** Main (brand color) or secondary button; opens a link in a new tab, or runs onClick */
export function CardButton({ brand, href, onClick, primary, icon, children }: { brand: Brand; href?: string; onClick?: () => void; primary?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  const cls = cn(
    'inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer select-none',
    primary ? BRAND[brand].button : 'border border-slate-200 dark:border-[#333] text-slate-700 dark:text-[#e2e2e2] hover:bg-slate-50 dark:hover:bg-[#222]',
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{icon}{children}</a>;
  return <button type="button" onClick={onClick} className={cls}>{icon}{children}</button>;
}

/** A picture with a soft placeholder when it is missing or fails to load */
export function Thumb({ src, alt, className, rounded = 'rounded-lg' }: { src?: string | null; alt?: string; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={cn('flex items-center justify-center bg-slate-100 dark:bg-[#222] text-slate-300 dark:text-[#444]', rounded, className)}><ImageOff className="h-5 w-5" /></div>;
  }
  return <img src={src} alt={alt ?? ''} loading="lazy" onError={() => setFailed(true)} className={cn('object-cover bg-slate-100 dark:bg-[#222]', rounded, className)} />;
}

/** Horizontal swipe carousel (Embla) with arrow buttons on wider screens; at most 8 items */
export function Carousel({ children, itemClass = 'basis-[46%] sm:basis-[31%]' }: { children: React.ReactNode[]; itemClass?: string }) {
  const [ref, api] = useEmblaCarousel({ align: 'start', dragFree: true, containScroll: 'trimSnaps' });
  const items = children.slice(0, 8);
  return (
    <div className="relative group/carousel">
      <div ref={ref} className="overflow-hidden">
        <div className="flex gap-2.5">
          {items.map((child, i) => <div key={i} className={cn('min-w-0 shrink-0 grow-0', itemClass)}>{child}</div>)}
        </div>
      </div>
      {items.length > 2 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => api?.scrollPrev()} className="hidden sm:flex absolute left-1 top-[35%] h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-[#2a2a2a]/90 shadow border border-slate-200 dark:border-[#333] opacity-0 group-hover/carousel:opacity-100 transition-opacity cursor-pointer">
            <ChevronLeft className="h-4 w-4 text-slate-700 dark:text-[#ddd]" />
          </button>
          <button type="button" aria-label="Next" onClick={() => api?.scrollNext()} className="hidden sm:flex absolute right-1 top-[35%] h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-[#2a2a2a]/90 shadow border border-slate-200 dark:border-[#333] opacity-0 group-hover/carousel:opacity-100 transition-opacity cursor-pointer">
            <ChevronRight className="h-4 w-4 text-slate-700 dark:text-[#ddd]" />
          </button>
        </>
      )}
    </div>
  );
}

/** A list that shows the first few rows and a "Show N more" toggle (no scrolling inside the card) */
export function ShortList<T>({ items, first = 5, render }: { items: T[]; first?: number; render: (item: T, i: number) => React.ReactNode }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, first);
  return (
    <div className="flex flex-col">
      {shown.map(render)}
      {items.length > first && (
        <button type="button" onClick={() => setAll((a) => !a)} className="self-start mt-1.5 text-[12.5px] text-slate-500 hover:text-slate-800 dark:text-[#8a8a8a] dark:hover:text-white cursor-pointer">
          {all ? 'Show less' : `Show ${items.length - first} more`}
        </button>
      )}
    </div>
  );
}

/** "Done" line for actions with no data back (paused, deleted, movedâ€¦) */
export function DoneLine({ brand, icon, text, sub }: { brand: Brand; icon?: React.ReactNode; text: string; sub?: string }) {
  return (
    <AppCard brand={brand}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {icon ?? <CheckCircle2 className="h-[18px] w-[18px]" />}
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-slate-900 dark:text-white">{text}</div>
          {sub && <div className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] truncate">{sub}</div>}
        </div>
      </div>
    </AppCard>
  );
}

export function FailLine({ brand, text }: { brand: Brand; text: string }) {
  return (
    <AppCard brand={brand}>
      <div className="flex items-start gap-2.5">
        <XCircle className="h-[18px] w-[18px] shrink-0 mt-0.5 text-red-500" />
        <div className="text-[13.5px] text-slate-700 dark:text-[#d6d6d6] break-words">{text}</div>
      </div>
    </AppCard>
  );
}

export function Pill({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'green' | 'purple' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium',
      tone === 'green' ? 'bg-[#1DB954]/15 text-[#13843c] dark:text-[#1ed760]'
        : tone === 'purple' ? 'bg-[#7D2AE8]/12 text-[#6a1fd0] dark:text-[#b586ff]'
          : 'bg-slate-100 dark:bg-[#262626] text-slate-600 dark:text-[#b5b5b5]',
    )}>{children}</span>
  );
}
