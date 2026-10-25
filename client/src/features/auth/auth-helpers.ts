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

import type {
  AuthAudience,
  AuthIntent,
  AuthLoginRole,
  AuthUserRole,
  InstitutionAdminRole,
  LoginResponse,
} from "./types";

const AUTH_STORAGE_KEY = "classgrid:last-auth-role";

const institutionAdminRoles: InstitutionAdminRole[] = [
  "org_admin",
  "library_manager",
  "library_admin",
  "attendance_admin",
  "hr_dept",
  "hostel_dept",
  "hod",
  "principal",
  "vice_principal",
  "exam_controller",
  "fee_manager",
  "admission_head",
  "admission_verifier",
  "admission_counselor",
  "admission_clerk",
  "tpo_officer",
  "transport_manager",
  "counselor",
  "coordinator",
];

const institutionAdminRoleSet = new Set<InstitutionAdminRole>(institutionAdminRoles);

const roleLabels: Record<AuthLoginRole, string> = {
  student: "Student",
  teacher: "Faculty",
  org_admin: "Organization Admin",
  library_manager: "Library Manager",
  library_admin: "Library Admin",
  attendance_admin: "Attendance Admin",
  hr_dept: "HR Admin",
  hostel_dept: "Hostel Admin",
  hod: "Head of Department",
  principal: "Principal",
  vice_principal: "Vice Principal",
  exam_controller: "Exam Controller",
  fee_manager: "Fees Manager",
  admission_head: "Admissions Head",
  admission_verifier: "Admissions Verifier",
  admission_counselor: "Admissions Counselor",
  admission_clerk: "Admissions Clerk",
  tpo_officer: "Placement Officer",
  transport_manager: "Transport Manager",
  counselor: "Counselor",
  coordinator: "Coordinator",
  super_admin: "Super Admin",
};

const portalLabels: Record<AuthLoginRole, string> = {
  student: "Student Portal",
  teacher: "Faculty Portal",
  org_admin: "Organization Admin Portal",
  library_manager: "Library Portal",
  library_admin: "Library Portal",
  attendance_admin: "Attendance Portal",
  hr_dept: "HR Portal",
  hostel_dept: "Hostel Portal",
  hod: "Department Portal",
  principal: "Principal Portal",
  vice_principal: "Vice Principal Portal",
  exam_controller: "Examinations Portal",
  fee_manager: "Fees Portal",
  admission_head: "Admissions Portal",
  admission_verifier: "Admissions Portal",
  admission_counselor: "Admissions Portal",
  admission_clerk: "Admissions Portal",
  tpo_officer: "Placement Portal",
  transport_manager: "Transport Portal",
  counselor: "Counselor Portal",
  coordinator: "Coordinator Portal",
  super_admin: "Super Admin Portal",
};

export function normalizeAuthRole(value: string | null | undefined): AuthLoginRole | null {
  if (!value) return null;

  if (value === "faculty") return "teacher";
  if (value === "admin") return "org_admin";
  if (value === "library_admin" || value === "librarian") return "library_manager";
  if (value === "attendance_admin") return "attendance_admin";
  if (value === "hr" || value === "hr_admin" || value === "hr_manager") return "hr_dept";
  if (value === "hostel" || value === "hostel_admin" || value === "hostel_manager") return "hostel_dept";

  if (value === "student" || value === "teacher" || value === "super_admin") {
    return value;
  }

  return institutionAdminRoleSet.has(value as InstitutionAdminRole) ? (value as InstitutionAdminRole) : null;
}

export function isInstitutionAdminRole(value: string | null | undefined): value is InstitutionAdminRole {
  const normalized = normalizeAuthRole(value);
  return normalized ? institutionAdminRoleSet.has(normalized as InstitutionAdminRole) : false;
}

export function isUserRole(value: string | null | undefined): value is AuthUserRole {
  const normalized = normalizeAuthRole(value);
  return normalized === "student" || normalized === "teacher";
}

export function readStoredAuthRole() {
  if (typeof window === "undefined") return null;

  try {
    return normalizeAuthRole(window.localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveStoredAuthRole(value: string | null | undefined) {
  if (typeof window === "undefined") return;

  const normalized = normalizeAuthRole(value);
  if (!normalized) return;

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, normalized);
  } catch {
    // Ignore localStorage write failures.
  }
}

export function getRoleLabel(value: string | null | undefined) {
  const normalized = normalizeAuthRole(value);
  return normalized ? roleLabels[normalized] : "Portal";
}

export function getPortalLabel(value: string | null | undefined) {
  const normalized = normalizeAuthRole(value);
  return normalized ? portalLabels[normalized] : "Classgrid Portal";
}

export function getDefaultRoleForAudience(
  audience: AuthAudience,
  rememberedRole: AuthLoginRole | null,
  preferredRole?: AuthUserRole | null
): AuthLoginRole {
  if (audience === "super_admin") return "super_admin";
  if (audience === "admin") {
    return isInstitutionAdminRole(rememberedRole) ? rememberedRole : "org_admin";
  }

  if (preferredRole) return preferredRole;
  return isUserRole(rememberedRole) ? rememberedRole : "student";
}

export function getAuthIntent(audience: AuthAudience, role: AuthLoginRole): AuthIntent {
  if (audience === "super_admin") return "super_admin";
  if (audience === "admin") return "admin";
  return role === "teacher" ? "teacher" : "student";
}

export function getRedirectPath(role: string | null | undefined) {
  if (typeof window !== 'undefined') {
    const subdomain = window.location.hostname.split('.')[0];
    if (subdomain === 'chat') return '/c/agent';
  }
  // The ERP dashboards are shut down: super admins go to the super admin dashboard, everyone else to Classgrid AI
  return normalizeAuthRole(role) === "super_admin" ? "/superadmin/dashboard" : "/agent";
}

/** Resolve mandatory first-login steps before the normal role dashboard. */
export function getPostLoginPath(result: LoginResponse) {
  if (result.mustResetPassword) return "/required-password-reset";
  if (result.needsOrgCode) return "/enter-org-code";

  const dashboard = getRedirectPath(result.user?.role);
  return result.firstLogin ? `${dashboard}?welcome=true` : dashboard;
}

export type AuthCallbackFeedback = {
  message: string;
  suggestedRole?: AuthUserRole;
};

/** Convert OAuth callback query codes into safe, human-readable feedback. */
export function getAuthCallbackFeedback(search: string): AuthCallbackFeedback | null {
  const params = new URLSearchParams(search);
  const error = params.get("error");
  if (!error) return null;

  switch (error) {
    case "account_suspended":
      return { message: "This account is suspended. Contact your administrator or Classgrid support." };
    case "wrong_portal":
      return { message: "This account belongs to a different portal. Open the correct Classgrid sign-in page and try again." };
    case "wrong_tab": {
      const tab = params.get("tab");
      const suggestedRole = tab === "teacher" ? "teacher" : tab === "student" ? "student" : undefined;
      return {
        message: suggestedRole
          ? `This account belongs to the ${suggestedRole === "teacher" ? "Faculty" : "Student"} portal. The correct tab is now selected.`
          : "This account belongs to a different sign-in tab.",
        suggestedRole,
      };
    }
    case "maintenance_mode":
      return { message: "Classgrid is temporarily in maintenance mode. Please try again later." };
    case "org_suspended":
      return { message: "This organization portal is suspended. Contact the organization administrator." };
    case "no_email":
      return { message: "The sign-in provider did not share an email address. Choose an account with an email address." };
    case "google_blocked":
    case "google_error":
      return { message: "Google sign-in could not be completed. Please try again or use your password." };
    case "AuthFailed":
    case "no_user_data":
    default:
      return { message: "Sign-in could not be completed. Please try again." };
  }
}

export function clearAuthCallbackError() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  ["error", "message", "tab", "provider"].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

/** Redirect a disabled custom hostname to the backend-provided safe hostname. */
export function redirectToBrandingFallback(error: unknown) {
  if (typeof window === "undefined" || !error || typeof error !== "object") return false;
  const fallbackUrl = (error as { fallbackUrl?: unknown }).fallbackUrl;
  if (typeof fallbackUrl !== "string" || !fallbackUrl) return false;

  try {
    const target = new URL(fallbackUrl, window.location.origin);
    if (target.protocol !== "https:" && target.protocol !== "http:") return false;
    if (target.hostname === window.location.hostname) return false;

    // Keep the exact portal (student, faculty, organization, or department)
    // while changing only to the backend-authorized fallback hostname.
    target.pathname = window.location.pathname;
    target.search = window.location.search;
    window.location.replace(target.toString());
    return true;
  } catch {
    return false;
  }
}

export function getLoginPathForPath(pathname: string) {
  // Only two login pages are left: super admin, and Classgrid AI for everyone else (the ERP logins are gone)
  return pathname.startsWith("/superadmin") ? "/superadmin/login" : "/login";
}

type AuthHeadingArgs = {
  audience: AuthAudience;
  brandingName: string;
  rememberedRole?: AuthLoginRole | null;
  preferredRole?: AuthUserRole | null;
  lockedRole?: AuthUserRole | null;
};

export function getAuthHeading({
  audience,
  brandingName,
  rememberedRole,
  preferredRole,
  lockedRole,
}: AuthHeadingArgs) {
  if (audience === "super_admin") {
    return {
      title: "Super Admin Portal",
      subtitle: "Secure access for Classgrid platform operators.",
    };
  }

  if (audience === "admin") {
    if (isInstitutionAdminRole(rememberedRole)) {
      const rememberedLabel =
        rememberedRole === "org_admin"
          ? "Welcome back, Organization Admin"
          : `Welcome back to the ${getPortalLabel(rememberedRole)}`;

      return {
        title: rememberedLabel,
        subtitle: `Continue to ${brandingName}.`,
      };
    }

    return {
      title: "Admin Sign In",
      subtitle: `For organization and department administrators at ${brandingName}.`,
    };
  }

  if (lockedRole) {
    return {
      title: `${getRoleLabel(lockedRole)} Sign In`,
      subtitle: `This session is locked to the ${getPortalLabel(lockedRole).toLowerCase()}.`,
    };
  }

  if (isUserRole(rememberedRole)) {
    return {
      title: `Welcome back, ${getRoleLabel(rememberedRole)}`,
      subtitle: `Continue to ${brandingName}.`,
    };
  }

  if (preferredRole) {
    return {
      title: `${getRoleLabel(preferredRole)} Sign In`,
      subtitle: `Use your institution email to continue to ${brandingName}.`,
    };
  }

  return {
    title: "Log in or sign up",
    subtitle: `Use your institution email to continue to ${brandingName}.`,
  };
}
