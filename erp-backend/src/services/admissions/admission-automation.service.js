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

import cron from "node-cron";
import AdmissionApplication from "../../models/AdmissionApplication.js";
import Organization from "../../models/Organization.js";
import { ADMISSION_STAGES, promoteWaitlistInternal } from "./admission-workflow.service.js";
import { dispatchNotification } from "./admission-notification.service.js";

/**
 * admission-automation.service.js
 * 
 * Houses the background cron jobs and automated logic for Admissions:
 * 1. Seat Lapse Watcher (Lapses fee_pending seats after deadline)
 * 2. Auto-Promotion Engine (Promotes waitlisted students when seats open)
 * 3. Daily Admission Summary (Mails org admins)
 */

export const startAdmissionCrons = () => {
    console.log("🚀 [Admission Engine] Starting automation crons...");

    // 1. Run Fee Lapse Watcher & Auto-Promotion every midnight
    cron.schedule("0 0 * * *", async () => {
        console.log("🕒 [CRON] Running Waitlist & Fee Deadline Evaluator...");
        try {
            await enforceFeeDeadlinesAndAutoPromote();
        } catch (error) {
            console.error("❌ [CRON] Error in admission automation:", error);
        }
    });
};

/**
 * Enforces fee deadlines for all organizations where waitlist is enabled.
 * If a student in fee_pending has passed the org's cutoff_date for payment,
 * they are moved to withdrawn/lapsed, and the next waitlist candidate is promoted.
 */
export const enforceFeeDeadlinesAndAutoPromote = async () => {
    // 1. Find organizations with active portals and auto-promotion enabled
    const organizations = await Organization.find({
        "admission_config.is_portal_open": true,
        "admission_config.auto_promotion_enabled": true
    }).select("_id name admission_config");

    for (const org of organizations) {
        const orgId = org._id;
        const config = org.admission_config;

        if (!config.cutoff_date) continue; // No deadline set

        // 2. Find applications that are fee_pending past the cutoff deadline
        const lapsedApplications = await AdmissionApplication.find({
            organization_id: orgId,
            status: ADMISSION_STAGES.FEE_PENDING,
            updatedAt: { $lt: new Date(config.cutoff_date) }
        });

        for (const app of lapsedApplications) {
            // Mark as lapsed/withdrawn
            app.status = ADMISSION_STAGES.WITHDRAWN;
            app.stage_history.push({
                status: ADMISSION_STAGES.WITHDRAWN,
                comment: "System: Fee payment deadline passed. Seat lapsed."
            });
            await app.save();

            // Notify student
            await dispatchNotification("WITHDRAWN", {
                application: app,
                orgName: org.name,
                extra: "Failure to pay admission fees by the deadline."
            });

            // 3. Auto-promote the next waitlist candidate for this hierarchy
            await promoteWaitlistInternal(orgId, app.hierarchy_id, org.name);
        }
    }
};

export default {
    startAdmissionCrons,
    enforceFeeDeadlinesAndAutoPromote
};
