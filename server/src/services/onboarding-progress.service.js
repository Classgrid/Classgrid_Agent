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

import AcademicHierarchy from "../models/AcademicHierarchy.js";
import DemoRequest from "../models/DemoRequest.js";
import OnboardingEvent from "../models/OnboardingEvent.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";

export const TRACKED_ONBOARDING_STEPS = [
    "tenant_created",
    "branding_configured",
    "academic_hierarchy_set",
    "staff_imported",
    "students_imported",
    "fee_structure_configured",
    "admission_form_configured",
    "first_login_completed",
];

export function deriveOnboardingStage(progress = {}) {
    if (!progress.first_login_completed) return "admin_activation_pending";
    if (!progress.branding_configured) return "branding_pending";
    if (!progress.academic_hierarchy_set) return "academic_structure_pending";
    if (!progress.staff_imported) return "staff_onboarding_pending";
    if (!progress.students_imported) return "student_onboarding_pending";
    if (!progress.fee_structure_configured) return "fees_pending";
    if (!progress.admission_form_configured) return "admissions_pending";
    return "go_live_ready";
}

const stageMeta = {
    admin_activation_pending: {
        label: "Admin Activation Pending",
        description: "The org admin still needs to activate the account and set a password.",
    },
    branding_pending: {
        label: "Branding Pending",
        description: "Institution branding and identity setup still need attention.",
    },
    academic_structure_pending: {
        label: "Academic Structure Pending",
        description: "The academic hierarchy has not been created yet.",
    },
    staff_onboarding_pending: {
        label: "Staff Onboarding Pending",
        description: "Faculty or staff members still need to be onboarded.",
    },
    student_onboarding_pending: {
        label: "Student Onboarding Pending",
        description: "Students have not been onboarded yet.",
    },
    fees_pending: {
        label: "Fees Pending",
        description: "No fee structure has been configured yet.",
    },
    admissions_pending: {
        label: "Admissions Pending",
        description: "The admission engine configuration still needs to be finalized.",
    },
    go_live_ready: {
        label: "Go Live Ready",
        description: "All tracked onboarding milestones are complete.",
    },
};

const nextActionMeta = {
    first_login_completed: "Activate the org admin account and complete the first login.",
    branding_configured: "Upload the institution logo and finalize branding details.",
    academic_hierarchy_set: "Seed or create the academic hierarchy structure.",
    staff_imported: "Invite or import faculty and staff members.",
    students_imported: "Import or enroll students into the organization.",
    fee_structure_configured: "Create the first fee structure for the institution.",
    admission_form_configured: "Finalize the admission engine configuration.",
};

const hasMeaningfulBranding = (org) => {
    return Boolean(
        org?.logo_url ||
        org?.website?.trim() ||
        org?.branding?.tagline?.trim() ||
        org?.affiliation?.trim() ||
        (Array.isArray(org?.allowed_domains) && org.allowed_domains.length > 0)
    );
};

const hasMeaningfulAdmissionConfig = (org) => {
    const config = org?.admission_config || {};
    return Boolean(
        config?.is_portal_open ||
        Number(config?.registration_fee || 0) > 0 ||
        config?.instructions?.trim() ||
        (Array.isArray(config?.form_builder_config?.custom_fields) && config.form_builder_config.custom_fields.length > 0)
    );
};

export async function markOnboardingStep(orgId, step, value = true) {
    if (!TRACKED_ONBOARDING_STEPS.includes(step)) {
        throw new Error(`Invalid onboarding step: ${step}`);
    }

    const org = await Organization.findById(orgId).select("onboarding_progress").lean();
    const current = { ...(org?.onboarding_progress || {}), [step]: !!value };
    const allDone = TRACKED_ONBOARDING_STEPS.every((trackedStep) => current[trackedStep] === true);

    const update = {
        [`onboarding_progress.${step}`]: !!value,
        "onboarding_progress.current_stage": deriveOnboardingStage(current),
        "onboarding_progress.last_synced_at": new Date(),
    };

    if (allDone) {
        update["onboarding_progress.completed_at"] = org?.onboarding_progress?.completed_at || new Date();
    }

    await Organization.findByIdAndUpdate(orgId, { $set: update });
}

export async function syncDerivedOnboardingProgress(orgId) {
    const org = await Organization.findById(orgId)
        .select("name onboarding_progress logo_url website branding affiliation allowed_domains admission_config demoExpiresAt status")
        .lean();

    if (!org) {
        throw new Error("Organization not found.");
    }

    const safeFeeStructuresQuery = async () => {
        try {
            const result = await supabase
                .from("fee_structures")
                .select("id", { count: "exact", head: true })
                .eq("org_id", String(orgId));
            return result;
        } catch (error) {
            return { count: 0, error };
        }
    };

    const [
        hierarchyCount,
        staffCount,
        studentCount,
        activatedAdminCount,
        feeStructuresResult,
    ] = await Promise.all([
        AcademicHierarchy.countDocuments({ organization_id: orgId, is_active: true }),
        User.countDocuments({
            organization_id: orgId,
            role: { $nin: ["student", "org_admin", "super_admin"] },
            status: { $nin: ["deleted"] },
        }),
        User.countDocuments({
            organization_id: orgId,
            role: "student",
            status: { $nin: ["deleted"] },
        }),
        User.countDocuments({
            organization_id: orgId,
            role: "org_admin",
            mustResetPassword: false,
            status: "active",
        }),
        safeFeeStructuresQuery(),
    ]);

    const current = org.onboarding_progress || {};
    const derived = {
        tenant_created: true,
        branding_configured: current.branding_configured || hasMeaningfulBranding(org),
        academic_hierarchy_set: current.academic_hierarchy_set || hierarchyCount > 0,
        staff_imported: current.staff_imported || staffCount > 0,
        students_imported: current.students_imported || studentCount > 0,
        fee_structure_configured: current.fee_structure_configured || Boolean(feeStructuresResult?.count),
        admission_form_configured: current.admission_form_configured || hasMeaningfulAdmissionConfig(org),
        first_login_completed: current.first_login_completed || activatedAdminCount > 0,
    };

    const allDone = TRACKED_ONBOARDING_STEPS.every((step) => derived[step] === true);
    const stage = deriveOnboardingStage(derived);

    const update = {
        "onboarding_progress.tenant_created": derived.tenant_created,
        "onboarding_progress.branding_configured": derived.branding_configured,
        "onboarding_progress.academic_hierarchy_set": derived.academic_hierarchy_set,
        "onboarding_progress.staff_imported": derived.staff_imported,
        "onboarding_progress.students_imported": derived.students_imported,
        "onboarding_progress.fee_structure_configured": derived.fee_structure_configured,
        "onboarding_progress.admission_form_configured": derived.admission_form_configured,
        "onboarding_progress.first_login_completed": derived.first_login_completed,
        "onboarding_progress.current_stage": stage,
        "onboarding_progress.last_synced_at": new Date(),
    };

    if (allDone) {
        update["onboarding_progress.completed_at"] = current.completed_at || new Date();
    }

    const updatedOrg = await Organization.findByIdAndUpdate(orgId, { $set: update }, { returnDocument: 'after' })
        .select("name onboarding_progress demoExpiresAt status")
        .lean();

    const derivedLeadStage = allDone ? "live" : derived.first_login_completed ? "setup" : "provisioned";
    await DemoRequest.findOneAndUpdate(
        { provisionedOrganizationId: orgId, status: "converted" },
        { $set: { lifecycleStage: derivedLeadStage } }
    );

    return {
        organizationName: updatedOrg?.name || "Unknown Organization",
        progress: updatedOrg?.onboarding_progress || derived,
        counts: {
            hierarchyCount,
            staffCount,
            studentCount,
            feeStructuresCount: feeStructuresResult?.count || 0,
            activatedAdminCount,
        },
    };
}

export async function getOnboardingStatusSnapshot(orgId) {
    const { organizationName, progress, counts } = await syncDerivedOnboardingProgress(orgId);
    const completed = TRACKED_ONBOARDING_STEPS.filter((step) => progress[step] === true).length;
    const percentage = Math.round((completed / TRACKED_ONBOARDING_STEPS.length) * 100);
    const stage = progress.current_stage || deriveOnboardingStage(progress);
    const nextActions = TRACKED_ONBOARDING_STEPS
        .filter((step) => !progress[step])
        .map((step) => ({ step, action: nextActionMeta[step] || `Complete ${step}` }));

    const blockers = [];
    if (!progress.first_login_completed) {
        blockers.push("Org admin account is not activated yet.");
    }

    const recentEvents = await OnboardingEvent.find({ organizationId: orgId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    const activationEvent = await OnboardingEvent.findOne({
        organizationId: orgId,
        eventType: "org_admin_activated",
    })
        .sort({ createdAt: 1 })
        .lean();

    const provisionedEvent = await OnboardingEvent.findOne({
        organizationId: orgId,
        eventType: "lead_provisioned",
    })
        .sort({ createdAt: 1 })
        .lean();

    const metrics = {
        time_to_activation_minutes:
            activationEvent?.createdAt && provisionedEvent?.createdAt
                ? Math.round((new Date(activationEvent.createdAt) - new Date(provisionedEvent.createdAt)) / 60000)
                : null,
    };

    return {
        organizationName,
        stage,
        stageLabel: stageMeta[stage]?.label || "Setup In Progress",
        stageDescription: stageMeta[stage]?.description || "Onboarding is in progress.",
        progress,
        completed_steps: completed,
        total_steps: TRACKED_ONBOARDING_STEPS.length,
        percentage,
        is_complete: percentage === 100,
        next_actions: nextActions,
        blockers,
        counts,
        metrics,
        recent_events: recentEvents,
    };
}
