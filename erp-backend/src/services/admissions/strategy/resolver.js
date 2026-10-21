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

import { MASTER_FIELD_POOL, MASTER_FIELD_DEFINITION_MAP, MASTER_DOCUMENT_POOL, ORG_TYPE_DEFAULTS, ADMISSION_STRATEGIES } from './index.js';

// 5. EXPORTED FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get the MASTER field pool — shown to ALL org types.
 * The frontend renders this as the full checkbox/toggle list.
 */
export function getMasterFieldPool() {
    return MASTER_FIELD_POOL;
}

export function getMasterFieldDefinition(fieldKey) {
    return MASTER_FIELD_DEFINITION_MAP[fieldKey] || null;
}

/**
 * Get the MASTER document pool — shown to ALL org types.
 */
export function getMasterDocumentPool() {
    return MASTER_DOCUMENT_POOL;
}

/**
 * Get the default enabled fields for an org type.
 * Used during onboarding to pre-check the toggles.
 * @param {string} orgType - "engineering", "school", "coaching", "junior_college", "diploma"
 */
export function getOrgTypeDefaults(orgType) {
    // Map structure_types to their base org type
    const typeMap = {
        engineering: "engineering",
        engineering_with_div: "engineering",
        engineering_no_div: "engineering",
        school_with_div: "school",
        school_no_div: "school",
        coaching: "coaching",
        junior_college: "junior_college",
        junior_college_with_div: "junior_college",
        junior_college_no_div: "junior_college",
        diploma: "diploma",
        diploma_with_div: "diploma",
        diploma_no_div: "diploma",
        custom: "coaching", // Custom orgs get coaching defaults (lightweight)
    };
    const baseType = typeMap[orgType] || "school";
    return ORG_TYPE_DEFAULTS[baseType] || ORG_TYPE_DEFAULTS.school;
}

/**
 * Get the base admission strategy (workflow, auth, ranking).
 * @param {string} structureType
 */
export function getAdmissionStrategy(structureType) {
    const strategy = ADMISSION_STRATEGIES[structureType];
    if (!strategy) {
        throw new Error(
            `No admission strategy found for structure_type: "${structureType}". ` +
            `Valid types: ${Object.keys(ADMISSION_STRATEGIES).join(", ")}`
        );
    }
    return { ...strategy, structure_type: structureType };
}

/**
 * Get the RESOLVED admission strategy for a specific organization.
 * Merges the workflow config + the org's form_builder_config.
 * 
 * @param {Object} org - The full Organization document
 * @param {string} formType - "admission" or "onboarding"
 * @returns {Object} Complete strategy with resolved fields, documents, and custom fields
 */
export function getResolvedAdmissionStrategy(org, formType = "admission") {
    const baseStrategy = getAdmissionStrategy(org.structure_type);
    const formConfig = org.admission_config?.form_builder_config;
    const defaults = getOrgTypeDefaults(org.structure_type);

    const fieldEntries = formConfig?.field_toggles?.length
        ? formConfig.field_toggles.filter((field) => field[formType] === true)
        : defaults.enabled_fields.map((key) => ({ key }));

    const customFields = (formConfig?.custom_fields || []).filter((field) => field[formType] === true);

    const resolvedFields = [];
    const resolvedRequiredFields = [];
    const resolvedOptionalFields = [];

    for (const entry of fieldEntries) {
        resolvedFields.push(entry.key);

        const definition = getMasterFieldDefinition(entry.key);
        const isRequired = typeof entry.is_required === "boolean"
            ? entry.is_required
            : Boolean(definition?.is_required_by_default);

        if (isRequired) {
            resolvedRequiredFields.push(entry.key);
        } else {
            resolvedOptionalFields.push(entry.key);
        }
    }

    for (const customField of customFields) {
        resolvedFields.push(customField.field_key);
        if (customField.is_required) {
            resolvedRequiredFields.push(customField.field_key);
        } else {
            resolvedOptionalFields.push(customField.field_key);
        }
    }

    const resolvedDocuments = formConfig?.document_toggles?.length
        ? formConfig.document_toggles
            .filter((document) => document[formType] === true)
            .map((document) => document.key)
        : defaults.enabled_documents;

    return {
        ...baseStrategy,
        resolved_fields: Array.from(new Set(resolvedFields)),
        resolved_required_fields: Array.from(new Set(resolvedRequiredFields)),
        resolved_optional_fields: Array.from(new Set(resolvedOptionalFields)),
        resolved_documents: resolvedDocuments,
        custom_field_definitions: customFields,
    };
}

/**
 * Check if an org type supports a specific admission feature.
 */
export function supportsFeature(structureType, feature) {
    const strategy = getAdmissionStrategy(structureType);
    switch (feature) {
        case "rla": return strategy.supports_rla;
        case "cap_upgrade": return strategy.supports_cap_upgrade;
        case "credential_generation": return strategy.credential_generation !== null;
        default: return false;
    }
}


