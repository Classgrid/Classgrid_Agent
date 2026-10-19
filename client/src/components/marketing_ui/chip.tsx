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

"use client"

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


import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

/* ──────────────────────────────────────────────────────────
 * Chip / Pill — lightweight status indicator.
 *
 * Use only where it adds meaning/context:
 *   • Integration status   (Connected, Sync Active, Live)
 *   • Module tags           (Core Module, Popular, New)
 *   • Testimonial metadata  (Verified, Institution type)
 *   • System roles          (Admin, Dean, Student)
 *   • AI status             (Analyzing, Processing, Synced)
 *
 * Do NOT use as a replacement for primary buttons.
 * ────────────────────────────────────────────────────────── */

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border-foreground/10 bg-foreground/5 text-muted-foreground",
        emerald:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        cyan:
          "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
        amber:
          "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        rose:
          "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        violet:
          "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
        blue:
          "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        orange:
          "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  /** Optional leading icon (rendered at 12×12) */
  icon?: React.ReactNode
  /** Show a pulsing dot indicator before the label */
  dot?: boolean
  /** Dot color — defaults to the variant accent color */
  dotClassName?: string
  /** Enable subtle hover scale (default: false) */
  interactive?: boolean
}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  (
    {
      className,
      variant,
      icon,
      dot,
      dotClassName,
      interactive = false,
      children,
      ...props
    },
    ref
  ) => {
    const content = (
      <>
        {dot ? (
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                dotClassName || "bg-current"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                dotClassName || "bg-current"
              )}
            />
          </span>
        ) : null}
        {icon ? (
          <span className="flex h-3 w-3 shrink-0 items-center justify-center [&>svg]:h-3 [&>svg]:w-3">
            {icon}
          </span>
        ) : null}
        {children}
      </>
    )

    if (interactive) {
      return (
        <motion.span
          ref={ref as any}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
          className={cn(chipVariants({ variant }), "cursor-default", className)}
          {...(props as any)}
        >
          {content}
        </motion.span>
      )
    }

    return (
      <span
        ref={ref}
        className={cn(chipVariants({ variant }), className)}
        {...props}
      >
        {content}
      </span>
    )
  }
)
Chip.displayName = "Chip"

export { Chip, chipVariants }
