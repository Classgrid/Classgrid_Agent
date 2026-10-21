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
 * document-validity.service.js — Document Expiry & Validity Checker
 * 
 * Validates that uploaded certificates are within their legal validity window.
 * Different document types have different validity rules:
 *   - Caste Certificate: Valid for 3 years from issue date
 *   - Income Certificate: Valid for 1 year (financial year)
 *   - Domicile: Lifetime validity
 *   - Transfer Certificate: Valid for 1 year
 *   - Medical Fitness: Valid for 6 months
 */

const VALIDITY_RULES = {
    caste_certificate: { 
        max_age_months: 36, 
        label: "Caste Certificate",
        issuing_authority: "Tehsildar / Sub-Divisional Magistrate"
    },
    income_certificate: { 
        max_age_months: 12, 
        label: "Income Certificate",
        issuing_authority: "Tehsildar"
    },
    domicile: { 
        max_age_months: null, // Lifetime
        label: "Domicile Certificate",
        issuing_authority: "District Collector"
    },
    transfer_certificate: {
        max_age_months: 12,
        label: "Transfer Certificate (TC)",
        issuing_authority: "Previous Institution"
    },
    medical_fitness: {
        max_age_months: 6,
        label: "Medical Fitness Certificate",
        issuing_authority: "Registered Medical Practitioner"
    },
    gap_certificate: {
        max_age_months: null, // No expiry
        label: "Gap Certificate (Affidavit)",
        issuing_authority: "Notary / First Class Magistrate"
    },
    migration_certificate: {
        max_age_months: 12,
        label: "Migration Certificate",
        issuing_authority: "University / Board"
    },
    "12th_marksheet": { max_age_months: null, label: "12th Marksheet" },
    "10th_marksheet": { max_age_months: null, label: "10th Marksheet" },
    aadhar_card: { max_age_months: null, label: "Aadhaar Card" },
    cet_allotment_letter: { max_age_months: 12, label: "CET Allotment Letter" },
    birth_certificate: { max_age_months: null, label: "Birth Certificate" },
    previous_marksheet: { max_age_months: null, label: "Previous Marksheet" },
    school_leaving_certificate: { max_age_months: 12, label: "School LC" },
    id_proof: { max_age_months: null, label: "ID Proof" },
    photo: { max_age_months: 6, label: "Passport Photo" },
};

/**
 * Check if a specific document is still valid based on its issue date.
 * 
 * @param {string} docType - e.g., "caste_certificate", "income_certificate"
 * @param {Date|string} issueDate - When the document was issued
 * @returns {{ valid: boolean, message: string, expires_on?: Date }}
 */
export function checkDocumentValidity(docType, issueDate) {
    const rule = VALIDITY_RULES[docType];
    if (!rule) {
        return { valid: true, message: `No validity rule found for "${docType}". Assuming valid.` };
    }

    if (rule.max_age_months === null) {
        return { valid: true, message: `${rule.label} has lifetime validity.` };
    }

    if (!issueDate) {
        return { valid: false, message: `${rule.label} requires an issue date for validity check.` };
    }

    const issued = new Date(issueDate);
    const expiryDate = new Date(issued);
    expiryDate.setMonth(expiryDate.getMonth() + rule.max_age_months);

    const now = new Date();

    if (now > expiryDate) {
        return {
            valid: false,
            message: `${rule.label} has expired. Issued: ${issued.toLocaleDateString("en-IN")}. Expired: ${expiryDate.toLocaleDateString("en-IN")}.`,
            expires_on: expiryDate
        };
    }

    // Warn if expiring within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiryDate <= thirtyDaysFromNow) {
        return {
            valid: true,
            message: `⚠️ ${rule.label} is expiring soon (${expiryDate.toLocaleDateString("en-IN")}). Advise renewal.`,
            expires_on: expiryDate
        };
    }

    return { valid: true, message: `${rule.label} is valid until ${expiryDate.toLocaleDateString("en-IN")}.`, expires_on: expiryDate };
}

/**
 * Bulk-validate all documents on an application.
 * 
 * @param {Array<Object>} documents - [{ name, issue_date, url, status }]
 * @returns {{ all_valid: boolean, results: Array<Object> }}
 */
export function validateAllDocuments(documents) {
    const results = [];
    let allValid = true;

    for (const doc of documents) {
        const result = checkDocumentValidity(doc.name, doc.issue_date);
        results.push({
            document: doc.name,
            ...result
        });
        if (!result.valid) allValid = false;
    }

    return { all_valid: allValid, results };
}

/**
 * Get the complete document checklist with validity rules.
 * 
 * @param {string} docType 
 * @returns {Object} The rule configuration
 */
export function getValidityRule(docType) {
    return VALIDITY_RULES[docType] || null;
}

export default {
    checkDocumentValidity,
    validateAllDocuments,
    getValidityRule,
    VALIDITY_RULES
};
