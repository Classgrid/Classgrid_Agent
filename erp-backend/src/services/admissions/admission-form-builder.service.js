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

import { getMasterFieldDefinition, getResolvedAdmissionStrategy, MASTER_FIELD_POOL } from "./strategy-selector.js";

/**
 * admission-form-builder.service.js
 * 
 * Generates dynamic form schemas for the frontend based on the organization's plan.
 */

const FIELD_METADATA = {
    // Identity & Auth
    en_number: { label: "EN Number", type: "text", placeholder: "EN24xxxxxx", icon: "Hash" },
    student_name: { label: "Student Full Name", type: "text", placeholder: "As per Marksheet" },
    parent_name: { label: "Parent/Guardian Name", type: "text" },
    dob: { label: "Date of Birth", type: "date" },
    phone: { label: "Mobile Number", type: "tel", placeholder: "10-digit mobile" },
    email: { label: "Email Address", type: "email" },

    // Academic Performance
    cet_score: { label: "CET Score", type: "number", min: 0, max: 200 },
    jee_score: { label: "JEE Score", type: "number" },
    previous_percentage: { label: "Previous Year Summary (%)", type: "number", step: 0.01 },
    "10th_percentage": { label: "10th Std Percentage (%)", type: "number" },
    diploma_percentage: { label: "Diploma Aggregate (%)", type: "number" },

    // Selection
    category: { 
        label: "Category", 
        type: "select", 
        options: ["OPEN", "OBC", "SC", "ST", "VJNT", "EWS", "SBC"] 
    },
    seat_type: { 
        label: "Seat Type", 
        type: "select", 
        options: ["CAP", "MANAGEMENT", "INSTITUTIONAL", "TFWS", "EBC", "MINORITY"] 
    },
    branch_allotted: { label: "Branch Allotted", type: "text" },
    stream_applying: { 
        label: "Stream", 
        type: "select", 
        options: ["Science", "Commerce", "Arts"] 
    },
    course_selected: { label: "Target Course", type: "text" },
    batch_preferred: { label: "Preferred Batch", type: "text" },

    // Misc
    previous_school: { label: "Previous School/College", type: "text" },
    transfer_certificate_no: { label: "TC Number", type: "text" },
    aadhar_no: { label: "Aadhar Card Number", type: "text", pattern: "[0-9]{12}" },
};

/**
 * Returns a JSON schema that the frontend Admission Wizard uses to render the form.
 * @param {string} structureType 
 * @returns {Object}
 */
function normalizeFieldType(type = "text") {
    return type === "dropdown" ? "select" : type;
}

export const getFormSchema = (orgOrStructureType) => {
    const org = typeof orgOrStructureType === "string"
        ? { structure_type: orgOrStructureType, admission_config: {} }
        : orgOrStructureType;

    const strategy = getResolvedAdmissionStrategy(org);

    const buildField = (fieldId) => {
        const customField = (strategy.custom_field_definitions || []).find(f => f.field_key === fieldId);
        if (customField) {
            return {
                id: fieldId,
                label: customField.field_label,
                type: normalizeFieldType(customField.field_type),
                ...(customField.options?.length ? { options: customField.options } : {}),
            };
        }

        const masterField = getMasterFieldDefinition(fieldId);
        return {
            id: fieldId,
            ...(masterField ? {
                label: masterField.label,
                type: normalizeFieldType(masterField.type),
                ...(masterField.options ? { options: masterField.options } : {}),
            } : {
                label: fieldId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                type: "text",
            }),
            ...(FIELD_METADATA[fieldId] || {}),
        };
    };

    // 1. Resolve all fields and tag them with is_required
    const allResolvedFields = [];
    (strategy.resolved_required_fields || []).forEach(f => allResolvedFields.push({ id: f, required: true }));
    (strategy.resolved_optional_fields || []).forEach(f => allResolvedFields.push({ id: f, required: false }));

    // 2. Group fields into sections
    const sectionsMap = new Map();
    
    // Initialize map with MASTER_FIELD_POOL ordering
    for (const [sectionId, sectionDef] of Object.entries(MASTER_FIELD_POOL)) {
        sectionsMap.set(sectionId, {
            id: sectionId,
            label: sectionDef.label,
            fields: []
        });
    }
    sectionsMap.set("custom", { id: "custom", label: "Additional Details", fields: [] });

    for (const fieldData of allResolvedFields) {
        const built = buildField(fieldData.id);
        built.is_required = fieldData.required;

        // Find which section this field belongs to
        let foundSection = "custom";
        for (const [sId, sDef] of Object.entries(MASTER_FIELD_POOL)) {
            if (sDef.fields.some(f => f.key === fieldData.id)) {
                foundSection = sId;
                break;
            }
        }
        
        sectionsMap.get(foundSection).fields.push(built);
    }

    // 3. Filter out empty sections
    const finalSections = [];
    for (const section of sectionsMap.values()) {
        if (section.fields.length > 0) {
            finalSections.push(section);
        }
    }

    return {
        structure_type: org.structure_type,
        auth_method: strategy.auth_method,
        sections: finalSections,
        fields: {
            required: (strategy.resolved_required_fields || []).map(buildField),
            optional: (strategy.resolved_optional_fields || []).map(buildField),
        },
        documents: (strategy.resolved_documents || []).map(docId => ({
            id: docId,
            label: docId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            required: true
        }))
    };
};

export default {
    getFormSchema
};
