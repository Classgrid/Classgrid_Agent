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

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { DashboardLayout, DashboardRole } from './DashboardLayout';
import { useCurrentUser } from '@/features/auth/queries/useCurrentUser';
import { DomainEnforcer } from '@/components/DomainEnforcer';

export function DynamicRoleLayout() {
  const { data: user, isLoading } = useCurrentUser();
  
  if (isLoading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  const hostname = window.location.hostname;
  const subdomain = hostname.split(".")[0];
  // The ERP is shut down: only super admins keep their own dashboard; everyone else (on every address, localhost
  // too) gets Classgrid AI with its sidebar
  const isStaff = user.role === "super_admin" || user.role === "co_super_admin";
  const role: DashboardRole = subdomain === "chat" || !isStaff ? "public_chat" : "super_admin";

  if (role === "public_chat") {
    const path = window.location.pathname;
    const isAllowed = path === "/agent" || path.startsWith("/agent/") || path === "/c" || path.startsWith("/c/") || path === "/chat" || path === "/requests" || path.startsWith("/requests/") || path === "/audit" || path === "/profile" || path === "/settings" || path === "/classgrid-ai";
    if (!isAllowed) {
      return <Navigate to="/agent" replace />;
    }
  }
  
  return (
    <DomainEnforcer 
      allowClassgridUrl={(user.organization?.erp_domain?.allow_classgrid_url ?? user.organization?.custom_domain?.allow_classgrid_url) !== false}
      isCustomDomainEnabled={(user.organization?.erp_domain?.is_enabled ?? user.organization?.custom_domain?.is_enabled) !== false}
      customDomain={
        (user.organization?.erp_domain?.status === "active" || user.organization?.erp_domain?.status === "verified") 
          ? user.organization?.erp_domain?.domain 
          : (user.organization?.custom_domain?.status === "active" ? user.organization?.custom_domain?.domain : null)
      }
    >
      <DashboardLayout role={role} user={user}>
        <Outlet />
      </DashboardLayout>
    </DomainEnforcer>
  );
}
