/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
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

const DEPARTMENT_ADMIN_USER_ROLES = ["hod"];
const DEPARTMENT_ADMIN_APP_ROLES = ["hod", "department_admin", "dept_admin"];
const FACULTY_ROLES = ["faculty", "teacher"];

const SCHEDULED_TARGET_ALIASES = {
    super_admins: "all_super_admins",
    active_orgs: "active_orgs",
    hod: "all_department_admins",
    all_hods: "all_department_admins",
    dept_admin: "all_department_admins",
    department_admin: "all_department_admins",
};

const VALID_SCHEDULED_TARGETS = new Set([
    "global",
    "active_orgs",
    "all_org_admins",
    "all_super_admins",
    "all_students",
    "all_faculty",
    "all_department_admins",
    "specific_org",
]);

const USER_ROLE_TARGETS = {
    all_students: ["student"],
    all_faculty: FACULTY_ROLES,
    all_org_admins: ["org_admin"],
    all_super_admins: ["super_admin"],
    all_department_admins: DEPARTMENT_ADMIN_USER_ROLES,
    student: ["student"],
    faculty: FACULTY_ROLES,
    teacher: ["teacher"],
    org_admin: ["org_admin"],
    super_admin: ["super_admin"],
    hod: DEPARTMENT_ADMIN_USER_ROLES,
    dept_admin: DEPARTMENT_ADMIN_USER_ROLES,
    department_admin: DEPARTMENT_ADMIN_USER_ROLES,
};

const APP_ROLE_TARGETS = {
    all_students: ["student"],
    all_faculty: FACULTY_ROLES,
    all_org_admins: ["org_admin"],
    all_super_admins: ["super_admin"],
    all_department_admins: DEPARTMENT_ADMIN_APP_ROLES,
    student: ["student"],
    faculty: FACULTY_ROLES,
    teacher: ["teacher"],
    org_admin: ["org_admin"],
    super_admin: ["super_admin"],
    hod: DEPARTMENT_ADMIN_APP_ROLES,
    dept_admin: DEPARTMENT_ADMIN_APP_ROLES,
    department_admin: DEPARTMENT_ADMIN_APP_ROLES,
};

export function normalizeAppRole(role = "") {
    const key = String(role || "").trim().toLowerCase();
    if (key === "department_admin" || key === "dept_admin") return "hod";
    return key || "student";
}

export function normalizeScheduledTarget(target = "global") {
    const key = String(target || "global").trim().toLowerCase();
    const normalized = SCHEDULED_TARGET_ALIASES[key] || key;
    return VALID_SCHEDULED_TARGETS.has(normalized) ? normalized : "global";
}

export function getUserRolesForTarget(target = "") {
    const key = normalizeScheduledTarget(target);
    return USER_ROLE_TARGETS[key] || USER_ROLE_TARGETS[String(target || "").trim().toLowerCase()] || [];
}

export function getAppRolesForTarget(target = "") {
    const key = normalizeScheduledTarget(target);
    return APP_ROLE_TARGETS[key] || APP_ROLE_TARGETS[String(target || "").trim().toLowerCase()] || [];
}

export function buildUserRoleFilter(roles = []) {
    if (!roles.length) return {};
    return { $or: [{ role: { $in: roles } }, { additional_roles: { $in: roles } }] };
}
