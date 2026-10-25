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
 * dashboardRoleMap.ts
 * Single source of truth: maps every role key to its dashboard key + path.
 * Used by:
 *  - SettingsRoleRequestCard: filter out roles user already has
 *  - DashboardLayout header: show switcher when additional_roles span different dashboards
 *  - ERP_DASHBOARD_PATHS in org.routes.js (backend)
 */

export type DashboardKey =
  | "student"
  | "faculty"
  | "org_admin"
  | "admissions"
  | "examination"
  | "fees"
  | "library"
  | "hostel_transport"
  | "hr_payroll"
  | "attendance"
  | "super_admin";

export interface DashboardInfo {
  key: DashboardKey;
  label: string;
  path: string;
  icon: string; // emoji for now
}

/** Maps every role key → its dashboard */
export const ROLE_TO_DASHBOARD: Record<string, DashboardKey> = {
  student:             "student",
  faculty:             "faculty",
  teacher:             "faculty",
  counselor:           "faculty",
  org_admin:           "org_admin",
  principal:           "org_admin",
  vice_principal:      "org_admin",
  hod:                 "org_admin",
  coordinator:         "org_admin",
  tpo_officer:         "org_admin",
  exam_controller:     "examination",
  fee_manager:         "fees",
  library_manager:     "library",
  library_admin:       "library",
  admission_head:      "admissions",
  admission_counselor: "admissions",
  admission_verifier:  "admissions",
  admission_clerk:     "admissions",
  transport_manager:   "hostel_transport",
  hostel_manager:      "hostel_transport",
  hr_admin:            "hr_payroll",
  attendance_admin:    "attendance",
  super_admin:         "super_admin",
  co_super_admin:      "super_admin",
};

/** Full dashboard metadata for the 10 dashboards */
export const DASHBOARDS: Record<DashboardKey, DashboardInfo> = {
  student:         { key: "student",         label: "Student Dashboard",         path: "/student/work",                icon: "🎓" },
  faculty:         { key: "faculty",          label: "Faculty Dashboard",          path: "/agent",                       icon: "📚" },
  org_admin:       { key: "org_admin",        label: "Admin Dashboard",            path: "/org/admin/dashboard",         icon: "🏛️" },
  admissions:      { key: "admissions",       label: "Admissions Dashboard",       path: "/dept/admissions/dashboard",   icon: "🎓" },
  examination:     { key: "examination",      label: "Examination Dashboard",      path: "/dept/exams/dashboard",        icon: "📝" },
  fees:            { key: "fees",             label: "Fees Dashboard",             path: "/dept/fees/dashboard",         icon: "💰" },
  library:         { key: "library",          label: "Library Dashboard",          path: "/dept/library/dashboard",      icon: "📖" },
  hostel_transport:{ key: "hostel_transport", label: "Transport & Hostel",         path: "/dept/transport/dashboard",    icon: "🚌" },
  hr_payroll:      { key: "hr_payroll",       label: "HR & Payroll Dashboard",     path: "/dept/hr/dashboard",           icon: "👥" },
  attendance:      { key: "attendance",       label: "Attendance Dashboard",       path: "/dept/attendance/dashboard",   icon: "✅" },
  super_admin:     { key: "super_admin",      label: "Super Admin Dashboard",      path: "/superadmin/dashboard",        icon: "⚡" },
};

/**
 * Given a user's main role + additional_roles,
 * returns the list of DISTINCT dashboards they can access.
 * Only returns dashboards from additional_roles that differ from the main role's dashboard.
 */
export function getAccessibleDashboards(
  mainRole: string,
  additionalRoles: string[] = []
): DashboardInfo[] {
  const mainDashKey = ROLE_TO_DASHBOARD[mainRole];
  const mainDash = mainDashKey ? DASHBOARDS[mainDashKey] : null;

  const seen = new Set<DashboardKey>(mainDashKey ? [mainDashKey] : []);
  const result: DashboardInfo[] = mainDash ? [mainDash] : [];

  for (const role of additionalRoles) {
    const dk = ROLE_TO_DASHBOARD[role];
    if (dk && !seen.has(dk)) {
      seen.add(dk);
      result.push(DASHBOARDS[dk]);
    }
  }

  return result;
}

/**
 * Returns roles that the user does NOT already hold (for dropdown filtering).
 * Filters out: main role, additional_roles, and system roles (student, org_admin, super_admin).
 */
export function filterAvailableRoles(
  roles: Array<{ value: string; label: string; [key: string]: any }>,
  mainRole: string,
  additionalRoles: string[] = []
): Array<{ value: string; label: string; [key: string]: any }> {
  const held = new Set([mainRole, ...additionalRoles, "org_admin", "super_admin", "co_super_admin", "student"]);
  return roles.filter((r) => !held.has(r.value));
}
