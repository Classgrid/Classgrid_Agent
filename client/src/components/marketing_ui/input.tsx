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

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { Sparkles, Lock } from "lucide-react"

import { cn } from "@/lib/utils"

export type FieldState = "default" | "prefilled" | "locked" | "error" | "normal"

export interface InputProps extends React.ComponentProps<"input"> {
  fieldState?: FieldState
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, fieldState = "normal", ...props }, ref) => {
    
    let stateClasses = "bg-transparent border-input text-foreground placeholder:text-muted-foreground/40"
    
    if (fieldState === "locked") {
      stateClasses = "bg-secondary/40 border-transparent text-foreground opacity-90 cursor-not-allowed focus-visible:ring-0 focus-visible:border-transparent"
    } else if (fieldState === "prefilled") {
      stateClasses = "bg-primary/5 border-primary/20 text-foreground font-medium"
    } else if (fieldState === "default") {
      stateClasses = "bg-transparent border-input text-foreground/80"
    } else if (fieldState === "error") {
      stateClasses = "border-destructive focus-visible:ring-destructive/30"
    }

    return (
      <div className="relative flex w-full items-center">
        <InputPrimitive
          type={type}
          data-slot="input"
          ref={ref as any}
          className={cn(
            "h-10 w-full min-w-0 rounded-lg border px-3 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80",
            stateClasses,
            (fieldState === "prefilled" || fieldState === "locked") ? "pr-10" : "",
            className
          )}
          readOnly={fieldState === "locked" ? true : props.readOnly}
          {...props}
        />
        {fieldState === "prefilled" && (
          <Sparkles className="absolute right-3 h-4 w-4 text-primary/70 pointer-events-none" />
        )}
        {fieldState === "locked" && (
          <Lock className="absolute right-3 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
