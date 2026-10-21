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

import Organization from "../models/Organization.js";
import { getFormSchema } from "../services/admissions/admission-form-builder.service.js";
import { 
    getMasterFieldPool as getMasterFieldPoolService, 
    getMasterDocumentPool as getMasterDocumentPoolService,
    getOrgTypeDefaults,
} from "../services/admissions/strategy-selector.js";
import { buildInstitutionProfile } from "../services/institution-profile.service.js";
import { trackOnboardingEvent } from "../services/onboarding-event.service.js";
import { markOnboardingStep, syncDerivedOnboardingProgress } from "../services/onboarding-progress.service.js";

/**
 * admission-config.controller.js
 * 
 * Handles Admin configuration for the admission engine.
 */

/**
 * GET /api/admission/config
 * Retrieves current settings and the dynamic form schema.
 */
export const getAdmissionConfig = async (req, res) => {
    try {
        const org = await Organization.findById(req.user.organization_id)
            .select("name org_type structure_type division_mode allow_sub_batches status rollNumberLabel academic_config admission_config");
        
        if (!org) return res.status(404).json({ error: "Organization not found" });

        const orgObject = typeof org.toObject === "function" ? org.toObject() : org;
        const structureType = orgObject.structure_type || orgObject.admission_config?.structure_type || "school_no_div";
        const config = {
            ...(orgObject.admission_config || {}),
            structure_type: structureType,
        };
        const schema = getFormSchema({
            ...orgObject,
            structure_type: structureType,
            admission_config: config,
        });
        const institutionProfile = req.institutionProfile || buildInstitutionProfile(orgObject);

        res.json({
            organization: org.name,
            structure_type: structureType,
            config,
            admission_config: config,
            form_schema: schema,
            institution_profile: institutionProfile,
            admission_profile: institutionProfile.admissionProfile,
            learner_record_profile: institutionProfile.learnerRecordProfile,
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch admission configuration." });
    }
};

/**
 * PATCH /api/admission/config
 * Updates the admission portal status, fees, and instructions.
 */
export const updateAdmissionConfig = async (req, res) => {
    try {
        const { admission_config } = req.body;
        
        const org = await Organization.findByIdAndUpdate(
            req.user.organization_id,
            { $set: { admission_config } },
            { returnDocument: 'after', runValidators: true }
        ).select("admission_config");

        await markOnboardingStep(req.user.organization_id, "admission_form_configured", true);
        await syncDerivedOnboardingProgress(req.user.organization_id);
        await trackOnboardingEvent({
            organizationId: req.user.organization_id,
            userId: req.user?._id || null,
            eventType: "admission_config_updated",
            stage: "setup",
            actorRole: req.user?.role || "org_admin",
            metadata: { hasPortalOpen: Boolean(admission_config?.is_portal_open) },
        });

        res.json({ message: "Configuration updated successfully.", config: org.admission_config });
    } catch (err) {
        res.status(500).json({ error: "Failed to update configuration." });
    }
};

/**
 * POST /api/admission/config/preset
 * Resets/Injects a standard preset based on the organization's plan.
 */
export const injectPreset = async (req, res) => {
    try {
        const org = await Organization.findById(req.user.organization_id);
        const defaults = getOrgTypeDefaults(org.structure_type);
        
        // Reset to default subdocument structure + field/doc toggles
        const defaultPreset = {
            is_portal_open: false,
            registration_fee: org.structure_type?.includes('engineering') ? 1000 : 500,
            waitlist_enabled: true,
            instructions: `Welcome to ${org.name} Admission Portal. Please fill out the form carefully and upload all required documents.`,
            form_builder_config: {
                field_toggles: defaults.enabled_fields.map(key => ({
                    key,
                    admission: true,
                    onboarding: true,
                    is_required: true // Default everything to required in preset for safety
                })),
                document_toggles: defaults.enabled_documents.map(key => ({
                    key,
                    admission: true,
                    onboarding: true
                })),
                custom_fields: []
            }
        };

        org.admission_config = defaultPreset;
        await org.save();
        await markOnboardingStep(req.user.organization_id, "admission_form_configured", true);
        await syncDerivedOnboardingProgress(req.user.organization_id);
        await trackOnboardingEvent({
            organizationId: req.user.organization_id,
            userId: req.user?._id || null,
            eventType: "admission_preset_injected",
            stage: "setup",
            actorRole: req.user?.role || "org_admin",
            metadata: { structure_type: org.structure_type },
        });

        res.json({ message: "Base preset injected successfully.", config: org.admission_config });
    } catch (err) {
        res.status(500).json({ error: "Failed to inject preset." });
    }
};

/**
 * GET /api/admission/master-field-pool
 */
export const getMasterFieldPool = async (req, res) => {
    try {
        res.json(getMasterFieldPoolService());
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch master field pool." });
    }
};

/**
 * GET /api/admission/master-document-pool
 */
export const getMasterDocumentPool = async (req, res) => {
    try {
        res.json(getMasterDocumentPoolService());
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch master document pool." });
    }
};

export default {
    getAdmissionConfig,
    updateAdmissionConfig,
    injectPreset,
    getMasterFieldPool,
    getMasterDocumentPool
};
