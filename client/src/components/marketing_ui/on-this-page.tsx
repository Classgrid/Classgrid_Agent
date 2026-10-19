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

"use client";

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */


import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TocItem {
  id: string;
  label: string;
  level?: 1 | 2 | 3;
}

interface OnThisPageProps {
  /** Manually provide items, OR let the component auto-detect from the page headings */
  items?: TocItem[];
  /** CSS selector scope to auto-detect headings within (default: "main") */
  scope?: string;
  /** Title shown at the top of the panel */
  title?: string;
}

// ─── Auto-detect headings from DOM ───────────────────────────────────────────

function collectHeadings(scope: string): TocItem[] {
  if (typeof document === "undefined") return [];
  const container = document.querySelector(scope) ?? document.body;
  const nodes = container.querySelectorAll("h1, h2, h3");
  const items: TocItem[] = [];

  nodes.forEach((node) => {
    const el = node as HTMLElement;
    // Ensure the element has an id to scroll to
    if (!el.id) {
      el.id = el.textContent
        ?.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ?? `heading-${items.length}`;
    }
    const tag = el.tagName.toLowerCase();
    items.push({
      id: el.id,
      label: el.textContent?.trim() ?? "",
      level: tag === "h1" ? 1 : tag === "h3" ? 3 : 2,
    });
  });

  return items;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnThisPage({
  items: propItems,
  scope = "main",
  title = "On this page",
}: OnThisPageProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TocItem[]>(propItems ?? []);
  const [activeId, setActiveId] = useState<string>("");

  // Auto-detect headings if no items provided
  useEffect(() => {
    if (propItems && propItems.length > 0) { setItems(propItems); return; }
    // Small delay so page content is fully mounted
    const t = setTimeout(() => setItems(collectHeadings(scope)), 300);
    return () => clearTimeout(t);
  }, [propItems, scope]);

  // Highlight active heading on scroll
  useEffect(() => {
    if (!items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      setOpen(false);
    }
  };

  // Don't render if fewer than 2 headings
  if (items.length < 2) return null;

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="On this page"
        aria-label="On this page"
        className={cn(
          "fixed right-4 bottom-20 z-40 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg border transition-all duration-200",
          "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:shadow-primary/10",
          open && "border-primary/50 text-primary bg-primary/5"
        )}
      >
        <FileText className="w-4 h-4" />
      </button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile) */}
            <motion.div
              key="toc-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 md:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="toc-panel"
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed right-4 bottom-32 z-40 w-64 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {title}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-0.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Items */}
              <ul className="py-2 max-h-72 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors group",
                        item.level === 3 && "pl-7",
                        item.level === 1 && "font-semibold",
                        activeId === item.id
                          ? "text-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          "w-3 h-3 shrink-0 transition-transform",
                          activeId === item.id ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-50"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
