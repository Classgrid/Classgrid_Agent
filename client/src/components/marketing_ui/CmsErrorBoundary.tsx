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

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
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
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

/**
 * components/ui/CmsErrorBoundary.tsx
 * ─────────────────────────────────────────────────────────────
 * IN-CODE BACKUP SAFETY NET
 *
 * Use this instead of notFound() when Sanity returns null.
 * Shows a graceful "content unavailable" page with a retry
 * button — users NEVER see a raw 404 black/white screen.
 *
 * Usage (server component):
 *   import { CmsFallback } from "@/components/marketing_ui/CmsErrorBoundary";
 *
 *   if (!post) return <CmsFallback type="blog post" backHref="/blog" />;
 *
 * ─────────────────────────────────────────────────────────────
 */
'use client';

import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Wifi } from 'lucide-react';
import { SectionAccentBar } from "@/components/marketing_ui/section-accent-bar";

type CmsFallbackProps = {
  /** Human-readable name of what failed, e.g. "blog post", "article" */
  type?: string;
  /** Where the back button links to */
  backHref?: string;
  /** Custom back button label */
  backLabel?: string;
};

export function CmsFallback({
  type = 'page',
  backHref = '/',
  backLabel,
}: CmsFallbackProps) {
  const navigate = useNavigate();

  return (
    <main className="min-h-[60vh] bg-background text-foreground flex items-center justify-center px-6 py-24">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
          <Wifi className="h-7 w-7 text-muted-foreground" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <SectionAccentBar />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Content temporarily unavailable
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We couldn&apos;t load this {type} right now. This is usually a
            temporary network issue — try refreshing the page.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(0)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href={backHref}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel ?? `Back to ${type === 'page' ? 'Home' : type + 's'}`}
          </Link>
        </div>

        {/* Tip */}
        <p className="text-xs text-muted-foreground/60 pt-2">
          If this keeps happening, please contact support.
        </p>
      </div>
    </main>
  );
}
