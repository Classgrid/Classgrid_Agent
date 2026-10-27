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

import xlsx from "xlsx";
import AdmissionApplication from "../../models/AdmissionApplication.js";

/**
 * ScholarshipService
 * Handles categorization-based fee structures and bulk scholarship imports.
 */
class ScholarshipService {
    /**
     * Resolves the appropriate FeeStructure ID for an application.
     * Looks at seat_type and category mapping in the organization config.
     * 
     * Priority: 
     * 1. Exact match on seat_type
     * 2. Exact match on category
     * 3. Fallback to default admission_fee_structure_id
     * 
     * @param {Object} application 
     * @param {Object} org 
     * @returns {string} The resolved fee_structure_id
     */
    calculateFeeStructure(application, org) {
        const feeConfig = org.admission_config?.fee_config;
        if (!feeConfig) return null;

        const mappings = feeConfig.dynamic_fee_mapping || [];

        // 1. Try mapping by seat_type (e.g. TFWS)
        const seatTypeMatch = mappings.find(m => 
            m.attribute_type === "seat_type" && 
            m.attribute === application.seat_type
        );
        if (seatTypeMatch) return seatTypeMatch.fee_structure_id;

        // 2. Try mapping by category (e.g. OBC, SC)
        const categoryMatch = mappings.find(m => 
            m.attribute_type === "category" && 
            m.attribute === application.category
        );
        if (categoryMatch) return categoryMatch.fee_structure_id;

        // 3. Fallback to default
        return feeConfig.admission_fee_structure_id;
    }

    /**
     * Process a bulk scholarship/seat-type import.
     * CSV/Excel should have headers: ['en_number' or 'email' or 'phone', 'seat_type', 'category']
     * 
     * @param {string} orgId 
     * @param {Buffer} buffer 
     * @returns {Promise<Object>} { successCount, errors }
     */
    async processScholarshipImport(orgId, buffer) {
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let successCount = 0;
        let errors = [];

        for (const row of data) {
            try {
                // Find application by identity field
                const query = { organization_id: orgId };
                if (row.en_number) query.en_number = row.en_number;
                else if (row.email) query.email = row.email.toLowerCase();
                else if (row.phone) query.phone = row.phone;
                else {
                    errors.push({ row, error: "Missing identity field (en_number/email/phone)" });
                    continue;
                }

                const application = await AdmissionApplication.findOne(query);
                if (!application) {
                    errors.push({ row, error: "Application not found" });
                    continue;
                }

                // Update scholarship attributes
                if (row.seat_type) application.seat_type = row.seat_type;
                if (row.category) application.category = row.category;

                await application.save();
                successCount++;
            } catch (err) {
                errors.push({ row, error: err.message });
            }
        }

        return { successCount, errors };
    }
}

export default new ScholarshipService();
