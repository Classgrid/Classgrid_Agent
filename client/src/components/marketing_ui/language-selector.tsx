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


import { Globe, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/marketing_ui/dropdown-menu";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { SUPPORTED_LANGS, LANG_LABELS, type SupportedLang } from "@/lib/locale";

export function LanguageSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const getLang = useCallback((): SupportedLang => {
    const param = searchParams.get("lang");
    return (SUPPORTED_LANGS as readonly string[]).includes(param ?? "")
      ? (param as SupportedLang)
      : "en";
  }, [searchParams]);

  const [language, setLanguage] = useState<SupportedLang>(getLang);

  useEffect(() => {
    setLanguage(getLang());
  }, [getLang]);

  const handleLanguageChange = (newLang: string) => {
    // Placeholder mode: Selecting a language does absolutely nothing.
    // Navigation and translation logic is turned off for now.
  };

  return (
    <div className="flex items-center">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label="Select Language"
          className="group flex items-center justify-center h-[32px] gap-1.5 rounded-full border-0 bg-black/[0.06] pl-3 pr-2.5 py-1 text-[12px] font-medium text-foreground dark:bg-white/[0.08] hover:bg-black/[0.12] dark:hover:bg-white/[0.16] focus:ring-0 focus:outline-none focus:ring-offset-0 transition-all duration-300 ease-out"
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Globe
              size={13}
              className="shrink-0 text-muted-foreground transition-all duration-300 ease-out group-hover:text-foreground group-hover:scale-110 group-hover:rotate-12"
            />
            <span className="truncate text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
              {LANG_LABELS[language]}
            </span>
          </div>
          <ChevronDown size={14} className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="rounded-xl border-border bg-card text-card-foreground min-w-[110px] max-h-[300px] shadow-lg animate-in fade-in-0 zoom-in-95 duration-200" align="end" sideOffset={8}>
          {SUPPORTED_LANGS.map((code) => (
            <DropdownMenuItem
              key={code}
              onSelect={() => handleLanguageChange(code)}
              className="text-[12px] cursor-pointer transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {LANG_LABELS[code]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
