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

/**
 * BlueprintCrosshair
 * The tiny plus/cross SVG that sits at the four corners of each BlueprintBox section.
 * Named after technical blueprint drawings where grid intersections are marked with crosshairs.
 */
export const BlueprintCrosshair = ({ className }: { className?: string }) => (
  <svg
    className={cn(
      "absolute w-[17px] h-[17px] text-slate-300 dark:text-white/20",
      className
    )}
    viewBox="0 0 17 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M8.5 0V17M0 8.5H17" stroke="currentColor" strokeWidth="1" />
  </svg>
);

type BlueprintBoxProps = {
  children: React.ReactNode;
  className?: string;
  /** Max width of the inner box. Defaults to max-w-[900px] */
  maxWidth?: string;
  /** Whether to show a top border on the box. Default true */
  showTopBorder?: boolean;
  /** Whether to show a bottom border on the box. Default true */
  showBottomBorder?: boolean;
};

/**
 * BlueprintBox
 *
 * A "framed technical grid" layout container. Creates the beautiful bordered box
 * with corner crosshair markers — inspired by technical blueprint/schematic drawings.
 *
 * Used on:
 *  - Compare detail pages (ClassGrid vs Competitor)
 *  - Blog detail pages
 *
 * On mobile, the left/right border lines are hidden (mx-0) to give full-width
 * breathing room. The crosshairs hide gracefully on small screens too.
 */
export function BlueprintBox({
  children,
  className,
  maxWidth = "max-w-[900px]",
  showTopBorder = true,
  showBottomBorder = true,
}: BlueprintBoxProps) {
  return (
    <div className={cn("relative mx-3 sm:mx-4 md:mx-auto", maxWidth)}>
      {/* Left/Right vertical border lines — visible on all screens */}
      <div
        className={cn(
          "relative border-l border-r border-slate-200 dark:border-white/10",
          className
        )}
      >
        {/* Top border + top corner crosshairs */}
        {showTopBorder && (
          <>
            <div className="absolute top-0 left-0 w-full border-t border-slate-200 dark:border-white/10" />
            <BlueprintCrosshair className="-top-[6px] -left-[6px] sm:-top-[8px] sm:-left-[8px] w-[11px] h-[11px] sm:w-[17px] sm:h-[17px]" />
            <BlueprintCrosshair className="-top-[6px] -right-[6px] sm:-top-[8px] sm:-right-[8px] w-[11px] h-[11px] sm:w-[17px] sm:h-[17px]" />
          </>
        )}

        {children}

        {/* Bottom border + bottom corner crosshairs */}
        {showBottomBorder && (
          <>
            <div className="absolute bottom-0 left-0 w-full border-t border-slate-200 dark:border-white/10" />
            <BlueprintCrosshair className="-bottom-[6px] -left-[6px] sm:-bottom-[8px] sm:-left-[8px] w-[11px] h-[11px] sm:w-[17px] sm:h-[17px]" />
            <BlueprintCrosshair className="-bottom-[6px] -right-[6px] sm:-bottom-[8px] sm:-right-[8px] w-[11px] h-[11px] sm:w-[17px] sm:h-[17px]" />
          </>
        )}
      </div>
    </div>
  );
}

type BlueprintSectionProps = {
  children: React.ReactNode;
  className?: string;
  /** If true, adds a dashed top border (used for body/content sections) */
  dashed?: boolean;
  /** Show crosshairs at the top of this section. Default true */
  showCrosshairs?: boolean;
};

/**
 * BlueprintSection
 *
 * A section divider inside a BlueprintBox. Adds a horizontal rule with
 * corner crosshair markers — creating the segmented "blueprint schematic" look.
 */
export function BlueprintSection({
  children,
  className,
  dashed = false,
  showCrosshairs = true,
}: BlueprintSectionProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "absolute top-0 left-0 w-full border-t border-slate-200 dark:border-white/10",
          dashed && "border-dashed"
        )}
      />
      {showCrosshairs && (
        <>
          <BlueprintCrosshair className="-top-[6px] -left-[6px] sm:-top-[8px] sm:-left-[8px] w-[11px] h-[11px] sm:w-[17px] sm:h-[17px]" />
          <BlueprintCrosshair className="-top-[6px] -right-[6px] sm:-top-[8px] sm:-right-[8px] w-[11px] h-[11px] sm:w-[17px] sm:h-[17px]" />
        </>
      )}
      {children}
    </div>
  );
}
