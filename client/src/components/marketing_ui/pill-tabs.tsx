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


import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type PillTab = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

type PillTabsProps = {
  tabs: PillTab[];
  activeId: string;
  onChange: (id: string) => void;
  /** Framer Motion layoutId – must be unique per page if multiple PillTabs exist */
  layoutId?: string;
  className?: string;
};

/**
 * PillTabs – the ONE shared tab style for the entire site.
 *
 * Dark pill container  ·  Emerald active pill  ·  Optional lucide icon  ·  Spring animation
 *
 * Usage:
 *   <PillTabs tabs={tabs} activeId={active} onChange={setActive} layoutId="mySection" />
 */
export function PillTabs({
  tabs,
  activeId,
  onChange,
  layoutId = "pill-tab",
  className,
}: PillTabsProps) {
  return (
    <div
      className={cn(
        "relative flex max-w-[95vw] sm:max-w-full overflow-x-auto no-scrollbar items-center justify-start sm:justify-center sm:flex-wrap gap-1 rounded-3xl sm:rounded-full border border-border bg-muted/80 p-1.5 shadow-sm scroll-smooth",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 inline-flex whitespace-nowrap shrink-0 items-center gap-2 rounded-full px-5 sm:px-6 py-2 text-sm font-semibold transition-colors duration-300 outline-none",
              isActive
                ? "text-slate-900 dark:text-white"
                : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
