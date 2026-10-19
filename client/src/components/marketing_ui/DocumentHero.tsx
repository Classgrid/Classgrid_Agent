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

import { Badge } from "@/components/marketing_ui/badge";
import { Reveal } from "@/components/sections/Reveal";
import { SectionAccentBar } from "@/components/marketing_ui/section-accent-bar";
import { extractLocaleString, type SupportedLang } from "@/lib/locale";

type DocumentHeroProps = {
  badgeLabel?: any;
  badgeDotColor?: string;
  title: any;
  subtitles?: any[];
  description?: any;
  children?: React.ReactNode;
  lang?: SupportedLang;
  showAccentBar?: boolean;
};

export function DocumentHero({
  badgeLabel,
  badgeDotColor = "bg-emerald-500",
  title,
  subtitles = [],
  description,
  children,
  lang = "en",
  showAccentBar = true,
}: DocumentHeroProps) {
  return (
    <>
      {badgeLabel && (
        <Reveal distance={18}>
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badgeDotColor}`} />
            {extractLocaleString(badgeLabel, lang)}
          </Badge>
        </Reveal>
      )}
      <Reveal delay={0.08} distance={22}>
        <div className="legal-hero-frame mt-4 w-full">
          <div className="mx-auto w-full max-w-[720px] px-4 py-4 text-center sm:px-6 sm:py-6">
            {showAccentBar ? <SectionAccentBar /> : null}
            <h1 className="text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
              {(extractLocaleString(title, lang) ?? "").replace(/\.\s*$/, "")}
            </h1>
            {subtitles.length > 0 && (
              <div className="mt-6 space-y-1.5 text-sm text-muted-foreground">
                {subtitles.map((sub, idx) => (
                  <p key={idx}>{extractLocaleString(sub, lang)}</p>
                ))}
              </div>
            )}
          </div>
        </div>
        {description && (
          <p className="mt-5 max-w-[720px] text-[0.95rem] leading-8 text-muted-foreground mx-auto">
            {extractLocaleString(description, lang)}
          </p>
        )}
        {children && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {children}
          </div>
        )}
      </Reveal>
    </>
  );
}
