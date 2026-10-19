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
 * tenant-bootstrap.ts
 *
 * Reads the tenant branding injected by Vercel Edge Middleware into
 * window.__CLASSGRID_TENANT__. This data is available BEFORE React
 * even starts, making it the fastest possible way to know the tenant.
 *
 * Usage in login pages:
 *   const boot = getBootstrappedTenant();
 *   if (boot) {
 *     document.title = boot.title;
 *     // Skip the auth-branding API call for title/favicon
 *   }
 */

interface TenantBootstrap {
  title: string | null;
  favicon: string | null;
}

/**
 * Returns the tenant branding injected by Edge Middleware, or null
 * if not available (main platform, dev mode, or middleware didn't run).
 */
export function getBootstrappedTenant(): TenantBootstrap | null {
  try {
    const tenant = (window as any).__CLASSGRID_TENANT__;
    if (tenant && typeof tenant === "object" && (tenant.title || tenant.favicon)) {
      return tenant as TenantBootstrap;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Applies bootstrapped branding to the document immediately.
 * Call this at the top of login/auth pages BEFORE any async work.
 * Returns true if bootstrap was applied, false if fallback API call is needed.
 */
export function applyBootstrappedBranding(): boolean {
  const tenant = getBootstrappedTenant();
  if (!tenant) return false;

  if (tenant.title) {
    document.title = tenant.title;
  }

  if (tenant.favicon) {
    const link = document.getElementById("favicon-link") as HTMLLinkElement | null;
    if (link) {
      link.href = tenant.favicon;
    }
  }

  return true;
}
