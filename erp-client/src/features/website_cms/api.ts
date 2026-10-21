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

import { apiClient } from "@/lib/apiClient";

export type WebsiteCMSPageKey = "home" | "about" | "admissions" | "facilities" | "contact";
export type WebsiteCMSPageStatus = "published" | "draft";

export type WebsiteCMSStoredPage = {
  html?: string;
  status?: WebsiteCMSPageStatus;
  updatedAt?: string;
};

export type OrgWebsiteContent = {
  _id?: string;
  organization_id?: string;
  org_slug?: string;
  isPublished?: boolean;
  updatedAt?: string;
  pages?: Partial<Record<WebsiteCMSPageKey, WebsiteCMSStoredPage>>;
  institution?: {
    name?: string;
    shortName?: string;
    type?: string;
    tagline?: string;
    location?: string;
    address?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
  };
  hero?: {
    badge?: string;
    headline?: string;
    subHeadline?: string;
    description?: string;
  };
  principal?: {
    name?: string;
    designation?: string;
    message?: string;
  };
  story?: string;
  vision?: string;
  mission?: string;
  admissionBanner?: {
    title?: string;
    description?: string;
    ctaLabel?: string;
  };
  programs?: Array<{
    name?: string;
    description?: string;
    duration?: string;
    eligibility?: string;
    intake?: string;
  }>;
  infrastructure?: Array<{
    category?: string;
    name?: string;
    description?: string;
  }>;
  contactPage?: {
    officeHours?: string;
    mapEmbedUrl?: string;
  };
};

type OrgWebsiteContentResponse = {
  success: boolean;
  message?: string;
  data?: OrgWebsiteContent;
};

export type OrgWebsiteUpdatePayload = Record<string, unknown>;

export async function fetchOrgWebsiteContent() {
  const response = await apiClient.get<OrgWebsiteContentResponse>("/api/org-website/my-content");
  return response.data.data ?? null;
}

export async function setupOrgWebsiteContent(payload = {}) {
  const response = await apiClient.post<OrgWebsiteContentResponse>("/api/org-website/setup", payload);
  return response.data.data ?? null;
}

export async function updateOrgWebsiteContent(payload: OrgWebsiteUpdatePayload) {
  const response = await apiClient.patch<OrgWebsiteContentResponse>("/api/org-website/update", payload);
  return response.data.data ?? null;
}