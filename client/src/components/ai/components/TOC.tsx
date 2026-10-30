/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */


import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../utils";
import { List } from "lucide-react";

export interface TOCItem {
  id: string;
  label: string;
}

interface ScrollSpyTOCProps {
  tocItems: TOCItem[];
  activeSection: string;
}

/**
 * Right-side minimalist scroll-spy Table of Contents.
 * Renders a fixed-position "On this page" label + tick marks on desktop (xl+).
 * Shared between ComparisonDetailClient and BlogDetailClient.
 */
export function ScrollSpyTOC({ tocItems, activeSection }: ScrollSpyTOCProps) {
  return (
    <div className="hidden xl:block absolute right-4 top-24 bottom-24 w-[280px] z-40 pointer-events-none hide-when-ask-ai-open">
      <div className="sticky top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-end w-full pr-4">

        {/* "On this page" dropdown label */}
        <div className="group relative inline-flex items-center gap-2 mb-4 text-[13px] font-semibold text-slate-900 dark:text-muted-foreground cursor-pointer p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
          <List className="w-4 h-4" />
          <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 w-56 max-h-[300px] overflow-y-auto overscroll-contain rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[999] p-2 text-left">
            {tocItems.map(item => (
              <a key={`dropdown-${item.id}`} href={`#${item.id}`} className={cn(
                "block px-2 py-1.5 text-[13px] rounded hover:bg-slate-100 dark:hover:bg-white/5",
                activeSection === item.id ? "text-emerald-500 font-medium" : "text-muted-foreground"
              )}>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Scroll spy ticks (Commented out because it causes layout cutting issues on large chats) */}
        {/* 
        <div className="flex flex-col gap-1 items-end w-full max-h-[60vh] overflow-y-auto overflow-x-hidden overscroll-contain py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tocItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={`tick-${item.id}`}
                href={`#${item.id}`}
                className="group relative flex justify-end items-center h-2 w-full"
                aria-label={`Scroll to ${item.label}`}
                aria-current={isActive ? "true" : undefined}
              >
                <div
                  className={cn(
                    "h-[1px] transition-all duration-300 ease-in-out",
                    isActive
                      ? "w-10 bg-emerald-600 dark:bg-emerald-400"
                      : "w-5 bg-slate-500 dark:bg-white/40 group-hover:w-7 group-hover:bg-slate-700 dark:group-hover:bg-white/60"
                  )}
                />
                <span className="absolute right-12 px-2 py-1 bg-slate-800 dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-lg z-[999]">
                  {item.label}
                </span>
              </a>
            );
          })}
        </div> 
        */}
      </div>
    </div>
  );
}

/**
 * The same list of the user's questions as a header button, for screens where the side TOC is hidden
 * (below xl, including phones). Tap to open, tap a question to jump to it.
 */
export function MobileTOCButton({ tocItems, activeSection }: ScrollSpyTOCProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (tocItems.length === 0) return null;
  return (
    <div ref={ref} className="relative xl:hidden">
      <button
        type="button"
        aria-label="Your questions in this chat"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
      >
        <List className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed left-3 right-3 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-72 max-h-[60vh] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111] shadow-xl z-[200] p-2 text-left">
          {tocItems.map((item) => (
            <a
              key={`mobile-${item.id}`}
              href={`#${item.id}`}
              onClick={() => setOpen(false)}
              className={cn(
                "block px-2.5 py-2 text-[14px] rounded-lg truncate hover:bg-slate-100 dark:hover:bg-white/5",
                activeSection === item.id ? "text-emerald-500 font-medium" : "text-muted-foreground"
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// When a message was sent: "5:29 PM" today, "Oct 28, 5:29 PM" before, plus how long ago
export function messageTime(at?: number | string | null): string {
  if (!at) return "";
  const d = new Date(at);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day = d.toDateString() === now.toDateString() ? time : `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
  const secs = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  const ago = secs < 60 ? "just now" : secs < 3600 ? `${Math.floor(secs / 60)}m ago` : secs < 86400 ? `${Math.floor(secs / 3600)}h ago` : `${Math.floor(secs / 86400)}d ago`;
  return `${day} · ${ago}`;
}

const DOT_EASE = [0.22, 1, 0.36, 1] as const;

const SINGLE_DOTS = 15; // the newest questions get one dot each
const GROUP_SIZE = 19; // older questions are grouped, one bar per group

type QItem = TOCItem & { text?: string; time?: number | string };

/**
 * Studio Mode: marks on the chat's left edge, like an agent manager. The newest questions get one dot each; older
 * ones are grouped into bars. Hovering a mark shows its questions with their times; click one to jump there.
 */
export function QuestionDots({ tocItems, activeSection }: { tocItems: QItem[]; activeSection: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const [cardTop, setCardTop] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (tocItems.length < 1) return null;

  // Older questions in groups of GROUP_SIZE (oldest first), then one mark per newest question
  const olderCount = Math.max(0, tocItems.length - SINGLE_DOTS);
  const marks: QItem[][] = [];
  for (let i = 0; i < olderCount; i += GROUP_SIZE) marks.push(tocItems.slice(i, Math.min(i + GROUP_SIZE, olderCount)));
  for (let i = olderCount; i < tocItems.length; i++) marks.push([tocItems[i]]);

  const show = (index: number, el: HTMLElement) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const box = boxRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setCardTop(box ? r.top - box.top + r.height / 2 : 0);
    setHover(index);
  };
  const hide = () => { closeTimer.current = setTimeout(() => setHover(null), 160); };
  const keep = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const clock = (at?: number | string) => (at ? new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
  const rangeOf = (group: QItem[]) => {
    const times = group.map((x) => (x.time ? new Date(x.time).getTime() : 0)).filter(Boolean);
    if (!times.length) return "";
    const first = new Date(Math.min(...times));
    const last = new Date(Math.max(...times));
    const day = first.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    if (last.getTime() - first.getTime() < 60_000) return `${day}, ${clock(first.getTime())}`;
    const lastDay = first.toDateString() === last.toDateString() ? "" : `${last.toLocaleDateString([], { month: "short", day: "numeric" })}, `;
    return `${day}, ${clock(first.getTime())} – ${lastDay}${clock(last.getTime())}`;
  };
  const card = hover !== null ? marks[hover] : null;
  const fullDate = (at: number | string) => {
    const d = new Date(at);
    return `${d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })} at ${clock(at)}`;
  };

  return (
    <div ref={boxRef} className="studio-question-dots absolute left-2 top-1/2 -translate-y-1/2 z-30 @max-[46rem]:hidden">
      <div className="flex flex-col items-center gap-[5px] max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-2 px-1.5" onScroll={() => setHover(null)}>
        {marks.map((group, i) => {
          const on = group.some((x) => x.id === activeSection);
          const bar = group.length > 1;
          return (
            <button
              key={group[0].id}
              type="button"
              onClick={() => jump(group[0].id)}
              onMouseEnter={(e) => show(i, e.currentTarget)}
              onMouseLeave={hide}
              className="flex items-center justify-center w-3"
              aria-label={bar ? `${group.length} older questions` : `Go to: ${group[0].label}`}
            >
              <motion.span
                className="block w-[5px] rounded-full bg-foreground"
                initial={false}
                animate={{ height: bar ? 18 : 5, opacity: on ? 0.85 : hover === i ? 0.6 : 0.25 }}
                transition={{ duration: reduce ? 0 : 0.2, ease: DOT_EASE }}
              />
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {card && (
          <motion.div
            key="card"
            onMouseEnter={keep}
            onMouseLeave={hide}
            initial={reduce ? false : { opacity: 0, x: -6, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1, top: cardTop }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -6, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: DOT_EASE }}
            style={{ transformOrigin: "left center", translateY: "-50%" }}
            className="absolute left-7 w-[300px] max-w-[calc(100vw-6rem)] rounded-lg border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden"
          >
            {card.length === 1 ? (
              // One question: its text, "13 of 71" and the full date
              <button type="button" onClick={() => { jump(card[0].id); setHover(null); }} className="block w-full text-left px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-2">{(card[0].text || card[0].label).replace(/\s+/g, " ")}</p>
                <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{tocItems.indexOf(card[0]) + 1} of {tocItems.length}</span>
                  {card[0].time && <span>{fullDate(card[0].time)}</span>}
                </div>
              </button>
            ) : (
              <>
                <div className="px-3 pt-2.5 pb-1.5">
                  <p className="text-[13px] font-medium text-foreground">{rangeOf(card) || "Questions"}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{tocItems.indexOf(card[0]) + 1}–{tocItems.indexOf(card[card.length - 1]) + 1} of {tocItems.length}</p>
                </div>
                <div className="max-h-[220px] overflow-y-auto px-1 pb-1 chat-scrollbar">
                  {card.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { jump(item.id); setHover(null); }}
                      className={`w-full flex items-center gap-2.5 h-7 px-2 rounded text-left text-[12px] transition-colors duration-150 ${activeSection === item.id ? "bg-black/[0.05] dark:bg-white/[0.07] text-foreground" : "text-foreground/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-foreground"}`}
                    >
                      <span className="w-[50px] shrink-0 text-[11px] text-muted-foreground tabular-nums">{clock(item.time)}</span>
                      <span className="flex-1 min-w-0 truncate">{(item.text || item.label).replace(/\s+/g, " ")}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
