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

interface MacbookProProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  videoSrc?: string;
  poster?: string;
}

export function MacbookPro({
  src,
  videoSrc,
  poster,
  className,
  children,
  ...props
}: MacbookProProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[900px] perspective-1000",
        className
      )}
      {...props}
    >
      {/* Screen Frame */}
      <div className="relative rounded-[2rem] border-[12px] border-zinc-900 bg-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-800">
        {/* Notch Area */}
        <div className="absolute top-0 left-1/2 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-zinc-900 dark:bg-zinc-800">
          <div className="absolute top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-800 dark:bg-zinc-700" />
        </div>

        {/* Display Container */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.2rem] bg-[#fafafa] dark:bg-zinc-950">
          {videoSrc ? (
            <video
              src={videoSrc}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : src ? (
            <img
              src={src}
              alt="Macbook Screen"
              className="h-full w-full object-cover"
            />
          ) : (
            children
          )}
          
          {/* Internal reflection overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 opacity-30" />
        </div>
      </div>

      {/* Base / Keyboard Area */}
      <div className="relative -mt-2 h-4 w-[106%] -translate-x-[3%] rounded-b-2xl border-t border-zinc-700 bg-zinc-300 shadow-2xl transition-colors dark:border-zinc-600 dark:bg-zinc-800">
        {/* Thumb notch for opening */}
        <div className="absolute top-0 left-1/2 h-2 w-24 -translate-x-1/2 rounded-b-lg bg-zinc-400 dark:bg-zinc-900" />
      </div>
      
      {/* Table shadow */}
      <div className="mx-auto mt-2 h-4 w-[80%] rounded-[100%] bg-black/20 blur-xl dark:bg-black/40" />
    </div>
  );
}
