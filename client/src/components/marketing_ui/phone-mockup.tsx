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


import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PhoneMockupProps = {
  children: ReactNode;
  className?: string;
  screenClassName?: string;
  title?: string;
};

export function PhoneMockup({
  children,
  className,
  screenClassName,
  title = "Classgrid mobile app preview",
}: PhoneMockupProps) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[320px]", className)} aria-label={title}>
      <div className="relative rounded-[2.8rem] bg-[#050505] p-2.5 shadow-[0_40px_100px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
        <div className="absolute inset-y-24 left-0 w-1 rounded-r-full bg-white/10" />
        <div className="absolute right-0 top-28 h-12 w-1 rounded-l-full bg-white/10" />
        <div className="absolute right-0 top-44 h-16 w-1 rounded-l-full bg-white/10" />

        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#f4f7fb]">
          <div className="absolute left-1/2 top-0 z-20 h-7 w-36 -translate-x-1/2 rounded-b-[1.2rem] bg-[#0b0b0b] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
            <div className="absolute left-1/2 top-2 h-2 w-16 -translate-x-1/2 rounded-full bg-white/10" />
            <div className="absolute right-4 top-2.5 h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>

          <div className={cn("relative min-h-[620px] overflow-hidden rounded-[2.05rem]", screenClassName)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
