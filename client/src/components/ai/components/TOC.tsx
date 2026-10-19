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
