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
import AdmissionApplication from "../../models/AdmissionApplication.js";

/**
 * prn-generator.service.js — Permanent Registration Number Generator
 * 
 * Config-driven PRN generation engine.
 * Supports templates like: "{YEAR}{BRANCH_CODE}{SERIAL:4}" → "26COMPS0028"
 * 
 * Tokens:
 *   {YEAR:4}       → Full year e.g. "2026"
 *   {YEAR:2}       → Short year e.g. "26"
 *   {YEAR}         → Short year (default 2-digit)
 *   {BRANCH_CODE}  → Mapped from org config (e.g. "COMPS", "MECH")
 *   {COLLEGE_CODE} → From org config (e.g. "PCCOE")
 *   {DIVISION}     → Division letter (e.g. "A", "B")
 *   {SERIAL:N}     → Zero-padded serial number with N digits
 *   {REJOIN_FLAG}  → Empty for first attempt, "R" for rejoin
 */

/**
 * Generates a PRN from a template and data context.
 * @param {string} template - e.g. "{YEAR:2}{BRANCH_CODE}{SERIAL:4}"
 * @param {Object} data - { year, branch, college_code, division, serial, is_rejoin }
 * @returns {string} The generated PRN
 */
export function generatePRN(template, data) {
    let prn = template;

    // {YEAR:4} → Full year
    prn = prn.replace(/\{YEAR:4\}/g, String(data.year || new Date().getFullYear()));

    // {YEAR:2} or {YEAR} → Short year
    prn = prn.replace(/\{YEAR(?::2)?\}/g, String(data.year || new Date().getFullYear()).slice(-2));

    // {BRANCH_CODE} → Mapped branch code
    prn = prn.replace(/\{BRANCH_CODE\}/g, data.branch_code || "");

    // {COLLEGE_CODE} → College identifier
    prn = prn.replace(/\{COLLEGE_CODE\}/g, data.college_code || "");

    // {DIVISION} → Division letter
    prn = prn.replace(/\{DIVISION\}/g, data.division || "");

    // {SERIAL:N} → Zero-padded serial
    prn = prn.replace(/\{SERIAL:(\d+)\}/g, (_, len) =>
        String(data.serial || 1).padStart(parseInt(len), "0")
    );

    // {REJOIN_FLAG} → R for rejoin, RA for readmission, empty for first attempt
    prn = prn.replace(/\{REJOIN_FLAG\}/g, data.rejoin_flag || "");

    return prn.toUpperCase();
}

/**
 * Generates PRN for a specific application using the org's PRN config.
 * Atomically increments the org's next_serial counter.
 * 
 * @param {string} orgId 
 * @param {Object} applicationData - { branch_name, division, is_rejoin }
 * @returns {Promise<string>} The generated PRN
 */
export async function generatePRNForApplication(orgId, applicationData) {
    const org = await Organization.findById(orgId).select("admission_config name").lean();
    if (!org) throw new Error("Organization not found");

    const prnConfig = org.admission_config?.prn_template;
    if (!prnConfig?.enabled) {
        throw new Error("PRN generation is not enabled for this organization.");
    }

    const template = prnConfig.format || "{YEAR:2}{BRANCH_CODE}{SERIAL:4}";

    // Resolve branch code from mapping
    const branchMapping = prnConfig.branch_code_mapping || {};
    const branchCode = branchMapping[applicationData.branch_name] || 
                       applicationData.branch_name?.substring(0, 4)?.toUpperCase() || "GEN";

    // Atomic serial increment (prevents race conditions)
    const updatedOrg = await Organization.findOneAndUpdate(
        { _id: orgId },
        { $inc: { "admission_config.prn_template.next_serial": 1 } },
        { new: false } // Return the OLD value (pre-increment) so we use it as current serial
    );

    const currentSerial = updatedOrg.admission_config?.prn_template?.next_serial || 1;

    // Determine rejoin flag
    let rejoinFlag = "";
    if (prnConfig.rejoin_flag?.enabled) {
        if (applicationData.is_readmission) {
            rejoinFlag = prnConfig.rejoin_flag.readmission || "RA";
        } else if (applicationData.is_rejoin) {
            rejoinFlag = prnConfig.rejoin_flag.rejoin || "R";
        } else {
            rejoinFlag = prnConfig.rejoin_flag.first_attempt || "";
        }
    }

    return generatePRN(template, {
        year: new Date().getFullYear(),
        branch_code: branchCode,
        college_code: prnConfig.college_code || "",
        division: applicationData.division || "",
        serial: currentSerial,
        rejoin_flag: rejoinFlag
    });
}

/**
 * Batch-generate PRNs for multiple applications.
 * @param {string} orgId 
 * @param {Array<string>} applicationIds 
 * @returns {Promise<Array<{id, prn, error?}>>}
 */
export async function batchGeneratePRNs(orgId, applicationIds) {
    const results = [];

    for (const appId of applicationIds) {
        try {
            const app = await AdmissionApplication.findById(appId).lean();
            if (!app) {
                results.push({ id: appId, error: "Application not found" });
                continue;
            }
            if (app.prn) {
                results.push({ id: appId, prn: app.prn, error: "PRN already assigned" });
                continue;
            }

            const prn = await generatePRNForApplication(orgId, {
                branch_name: app.form_data?.branch_allotted || app.form_data?.stream_applying || "General",
                division: app.form_data?.assigned_division || "",
                is_rejoin: app.form_data?.is_rejoin || false,
                is_readmission: app.form_data?.is_readmission || false,
            });

            await AdmissionApplication.findByIdAndUpdate(appId, { prn });
            results.push({ id: appId, prn });
        } catch (err) {
            results.push({ id: appId, error: err.message });
        }
    }

    return results;
}

export default {
    generatePRN,
    generatePRNForApplication,
    batchGeneratePRNs
};
