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

// 4. ADMISSION STRATEGIES — Workflow config (auth, ranking, exports)
//    These define HOW the admission works, not WHAT fields to show
// ═══════════════════════════════════════════════════════════════
const ADMISSION_STRATEGIES = {
    engineering: {
        auth_method: "cet_en_otp",
        ranking_type: "cap_round",
        seat_types: ["CAP", "INSTITUTIONAL", "MANAGEMENT", "SPOT"],
        entry_modes: ["CET", "DESK"],
        workflow_variant: "cet_pipeline",
        requires_printout: false,
        govt_exports: ["dte_csv", "aicte_csv"],
        supports_rla: true,
        supports_cap_upgrade: true,
        credential_generation: {
            email_pattern: "{first}.{last}{seq}@{domain}",
            platforms: ["google_workspace", "zoho", "cpanel"],
        },
    },

    school_with_div: {
        auth_method: "phone_otp",
        ranking_type: "merit_percentage",
        seat_types: ["GENERAL", "RTE", "MANAGEMENT"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "standard",
        requires_printout: true,
        govt_exports: ["saral_csv"],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    school_no_div: {
        auth_method: "phone_otp",
        ranking_type: "merit_percentage",
        seat_types: ["GENERAL", "RTE", "MANAGEMENT"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "standard",
        requires_printout: true,
        govt_exports: ["saral_csv"],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    coaching: {
        auth_method: "phone_otp",
        ranking_type: "fcfs",
        seat_types: ["REGULAR", "DISCOUNT", "EARLY_BIRD"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "fast_track",
        requires_printout: true,
        govt_exports: [],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    junior_college: {
        auth_method: "phone_otp",
        ranking_type: "10th_merit",
        seat_types: ["CAP", "MANAGEMENT", "MINORITY"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "standard",
        requires_printout: true,
        govt_exports: ["state_board_csv"],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    diploma: {
        auth_method: "cet_en_otp",
        ranking_type: "cap_round",
        seat_types: ["CAP", "INSTITUTIONAL", "MANAGEMENT"],
        entry_modes: ["CET", "DESK"],
        workflow_variant: "cet_pipeline",
        requires_printout: false,
        govt_exports: ["dte_csv"],
        supports_rla: true,
        supports_cap_upgrade: true,
        credential_generation: {
            email_pattern: "{first}.{last}{seq}@{domain}",
            platforms: ["google_workspace", "zoho"],
        },
    },

    custom: {
        auth_method: "phone_otp",
        ranking_type: "admin_defined",
        seat_types: ["GENERAL"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "fast_track",
        requires_printout: false,
        govt_exports: [],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    // ── Variant aliases — same workflow as base, divided by structure only ──

    engineering_with_div: null, // resolved below
    engineering_no_div: null,   // resolved below
    diploma_with_div: null,     // resolved below
    diploma_no_div: null,       // resolved below
};

// Populate variant aliases so getAdmissionStrategy() never throws for
// structure_type values that are valid in Organization.structure_type enum
// but were previously missing from ADMISSION_STRATEGIES.
ADMISSION_STRATEGIES.engineering_with_div = { ...ADMISSION_STRATEGIES.engineering, structure_type: "engineering_with_div" };
ADMISSION_STRATEGIES.engineering_no_div   = { ...ADMISSION_STRATEGIES.engineering, structure_type: "engineering_no_div" };

ADMISSION_STRATEGIES.school_with_div = { ...ADMISSION_STRATEGIES.school_with_div }; // already present, no-op
ADMISSION_STRATEGIES.school_no_div   = { ...ADMISSION_STRATEGIES.school_no_div };   // already present, no-op

ADMISSION_STRATEGIES.junior_college_with_div = {
    ...ADMISSION_STRATEGIES.junior_college,
    structure_type: "junior_college_with_div",
};
ADMISSION_STRATEGIES.junior_college_no_div = {
    ...ADMISSION_STRATEGIES.junior_college,
    structure_type: "junior_college_no_div",
};

ADMISSION_STRATEGIES.diploma_with_div = { ...ADMISSION_STRATEGIES.diploma, structure_type: "diploma_with_div" };
ADMISSION_STRATEGIES.diploma_no_div   = { ...ADMISSION_STRATEGIES.diploma, structure_type: "diploma_no_div" };

// ═══════════════════════════════════════════════════════════════

export { ADMISSION_STRATEGIES };
