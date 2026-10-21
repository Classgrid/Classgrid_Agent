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

import nodeCron from "node-cron";
import Organization from "../models/Organization.js";
import AdmissionApplication from "../models/AdmissionApplication.js";
import { ADMISSION_STAGES, promoteWaitlistInternal } from "../services/admissions/admission-workflow.service.js";
import seatMatrixService from "../services/admissions/seat-matrix.service.js";

/**
 * ADMISSION DEADLINE CHECKER CRON
 * Manages automated lapsing of seats and cleanup of stale applications.
 */
export const initAdmissionCronJobs = () => {
    // Runs at 01:00 AM every day
    nodeCron.schedule("0 1 * * *", async () => {
        console.log("[Admission Cron] Starting daily deadline checks...");
        try {
            const organizations = await Organization.find({ 
                "admission_config.is_portal_open": true 
            }).select("admission_config");

            for (const org of organizations) {
                const cutoffDate = org.admission_config?.cutoff_date;
                if (cutoffDate && new Date() > new Date(cutoffDate)) {
                    await handleLapsedSeats(org._id);
                }
                
                await cleanupStaleDrafts(org._id);
            }
            console.log("[Admission Cron] Daily checks completed.");
        } catch (err) {
            console.error("[Admission Cron] Error:", err.message);
        }
    });

    console.log("🚀 Admission Deadline Cron initialized.");
};

/**
 * Lapse unpaid seats for a specific organization.
 * Transitions fee_pending -> withdrawn and releases seats.
 */
async function handleLapsedSeats(orgId) {
    const lapsedApplications = await AdmissionApplication.find({
        organization_id: orgId,
        status: ADMISSION_STAGES.FEE_PENDING,
        fee_paid: false
    });

    if (lapsedApplications.length === 0) return;

    console.log(`[Admission Cron] Lapsing ${lapsedApplications.length} seats for org: ${orgId}`);

    for (const app of lapsedApplications) {
        app.status = ADMISSION_STAGES.WITHDRAWN;
        app.stage_history.push({
            status: ADMISSION_STAGES.WITHDRAWN,
            comment: "Seat lapsed automatically due to payment deadline."
        });
        await app.save();

        // Release the seat
        await seatMatrixService.releaseSeat(
            orgId,
            app.hierarchy_id,
            app.seat_type || "CAP",
            { suppressWaitlist: true }
        );

        // Trigger auto-promotion if enabled in org
        const org = await Organization.findById(orgId).select("admission_config");
        if (org.admission_config?.auto_promotion_enabled) {
            await promoteWaitlistInternal(orgId, app.hierarchy_id);
        }
    }
}

/**
 * Mark applications stale if draft is older than 15 days.
 */
async function cleanupStaleDrafts(orgId) {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const result = await AdmissionApplication.updateMany(
        {
            organization_id: orgId,
            status: ADMISSION_STAGES.DRAFT,
            updatedAt: { $lt: fifteenDaysAgo },
            is_deleted: false
        },
        { 
            $set: { is_deleted: true },
            $push: { stage_history: { status: "stale_cleanup", comment: "Marked as stale (draft > 15 days)." } }
        }
    );

    if (result.modifiedCount > 0) {
        console.log(`[Admission Cron] Marked ${result.modifiedCount} stale drafts as deleted for org: ${orgId}`);
    }
}
