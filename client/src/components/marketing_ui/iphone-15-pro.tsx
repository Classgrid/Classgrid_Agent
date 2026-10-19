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

interface IPhone15ProProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  videoSrc?: string;
}

export function IPhone15Pro({
  src,
  videoSrc,
  className,
  children,
  ...props
}: IPhone15ProProps) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[350/712] w-full max-w-[350px] shrink-0 rounded-[3.5rem] border-[8px] border-zinc-900 bg-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-800",
        className
      )}
      {...props}
    >
      {/* Power Button */}
      <div className="absolute -right-[2.3%] top-[22.5%] h-[13.5%] w-[1.8%] rounded-l-md bg-zinc-800 dark:bg-zinc-700" />
      {/* Volume Buttons */}
      <div className="absolute -left-[2.3%] top-[18%] h-[9%] w-[1.8%] rounded-r-md bg-zinc-800 dark:bg-zinc-700" />
      <div className="absolute -left-[2.3%] top-[29.2%] h-[9%] w-[1.8%] rounded-r-md bg-zinc-800 dark:bg-zinc-700" />

      {/* Screen */}
      <div className="relative h-full w-full overflow-hidden rounded-[2.85rem] bg-[#fafafa] dark:bg-zinc-950">
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-[1.7%] z-20 h-[3.95%] w-[32%] -translate-x-1/2 rounded-full bg-black">
          <div className="absolute right-[14%] top-[28%] h-[29%] w-[7.1%] rounded-full bg-zinc-800" />
        </div>

        {/* Content */}
        <div className="h-full w-full">
          {videoSrc ? (
            <video
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : src ? (
            <img
              src={src}
              alt="iPhone Screen"
              className="h-full w-full object-cover"
            />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
