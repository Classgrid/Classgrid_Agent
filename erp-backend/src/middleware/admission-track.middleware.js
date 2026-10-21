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
import {
    INSTITUTION_PROFILE_ORG_SELECT,
    buildInstitutionProfile,
} from "../services/institution-profile.service.js";
import {
    getAdmissionTrack,
    resolveStructureType,
} from "../services/admissions/organization-admission-type.service.js";

async function resolveOrgForAdmissionRequest(req) {
    const organizationId =
        req.user?.organization_id ||
        req.body?.organization_id ||
        req.body?.organizationId ||
        req.query?.organization_id ||
        req.query?.organizationId ||
        req.admission_payload?.organization_id;

    if (!organizationId) {
        return null;
    }

    const organization = await Organization.findById(organizationId)
        .select(INSTITUTION_PROFILE_ORG_SELECT)
        .lean();

    if (!organization) {
        return null;
    }

    return {
        organizationId,
        organization,
        structureType: resolveStructureType(organization),
        track: getAdmissionTrack(resolveStructureType(organization)),
        institutionProfile: buildInstitutionProfile(organization),
    };
}

function getTrackErrorMessage(expectedTrack, structureType) {
    if (expectedTrack === "cet") {
        return {
            error: "This endpoint is only valid for CET-based institutions.",
            hint: "Use direct admission endpoints for school, junior college, and coaching flows.",
            structure_type: structureType,
        };
    }
    return {
        error: "This endpoint is only valid for direct admission institutions.",
        hint: "Use CET endpoints for engineering and diploma flows.",
        structure_type: structureType,
    };
}

function createTrackMiddleware(expectedTrack) {
    return async (req, res, next) => {
        try {
            const resolved = await resolveOrgForAdmissionRequest(req);
            if (!resolved || !resolved.structureType) {
                return res.status(400).json({
                    error: "organization_id is required and must belong to a valid organization.",
                });
            }

            req.admission_context = {
                ...(req.admission_context || {}),
                organization_id: resolved.organizationId,
                structure_type: resolved.structureType,
                track: resolved.track,
                institution_profile: resolved.institutionProfile,
            };
            req.institutionProfile = resolved.institutionProfile;
            req.institutionOrganization = resolved.organization;

            if (resolved.track !== expectedTrack) {
                return res.status(403).json(getTrackErrorMessage(expectedTrack, resolved.structureType));
            }

            return next();
        } catch (error) {
            return res.status(500).json({
                error: "Failed to resolve admission track.",
                details: error.message,
            });
        }
    };
}

export const requireCETTrack = createTrackMiddleware("cet");
export const requireDirectTrack = createTrackMiddleware("direct");

export default {
    requireCETTrack,
    requireDirectTrack,
};
