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
import OrgSubscription from "../models/OrgSubscription.js";
import User from "../models/User.js";
import { generateUniqueSlug } from "../utils/slug-generator.js";
import { getOrgTypeDefaults } from "./admissions/strategy-selector.js";
import { generateUniqueDualCodes, generateSecureCode } from "./code-generator.service.js";

const normalizeOrgType = (value = "") => {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    if (normalized === "college") return "engineering";

    const allowed = new Set(["school", "junior_college", "engineering", "coaching", "diploma", "other"]);
    return allowed.has(normalized) ? normalized : "school";
};

const resolveStructureType = (orgType, requested) => {
    const requestedValue = String(requested || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    const valid = new Set([
        "engineering",
        "engineering_with_div",
        "engineering_no_div",
        "school_with_div",
        "school_no_div",
        "coaching",
        "junior_college",
        "junior_college_with_div",
        "junior_college_no_div",
        "diploma",
        "diploma_with_div",
        "diploma_no_div",
        "custom",
    ]);

    if (valid.has(requestedValue)) {
        return requestedValue;
    }

    switch (orgType) {
        case "school":
            return "school_with_div";
        case "junior_college":
            return "junior_college_with_div";
        case "engineering":
            return "engineering_with_div";
        case "diploma":
            return "diploma_with_div";
        case "coaching":
            return "coaching";
        default:
            return "custom";
    }
};

const resolveDivisionMode = (structureType, requestedDivisionMode) => {
    if (requestedDivisionMode === "with_divisions" || requestedDivisionMode === "without_divisions") {
        return requestedDivisionMode;
    }

    return structureType.includes("_no_div") ? "without_divisions" : "with_divisions";
};

const generateUniqueLegacyPrivateCode = async () => {
    let privateCode = "";
    let attempts = 0;

    while (!privateCode && attempts < 25) {
        attempts += 1;
        const candidate = generateSecureCode();
        const exists = await Organization.exists({ private_code: candidate });
        if (!exists) {
            privateCode = candidate;
        }
    }

    if (!privateCode) {
        throw new Error("Unable to generate unique legacy private_code.");
    }

    return privateCode;
};

/**
 * Provisioner Service
 * Handles creation of new demo institutions with trial plan.
 */
export const provisionDemoOrg = async (adminData, orgData, options = {}) => {
    const plan = options.plan || "demo";
    const mode = options.mode || (plan === "sandbox" ? "sandbox" : "production");

    const session = await Organization.startSession();
    session.startTransaction();

    try {
        const orgType = normalizeOrgType(orgData.org_type || orgData.structure_type);
        const structureType = resolveStructureType(orgType, orgData.structure_type);
        const divisionMode = resolveDivisionMode(structureType, orgData.division_mode);
        const slug = orgData.subdomain || (await generateUniqueSlug(orgData.name));

        const formDefaults = getOrgTypeDefaults(orgType);
        const { organizationCode, honorCode } = await generateUniqueDualCodes(Organization);
        const privateCode = await generateUniqueLegacyPrivateCode();

        const adminEmail = String(adminData.email || "").toLowerCase().trim();
        const adminPhone = adminData.phone_number || adminData.phoneNumber || "";
        const adminName = adminData.name || "";

        const city = String(orgData.city || "").trim();
        const state = String(orgData.state || "").trim();
        const fallbackAddress = [city, state].filter(Boolean).join(", ") || "Address not provided";

        const newOrg = new Organization({
            name: orgData.name,
            subdomain: slug.toLowerCase(),
            org_type: orgType,
            structure_type: structureType,
            division_mode: divisionMode,
            address: orgData.address || "",
            city: orgData.city || "",
            state: orgData.state || "",
            district: orgData.district || "",
            taluka: orgData.taluka || "",
            owner_id: null,
            ownerName: adminName,
            ownerEmail: adminEmail,
            contactNumber: adminPhone,
            website: orgData.website || "",
            designation: orgData.designation || "",
            pending_admin: {
                name: adminName,
                email: adminEmail,
                phone: adminPhone,
                activationToken: "", // Will be set by controller
            },
            private_code: privateCode,
            organizationCode,
            honorCode,
            branding: {
                theme_colors: {
                    primary: "#4a90f5",
                    secondary: "#8b6fff",
                },
            },
            admission_config: {
                form_builder_config: {
                    field_toggles: formDefaults.enabled_fields.map((key) => ({
                        key,
                        admission: true,
                        onboarding: true,
                    })),
                    document_toggles: formDefaults.enabled_documents.map((key) => ({
                        key,
                        admission: true,
                        onboarding: false,
                    })),
                    custom_fields: [],
                },
            },
            onboarding_progress: {
                tenant_created: true,
                current_stage: "admin_activation_pending",
                last_synced_at: new Date(),
            },
            is_active: true,
            status: mode === "sandbox" ? "sandbox" : "active",
            org_mode: mode === "sandbox" ? "sandbox" : "production",
            feature_flags: orgData.feature_flags || {},
            demoExpiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
        });

        await newOrg.save({ session });

        const subscription = new OrgSubscription({
            organization_id: newOrg._id,
            plan: plan,
            status: "active",
            isPaid: false,
            expiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
        });
        
        if (options.features) {
            subscription.features = { ...subscription.features, ...options.features };
        }

        await subscription.save({ session });

        // Do NOT create the User here or attach organization_id yet. 
        // This stops ghost users from being created during provisioning.
        await session.commitTransaction();
        session.endSession();

        return {
            organization: newOrg,
            subscription,
            admin: { name: adminName, email: adminEmail, phone: adminPhone },
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
