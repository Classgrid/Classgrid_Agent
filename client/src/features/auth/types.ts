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

export type AuthType = "platform" | "institution";

export type LeftPanelVariant = "image" | "default";

export type AuthAudience = "user" | "admin" | "super_admin";

export type AuthUserRole = "student" | "teacher";

export type InstitutionAdminRole =
  | "org_admin"
  | "library_manager"
  | "library_admin"
  | "attendance_admin"
  | "hr_dept"
  | "hostel_dept"
  | "hod"
  | "principal"
  | "vice_principal"
  | "exam_controller"
  | "fee_manager"
  | "admission_head"
  | "admission_verifier"
  | "admission_counselor"
  | "admission_clerk"
  | "tpo_officer"
  | "transport_manager"
  | "counselor"
  | "coordinator";

export type AuthLoginRole = AuthUserRole | InstitutionAdminRole | "super_admin";

export type AuthIntent = "student" | "teacher" | "admin" | "super_admin";

export type AuthBranding = {
  authType: AuthType;
  name: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl?: string;
  campusImageUrl: string;
  leftVariant: LeftPanelVariant;
  subdomain: string;
  siteTitle?: string;
  customDomain?: string | null;
  marketingDomain?: string | null;
  allowClassgridUrl?: boolean;
  isCustomDomainEnabled?: boolean;
  socialLinks?: {
    instagram_url?: string;
    youtube_url?: string;
    facebook_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    github_url?: string;
    website_url?: string;
  };
};

export type AuthBrandingResponse = {
  success: boolean;
  branding: AuthBranding;
};

export type LoginResponse = {
  message: string;
  firstLogin?: boolean;
  mustResetPassword?: boolean;
  needsOrgCode?: boolean;
  needsDeviceOtp?: boolean;
  retryAfterSeconds?: number;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    organization_id?: string | null;
  };
  organization?: {
    name: string;
    logo?: string;
    subdomain?: string;
  } | null;
};
