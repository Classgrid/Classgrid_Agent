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

﻿import { useEffect, useState } from "react";
import type { AuthUserRole, AuthBranding } from "../types";
import { ClassgridSubdomainUserLoginPage } from "./ClassgridSubdomainUserLoginPage";
import { CustomDomainUserLoginPage } from "./CustomDomainUserLoginPage";
import { getAuthBranding } from "../api";
import { redirectToBrandingFallback } from "../auth-helpers";

type UserLoginRouterProps = {
  preferredRole?: AuthUserRole;
};

export function UserLoginRouter({ preferredRole }: UserLoginRouterProps) {
  const [branding, setBranding] = useState<AuthBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hostname = window.location.hostname;
  const isCustomDomain =
    hostname !== "localhost" &&
    hostname !== "classgrid.in" &&
    !hostname.endsWith(".classgrid.in") &&
    !hostname.startsWith("127.0.0.1");

  useEffect(() => {
    let isMounted = true;
    const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost") || hostname.startsWith("127.0.0.1");
    const isClassgrid = hostname.endsWith("classgrid.in");
    
    const searchParams = new URLSearchParams(window.location.search);
    const subdomain = (isClassgrid || isLocalhost) && hostname.includes(".") ? hostname.split(".")[0] : undefined;
    const slug = searchParams.get("slug") || searchParams.get("org") || (subdomain !== "superadmin" ? subdomain : undefined);
    const customDomain = (!isClassgrid && !isLocalhost) ? hostname : undefined;

    getAuthBranding({ authType: "institution", slug, domain: customDomain })
      .then((result) => {
        if (!isMounted) return;

        // If the org has a custom domain and disabled the default .classgrid.in URL,
        // we must immediately redirect them to their custom domain.
        if (
          !isCustomDomain &&
          result.customDomain &&
          result.isCustomDomainEnabled &&
          result.allowClassgridUrl === false
        ) {
          window.location.href = `https://${result.customDomain}${window.location.pathname}${window.location.search}`;
          return;
        }

        setBranding(result);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (redirectToBrandingFallback(error)) return;
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [hostname, isCustomDomain]);

  // While loading, just show a blank screen to prevent flash of wrong branding
  if (isLoading) {
    return <div className="h-screen w-screen bg-[#080808]" />;
  }

  // Show the white-labeled page if the hostname IS a custom domain,
  // OR if the org has an active custom domain (even on .classgrid.in).
  // Orgs WITHOUT a custom domain will always see the Classgrid-branded page.
  const shouldUseCustomDomainPage = isCustomDomain || (branding?.customDomain && branding?.isCustomDomainEnabled);

  if (shouldUseCustomDomainPage) {
    return <CustomDomainUserLoginPage preferredRole={preferredRole} />;
  }

  return <ClassgridSubdomainUserLoginPage preferredRole={preferredRole} />;
}
