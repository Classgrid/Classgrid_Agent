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

import React, { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getLoginPathForPath, getRedirectPath, isInstitutionAdminRole } from "../auth-helpers";
import { useCurrentUser } from "../queries/useCurrentUser";
import { PresenceProvider } from "@/features/chat/context/PresenceContext";
import { apiClient } from "@/lib/apiClient";
import { OAUTH_CONSENT_PATH, peekOAuthConsentReturn, rememberOAuthConsentReturn } from "@/features/oauth/lib/oauthReturn";

export function RequireAuth() {
  const location = useLocation();
  const { data: user, isLoading, isFetching } = useCurrentUser();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const path = location.pathname;

  useEffect(() => {
    if (user?.isProvisional && !isFinalizing && path.includes("/admin/dashboard")) {
      setIsFinalizing(true);
      apiClient.post("/api/auth/finalize-onboarding", { token: localStorage.getItem("token") })
        .then(res => {
          if (res.data?.token) {
            localStorage.setItem("token", res.data.token);
          }
          window.location.reload();
        })
        .catch(err => {
          console.error("Failed to finalize onboarding", err);
          window.location.href = "/admin/login";
        });
    }
  }, [user, path, isFinalizing]);

  // If there's an SSO token in the URL, we must wait for the fetch to complete 
  // even if React Query has a cached 'null' user from a previous session.
  const hasSsoToken = typeof window !== 'undefined' && 
                      (new URLSearchParams(window.location.search).has("sso_token") || 
                       new URLSearchParams(window.location.search).has("token"));
                      
  if (isFinalizing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground text-sm font-medium">Finalizing your account setup...</p>
        </div>
      </div>
    );
  }

  if (isLoading || (hasSsoToken && isFetching)) {
    return null;
  }

  if (!user) {
    const isRescueAuth = location.pathname === "/superadmin/audit-logs" && localStorage.getItem("rescue_token");
    if (!isRescueAuth) {
      // The login page always finishes on "/", so remember an MCP/OAuth consent URL to come back to
      if (path === OAUTH_CONSENT_PATH) rememberOAuthConsentReturn(`${location.pathname}${location.search}`);
      return (
        <Navigate
          to={getLoginPathForPath(location.pathname)}
          replace
          state={{ from: location }}
        />
      );
    }
  }

  // chat.classgrid.in: no chat until sign-up is finished (verified WhatsApp number); the login page
  // continues the sign-up at the WhatsApp step.
  const isChatHost = typeof window !== "undefined" && window.location.hostname.split(".")[0] === "chat";
  if (isChatHost && user?.needsChatOnboarding) {
    return <Navigate to="/login?continue=signup" replace />;
  }

  const isPasswordSetupRoute = path === "/required-password-reset";
  const isOrganizationSetupRoute = path === "/enter-org-code";
  const needsPasswordReset = user?.mustResetPassword === true;
  const needsOrganizationCode = ["faculty", "teacher"].includes(user?.role || "")
    && !user?.organization
    && !user?.organization_id;

  // Mandatory account setup is enforced centrally, so a copied dashboard URL
  // cannot bypass the flags returned by the authentication backend.
  if (needsPasswordReset && !isPasswordSetupRoute) {
    return <Navigate to="/required-password-reset" replace />;
  }
  if (!needsPasswordReset && needsOrganizationCode && !isOrganizationSetupRoute) {
    return <Navigate to="/enter-org-code" replace />;
  }
  if (isPasswordSetupRoute && !needsPasswordReset) {
    return <Navigate to={needsOrganizationCode ? "/enter-org-code" : getRedirectPath(user?.role)} replace />;
  }
  if (isOrganizationSetupRoute && !needsOrganizationCode) {
    return <Navigate to={needsPasswordReset ? "/required-password-reset" : getRedirectPath(user?.role)} replace />;
  }

  // Signed in after being sent away from the consent page: go back to it (it clears the saved URL)
  if (user && path !== OAUTH_CONSENT_PATH) {
    const consentReturn = peekOAuthConsentReturn();
    if (consentReturn) return <Navigate to={consentReturn} replace />;
  }

  // 🚨 STRICT ROLE GUARDS 🚨
  
  // 1. Super Admin Guard — role check
  if (path.startsWith("/superadmin") && user?.role !== "super_admin") {
    const isRescueAuth = path === "/superadmin/audit-logs" && localStorage.getItem("rescue_token");
    if (!isRescueAuth) {
      return <Navigate to={getRedirectPath(user?.role)} replace />;
    }
  }

  // 🔐 Super Admin Domain Lock
  // /superadmin/* routes are EXCLUSIVELY accessible from superadmin.classgrid.in.
  // If a super_admin tries to reach these routes from any other subdomain
  // (e.g. sunita.classgrid.in/superadmin/dashboard), redirect them to the correct domain.
  if (path.startsWith("/superadmin") && user?.role === "super_admin") {
    const currentHostname = window.location.hostname;
    const isSuperAdminDomain = currentHostname === "superadmin.classgrid.in" || currentHostname === "localhost" || currentHostname.startsWith("127.0.0.1");
    if (!isSuperAdminDomain) {
      window.location.replace(`https://superadmin.classgrid.in${location.pathname}${location.search}`);
      return null;
    }
  }

  // 2. Organization / Department Admin Guard
  const isAdminRoute = path.startsWith("/org") || path.startsWith("/dept");
  if (isAdminRoute && !isInstitutionAdminRole(user.role)) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  // (Removed ERP Domain Guard to allow Admins to use the ERP domain)

  // 3. Student Guard
  if (path.startsWith("/student") && user.role !== "student") {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  // 4. Strict Domain Enforcer (Kill old/invalid subdomains)
  if (user?.organization?.subdomain) {
    const currentHostname = window.location.hostname;
    const orgSubdomainHost = `${user?.organization?.subdomain}.classgrid.in`;
    const orgCustomDomainObj = user?.organization?.custom_domain as any;
    const orgCustomDomain = orgCustomDomainObj?.domain;
    
    const orgErpDomainObj = user?.organization?.erp_domain as any;
    const orgErpDomain = orgErpDomainObj?.domain;
    
    const isClassgridSubdomain = currentHostname.endsWith(".classgrid.in") && currentHostname !== "classgrid.in";
    const systemDomains = ["www.classgrid.in", "app.classgrid.in", "admin.classgrid.in", "api.classgrid.in"];

    // If on a .classgrid.in subdomain (and not a system domain), it MUST be their organization's subdomain
    if (isClassgridSubdomain && !systemDomains.includes(currentHostname)) {
      if (currentHostname !== orgSubdomainHost) {
        window.location.replace(`https://${orgSubdomainHost}${location.pathname}${location.search}`);
        return null;
      }
    }

    // If on a custom domain (not localhost, not vercel, not classgrid), it MUST be one of their organization's custom domains
    if (!isClassgridSubdomain && !currentHostname.includes("localhost") && !currentHostname.includes("vercel.app") && currentHostname !== "classgrid.in") {
      const isValidCustomDomain = currentHostname === orgCustomDomain || currentHostname === orgErpDomain;
      if (!isValidCustomDomain) {
        window.location.replace(`https://${orgSubdomainHost}${location.pathname}${location.search}`);
        return null;
      }
    }
  }

  return (
    <PresenceProvider userId={user?._id || null}>
      <Outlet />
    </PresenceProvider>
  );
}

