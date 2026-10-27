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

/**
 * roles.js — Centralized Role Mapping by Organization Type
 * 
 * Defines exactly which roles are allowed for each organization type,
 * along with human-readable labels and categories.
 * Used by the backend to serve dynamic role lists to the frontend, preventing hardcoding.
 * 
 * NEVER hardcode role labels on the frontend — always fetch from GET /api/hierarchy/roles
 */

/**
 * Master role definitions — single source of truth for labels, descriptions, and categories.
 * category: "staff" = teaching staff, "dept_admin" = department-level admin, "leadership" = principal/VP
 */
export const ROLE_DEFINITIONS = {
    student:              { label: "Student",                       category: "student",    dashboard: "student",          description: "Enrolled student" },
    teacher:              { label: "Teacher",                       category: "staff",      dashboard: "faculty",          description: "Teaching staff" },
    faculty:              { label: "Faculty",                       category: "staff",      dashboard: "faculty",          description: "Teaching faculty member" },
    org_admin:            { label: "Organization Admin",            category: "admin",      dashboard: "org_admin",        description: "Full organization administrator" },
    super_admin:          { label: "Super Admin",                   category: "system",     dashboard: "super_admin",      description: "Platform-level super administrator" },
    
    // Leadership & Academics all share the Org Admin Dashboard (with specific RBAC inside)
    principal:            { label: "Principal",                     category: "leadership", dashboard: "org_admin",        description: "Head of the institution" },
    vice_principal:       { label: "Vice Principal",                category: "leadership", dashboard: "org_admin",        description: "Deputy head of institution" },
    hod:                  { label: "Head of Department (HOD)",      category: "dept_admin", dashboard: "org_admin",        description: "Manages a specific academic department" },
    coordinator:          { label: "Academic Coordinator",          category: "dept_admin", dashboard: "org_admin",        description: "Coordinates academic activities" },
    
    // Core Department Dashboards
    exam_controller:      { label: "Examination Controller",        category: "dept_admin", dashboard: "examination",      description: "Manages examinations and results" },
    fee_manager:          { label: "Fees & Accounts Manager",       category: "dept_admin", dashboard: "fees",             description: "Manages fee collection, billing, accounts" },
    library_manager:      { label: "Library Manager",               category: "dept_admin", dashboard: "library",          description: "Manages library resources and circulation" },
    library_admin:        { label: "Library Admin",                 category: "dept_admin", dashboard: "library",          description: "Assists with library operations" },
    attendance_admin:     { label: "Attendance Admin",              category: "dept_admin", dashboard: "attendance",       description: "Manages attendance records and tracking" },
    hr_admin:             { label: "HR & Payroll Admin",            category: "dept_admin", dashboard: "hr_payroll",       description: "Manages staff HR and payroll" },
    
    // Admissions Team shares the Admissions Dashboard
    admission_head:       { label: "Admissions Department Head",    category: "dept_admin", dashboard: "admissions",       description: "Heads the admissions department" },
    admission_verifier:   { label: "Admission Verifier",            category: "dept_admin", dashboard: "admissions",       description: "Verifies admission documents and eligibility" },
    admission_counselor:  { label: "Admission Counselor",           category: "dept_admin", dashboard: "admissions",       description: "Guides students through admission process" },
    admission_clerk:      { label: "Admission Clerk",               category: "dept_admin", dashboard: "admissions",       description: "Handles admission paperwork and data entry" },
    
    // Logistics Team shares the Hostel & Transport Dashboard
    transport_manager:    { label: "Transport Manager",             category: "dept_admin", dashboard: "hostel_transport", description: "Manages buses, routes, and transport logistics" },
    hostel_manager:       { label: "Hostel Manager",                category: "dept_admin", dashboard: "hostel_transport", description: "Manages hostel accommodation and operations" },
    
    // Others
    tpo_officer:          { label: "Training & Placement Officer",  category: "dept_admin", dashboard: "org_admin",        description: "Manages placements, internships, and recruitment" },
    counselor:            { label: "Student Counselor",             category: "dept_admin", dashboard: "faculty",          description: "Handles student counseling and well-being" },
};

/**
 * Per-org-type label overrides.
 * The "teacher" role is called differently depending on org type.
 * Only specify overrides; defaults come from ROLE_DEFINITIONS.
 */
const ORG_LABEL_OVERRIDES = {
    school: {
        teacher: { label: "Teacher" },
        faculty: { label: "Teacher" },
    },
    junior_college: {
        teacher: { label: "Lecturer" },
        faculty: { label: "Lecturer" },
    },
    engineering: {
        teacher: { label: "Faculty" },
        faculty: { label: "Faculty" },
    },
    diploma: {
        teacher: { label: "Faculty" },
        faculty: { label: "Faculty" },
    },
    coaching: {
        teacher: { label: "Mentor" },
        faculty: { label: "Mentor" },
    },
};

/**
 * Which roles are available for each org type.
 * Order matters — this is the order shown in dropdowns.
 */
export const ORG_ROLE_MAPPING = {
    school: [
        "student", "faculty", "org_admin",
        "principal", "vice_principal", "coordinator",
        "exam_controller", "fee_manager", "library_manager", "transport_manager", "hostel_manager", "counselor",
        "admission_head", "admission_counselor", "admission_verifier", "admission_clerk",
        "attendance_admin", "hr_admin"
    ],
    junior_college: [
        "student", "faculty", "org_admin",
        "principal", "vice_principal", "hod", "coordinator",
        "exam_controller", "fee_manager", "library_manager", "transport_manager", "hostel_manager", "counselor",
        "admission_head", "admission_counselor", "admission_verifier", "admission_clerk",
        "attendance_admin", "hr_admin"
    ],
    engineering: [
        "student", "faculty", "org_admin",
        "principal", "vice_principal", "hod", "coordinator",
        "exam_controller", "fee_manager", "library_manager", "transport_manager", "hostel_manager", "tpo_officer", "counselor",
        "admission_head", "admission_counselor", "admission_verifier", "admission_clerk",
        "attendance_admin", "hr_admin"
    ],
    diploma: [
        "student", "faculty", "org_admin",
        "principal", "vice_principal", "hod", "coordinator",
        "exam_controller", "fee_manager", "library_manager", "transport_manager", "hostel_manager", "tpo_officer", "counselor",
        "admission_head", "admission_counselor", "admission_verifier", "admission_clerk",
        "attendance_admin", "hr_admin"
    ],
    coaching: [
        "student", "faculty", "org_admin",
        "hod", "coordinator",
        "fee_manager", "counselor",
        "admission_head", "admission_counselor", "admission_clerk",
        "attendance_admin", "hr_admin"
    ]
};

// The exhaustive list of ALL roles in the system, visible to Super Admins
export const SUPER_ADMIN_ROLES = [
    "student", "teacher", "faculty", "org_admin", "super_admin",
    "hod", "principal", "vice_principal", "exam_controller", "fee_manager", 
    "admission_head", "admission_verifier", "admission_counselor", "admission_clerk",
    "tpo_officer", "library_manager", "library_admin", "transport_manager", "hostel_manager", "counselor", "coordinator",
    "attendance_admin", "hr_admin"
];

/**
 * Get the available roles for a specific organization type.
 * @param {string} orgType - The organization type (e.g., 'school', 'engineering')
 * @param {string} userRole - The role of the user requesting the list
 * @returns {string[]} Array of role keys
 */
export function getAvailableRoles(orgType, userRole) {
    if (userRole === "super_admin") {
        return SUPER_ADMIN_ROLES;
    }

    // Default to engineering if unknown orgType just to be safe
    const mappedType = orgType || "engineering";
    
    // For specific structure_type variants (e.g., school_with_div, engineering_no_div), 
    // extract the base type.
    let baseType = mappedType;
    if (mappedType.startsWith("school")) baseType = "school";
    else if (mappedType.startsWith("junior_college")) baseType = "junior_college";
    else if (mappedType.startsWith("engineering")) baseType = "engineering";
    else if (mappedType.startsWith("diploma")) baseType = "diploma";
    else if (mappedType.startsWith("coaching")) baseType = "coaching";

    const roles = ORG_ROLE_MAPPING[baseType];
    return roles || ORG_ROLE_MAPPING["engineering"];
}

/**
 * Normalize org_type or structure_type to base org type.
 * @param {string} orgTypeOrStructure
 * @returns {string}
 */
function normalizeBaseType(orgTypeOrStructure) {
    const t = String(orgTypeOrStructure || "engineering").toLowerCase();
    if (t.startsWith("school")) return "school";
    if (t.startsWith("junior_college")) return "junior_college";
    if (t.startsWith("engineering")) return "engineering";
    if (t.startsWith("diploma")) return "diploma";
    if (t.startsWith("coaching")) return "coaching";
    return "engineering";
}

/**
 * Get available roles WITH labels and metadata for the frontend.
 * Returns an array of { value, label, category, description } objects.
 * 
 * @param {string} orgType - The org_type or structure_type
 * @param {string} userRole - The requesting user's role
 * @param {object} options - { invitableOnly: true } to exclude student/org_admin/super_admin
 * @returns {Array<{ value: string, label: string, category: string, description: string }>}
 */
export function getAvailableRolesWithLabels(orgType, userRole, options = {}) {
    const roleKeys = getAvailableRoles(orgType, userRole);
    const baseType = normalizeBaseType(orgType);
    const overrides = ORG_LABEL_OVERRIDES[baseType] || {};

    let result = roleKeys.map((key) => {
        const def = ROLE_DEFINITIONS[key] || { label: key, category: "other", description: "" };
        const override = overrides[key] || {};
        return {
            value: key,
            label: override.label || def.label,
            category: def.category,
            description: override.description || def.description,
        };
    });

    // If invitableOnly, exclude roles that are not manually invitable from the Members page
    if (options.invitableOnly) {
        result = result.filter((r) => !["student", "org_admin", "super_admin"].includes(r.value));
    }

    return result;
}

/**
 * Get roles for ALL org types at once (for super admin comparison views).
 * Returns: { engineering: [...roles], school: [...roles], ... }
 */
export function getAllOrgRolesWithLabels() {
    const result = {};
    for (const orgType of Object.keys(ORG_ROLE_MAPPING)) {
        result[orgType] = getAvailableRolesWithLabels(orgType, "org_admin", { invitableOnly: true });
    }
    return result;
}
