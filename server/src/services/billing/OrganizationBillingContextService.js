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

import Organization from "../../models/Organization.js";

/**
 * OrganizationBillingContextService
 * Fetches and structures the organization's type, structure, and terminology for billing purposes.
 */
class OrganizationBillingContextService {
    static async getContext(organizationId) {
        const org = await Organization.findById(organizationId).lean();
        if (!org) {
            throw new Error(`Organization ${organizationId} not found`);
        }

        // Simulating the terminology fetch that should hit GET /api/hierarchy/terminology internally
        // For billing, we just need the structure and division modes.
        const terminology = this.resolveTerminology(org.org_type, org.structure_type);

        return {
            organizationId: org._id.toString(),
            orgType: org.org_type || "other",
            structureType: org.structure_type || "custom",
            divisionMode: org.division_mode || "no_divisions", // Assuming this is set on Org
            allowSubBatches: org.allow_sub_batches || false, // Assuming this is set on Org
            terminology
        };
    }

    static resolveTerminology(orgType, structureType) {
        // Fallbacks for billing context
        const base = {
            learner: "Learner",
            staff: "Staff",
            division: "Division",
            subBatch: "Batch"
        };

        if (orgType === "school") {
            base.learner = "Student";
            base.staff = "Teacher";
            base.division = "Section";
        } else if (orgType === "engineering" || orgType === "diploma") {
            base.learner = "Student";
            base.staff = "Faculty";
            base.division = "Division";
            base.subBatch = "Lab Batch";
        } else if (orgType === "coaching") {
            base.learner = "Student";
            base.staff = "Mentor";
            base.division = "Batch";
        } else if (orgType === "junior_college") {
            base.learner = "Student";
            base.staff = "Lecturer";
            base.division = "Division";
        }
        
        return base;
    }
}

export default OrganizationBillingContextService;
