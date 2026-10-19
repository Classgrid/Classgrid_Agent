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

import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

interface SafariMockupProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  url?: string;
  children?: React.ReactNode;
}

export function SafariMockup({
  src,
  url = "app.classgrid.in",
  className,
  children,
  ...props
}: SafariMockupProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-background shadow-2xl",
        className
      )}
      {...props}
    >
      {/* Browser Header */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-3">
        {/* Window Controls */}
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#FF5F56]" />
          <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
          <div className="h-3 w-3 rounded-full bg-[#27C93F]" />
        </div>
        
        {/* Address Bar */}
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span className="truncate">{url}</span>
        </div>

        {/* Action icons (dots) */}
        <div className="flex gap-1">
          <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        </div>
      </div>

      {/* Content Area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {src ? (
          <img
            src={src}
            alt="Browser Screenshot"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
