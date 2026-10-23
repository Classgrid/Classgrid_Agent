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
 * multipleRoles.js — Classgrid Multiple Role System
 * ====================================================
 * 
 * WHAT IS THE MULTIPLE ROLE SYSTEM?
 * ----------------------------------
 * Every person in Classgrid has ONE main role (stored in user.role).
 * They can request ONE additional role (stored in user.additional_roles[]).
 * Maximum 2 roles per person at any time. No exceptions.
 * 
 * There are NO restrictions on which role they pick as additional.
 * A principal can also be a teacher. A fee_manager can also be in admissions.
 * Anyone can hold any 2 roles from their org type's available roles.
 * 
 * HOW DASHBOARDS WORK:
 * ---------------------
 * HOW DASHBOARDS WORK:
 * ---------------------
 * - user.role → determines which dashboard they see on login
 * - If additional_roles[] has a role from a DIFFERENT dashboard → header switcher appears
 * - If additional_roles[] has a role from the SAME dashboard group → no switcher (just more access)
 * - To access a dashboard, you MUST hold a role that maps to it. No shortcut.
 * 
 * THE 10 DASHBOARDS:
 * -------------------
 * 1. student          → /student/agent
 * 2. faculty          → /faculty/agent               (faculty, counselor)
 * 3. org_admin        → /org/admin/agent             (org_admin, principal, vice_principal, hod, coordinator, tpo_officer)
 * 4. admissions       → /dept/admissions/agent       (admission_head, admission_counselor, admission_verifier, admission_clerk)
 * 5. examination      → /dept/exams/agent            (exam_controller)
 * 6. fees             → /dept/fees/agent             (fee_manager)
 * 7. library          → /dept/library/agent          (library_manager, library_admin)
 * 8. hostel_transport → /dept/transport/agent        (transport_manager, hostel_manager)
 * 9. hr_payroll       → /dept/hr/agent               (hr_admin)
 * 10. attendance      → /dept/attendance/agent       (attendance_admin)
 * 
 * RULES ENFORCED BY THIS FILE:
 * -----------------------------
 * 1. Max 2 roles: user.role (1) + user.additional_roles[] max length 1
 * 2. No duplicate roles: cannot request a role already held
 * 3. student/org_admin/super_admin cannot be requested (system roles)
 * 4. Requested role must exist in org's ORG_ROLE_MAPPING
 * 5. Tenant ID must match user's organization
 * 
 * FILE USED BY:
 * - server/src/routes/org.routes.js → /request-role, /accept-role-request
 * - server/src/controllers/auth.controller.js → getFrontendDashboardTarget
 */

import { ORG_ROLE_MAPPING, ROLE_DEFINITIONS } from './roles.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum number of roles a single user can hold (main + additional) */
export const MAX_ROLES_PER_USER = 2;

/**
 * Roles that are SYSTEM roles — cannot be requested via self-serve or invite.
 * org_admin is created during org setup.
 * super_admin is platform-level only.
 * student joins differently (PRN-based or admin CSV upload).
 */
export const SYSTEM_ROLES = ['org_admin', 'super_admin', 'co_super_admin', 'student'];

/**
 * Maps every role key to its dashboard key.
 * This is the single source of truth for backend dashboard routing.
 * Frontend copy: client/src/lib/dashboardRoleMap.ts
 */
export const ROLE_TO_DASHBOARD = {
    student:              'student',
    faculty:              'faculty',
    teacher:              'faculty',
    counselor:            'faculty',
    org_admin:            'org_admin',
    principal:            'org_admin',
    vice_principal:       'org_admin',
    hod:                  'org_admin',
    coordinator:          'org_admin',
    tpo_officer:          'org_admin',
    exam_controller:      'examination',
    fee_manager:          'fees',
    library_manager:      'library',
    library_admin:        'library',
    admission_head:       'admissions',
    admission_counselor:  'admissions',
    admission_verifier:   'admissions',
    admission_clerk:      'admissions',
    transport_manager:    'hostel_transport',
    hostel_manager:       'hostel_transport',
    hr_admin:             'hr_payroll',
    attendance_admin:     'attendance',
    super_admin:          'super_admin',
    co_super_admin:       'super_admin',
};

/**
 * Maps each dashboard key to its frontend path.
 */
export const DASHBOARD_PATHS = {
    student:          '/student/agent',
    faculty:          '/faculty/agent',
    org_admin:        '/org/admin/dashboard',
    admissions:       '/dept/admissions/dashboard',
    examination:      '/dept/exams/dashboard',
    fees:             '/dept/fees/dashboard',
    library:          '/dept/library/dashboard',
    hostel_transport: '/dept/transport/dashboard',
    hr_payroll:       '/dept/hr/dashboard',
    attendance:       '/dept/attendance/dashboard',
    super_admin:      '/superadmin/dashboard',
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the dashboard key for a given role.
 * @param {string} role
 * @returns {string|null} dashboard key
 */
export function getDashboardForRole(role) {
    return ROLE_TO_DASHBOARD[role] || null;
}

/**
 * Get the frontend path for a given role.
 * @param {string} role
 * @returns {string} frontend dashboard path
 */
export function getDashboardPathForRole(role) {
    const dashKey = ROLE_TO_DASHBOARD[role];
    return DASHBOARD_PATHS[dashKey] || '/work';
}

/**
 * Check if a user can request an additional role.
 * Returns { allowed: true } or { allowed: false, reason: "..." }
 * 
 * Rules:
 * 1. User must not already have MAX_ROLES_PER_USER roles
 * 2. Requested role must not be a SYSTEM_ROLE
 * 3. Requested role must not be already held (main or additional)
 * 4. Requested role must exist in org's available roles
 * 
 * @param {object} user - The user document { role, additional_roles, organization_id }
 * @param {string} requestedRole - The role key being requested
 * @param {object} org - The organization document { org_type, structure_type }
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canUserRequestRole(user, requestedRole, org) {
    const additionalRoles = user.additional_roles || [];
    const totalRoles = 1 + additionalRoles.length; // main role + additional roles

    // Rule 1: Max 2 roles
    if (totalRoles >= MAX_ROLES_PER_USER) {
        return {
            allowed: false,
            reason: `You already have the maximum of ${MAX_ROLES_PER_USER} roles. Remove an existing additional role before adding a new one.`
        };
    }

    // Rule 2: Cannot request system roles
    if (SYSTEM_ROLES.includes(requestedRole)) {
        return {
            allowed: false,
            reason: 'This role cannot be requested. Contact your platform administrator.'
        };
    }

    // Rule 3: Cannot request a role already held
    if (user.role === requestedRole || additionalRoles.includes(requestedRole)) {
        return {
            allowed: false,
            reason: 'You already have this role.'
        };
    }

    // Rule 4: Role must exist in org's role mapping
    const orgType = org?.org_type || org?.structure_type || 'engineering';
    const baseType = normalizeOrgType(orgType);
    const availableRoles = ORG_ROLE_MAPPING[baseType] || [];
    if (!availableRoles.includes(requestedRole)) {
        return {
            allowed: false,
            reason: 'This role is not available for your organization type.'
        };
    }

    return { allowed: true };
}

/**
 * Get all dashboards a user can access based on their roles.
 * Used by frontend to determine if dashboard switcher should be shown.
 * 
 * @param {string} mainRole - user.role
 * @param {string[]} additionalRoles - user.additional_roles
 * @returns {Array<{ key: string, label: string, path: string }>}
 */
export function getAccessibleDashboards(mainRole, additionalRoles = []) {
    const seen = new Set();
    const result = [];

    const allRoles = [mainRole, ...additionalRoles].filter(Boolean);

    for (const role of allRoles) {
        const dashKey = ROLE_TO_DASHBOARD[role];
        if (dashKey && !seen.has(dashKey)) {
            seen.add(dashKey);
            result.push({
                key: dashKey,
                label: DASHBOARD_LABELS[dashKey] || dashKey,
                path: DASHBOARD_PATHS[dashKey] || '/',
            });
        }
    }

    return result;
}

/**
 * Human-readable labels for each dashboard key.
 */
export const DASHBOARD_LABELS = {
    student:          'Student Dashboard',
    faculty:          'Faculty Dashboard',
    org_admin:        'Admin Dashboard',
    admissions:       'Admissions Dashboard',
    examination:      'Examination Dashboard',
    fees:             'Fees Dashboard',
    library:          'Library Dashboard',
    hostel_transport: 'Transport & Hostel Dashboard',
    hr_payroll:       'HR & Payroll Dashboard',
    attendance:       'Attendance Dashboard',
    super_admin:      'Super Admin Dashboard',
};

/**
 * Remove an additional role from a user.
 * Called when: user wants to swap their additional role for a different one.
 * @param {object} user - Mongoose user document
 * @param {string} roleToRemove - role key to remove from additional_roles
 * @returns {boolean} true if removed, false if not found
 */
export function removeAdditionalRole(user, roleToRemove) {
    const before = (user.additional_roles || []).length;
    user.additional_roles = (user.additional_roles || []).filter(r => r !== roleToRemove);
    return user.additional_roles.length < before;
}

/**
 * Add an additional role to a user (after validation).
 * @param {object} user - Mongoose user document
 * @param {string} role - role key to add
 */
export function addAdditionalRole(user, role) {
    if (!user.additional_roles) user.additional_roles = [];
    if (!user.additional_roles.includes(role)) {
        user.additional_roles.push(role);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize any org_type or structure_type string to a base key.
 * e.g. "engineering_no_div" → "engineering"
 */
export function normalizeOrgType(orgType) {
    const t = String(orgType || 'engineering').toLowerCase();
    if (t.startsWith('school')) return 'school';
    if (t.startsWith('junior_college')) return 'junior_college';
    if (t.startsWith('engineering')) return 'engineering';
    if (t.startsWith('diploma')) return 'diploma';
    if (t.startsWith('coaching')) return 'coaching';
    return 'engineering';
}
