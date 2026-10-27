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

import AdmissionApplication from "../../models/AdmissionApplication.js";
import SeatConfig from "../../models/SeatConfig.js";
import { ADMISSION_STAGES } from "./admission-workflow.service.js";

/**
 * waitlist.service.js
 * 
 * Auto-promotion engine that manages the waitlist for schools and junior colleges.
 * Grabs the highest merit candidate and provisions a seat when it becomes available.
 */
class WaitlistService {
    
    /**
     * Automatically promote the top N waitlisted students when seats free up.
     * 
     * @param {string} orgId 
     * @param {string} hierarchyId 
     * @param {string} quotaName 
     * @param {number} availableSeats 
     */
    async autoPromoteFromWaitlist(orgId, hierarchyId, quotaName, availableSeats = 1) {
        if (availableSeats <= 0) return { promotedCount: 0 };

        try {
            // 1. Fetch Top candidates ordered by merit score (Descending)
            const waitlistedCandidates = await AdmissionApplication.find({
                organization_id: orgId,
                hierarchy_id: hierarchyId,
                seat_type: quotaName,
                status: "waitlisted",
                is_deleted: false
            })
            .sort({ merit_score: -1, createdAt: 1 }) // Highest merit first, then earliest applied
            .limit(availableSeats);

            if (waitlistedCandidates.length === 0) {
                return { promotedCount: 0, message: "No candidates on the waitlist." };
            }

            let promotedCount = 0;

            for (const candidate of waitlistedCandidates) {
                
                // 2. Safely claim the seat from SeatConfig using optimistic currency control principles 
                //    (Though here we assume SeatMatrix released the seat prior, we sync the numbers)
                const seatUpdate = await SeatConfig.findOneAndUpdate(
                    {
                        organization_id: orgId,
                        hierarchy_id: hierarchyId,
                        "quotas.name": quotaName,
                        "quotas.waitlist_count": { $gt: 0 }
                    },
                    { 
                        $inc: { 
                            "quotas.$.filled": 1,
                            "quotas.$.waitlist_count": -1 
                        } 
                    },
                    { returnDocument: 'after' }
                );

                if (!seatUpdate) {
                    console.warn(`[WaitlistEngine] Could not allocate seat for ${candidate._id}. Configuration error or negative waitlist.`);
                    break; // Stop promoting if seat config rejects
                }

                // 3. Update the candidate
                candidate.status = ADMISSION_STAGES.APPLIED;
                candidate.stage_history.push({
                    status: ADMISSION_STAGES.APPLIED,
                    comment: "AUTO-PROMOTED: Promoted from waitlist due to seat availability.",
                    timestamp: new Date()
                });

                await candidate.save();
                promotedCount++;

                // 4. (TODO) Trigger SMS/Email Notification
                // In production, trigger Brevo service here.
                console.log(`[WaitlistEngine] Candidate ${candidate.en_number || candidate.phone} promoted to Applied!`);
            }

            return { success: true, promotedCount };
            
        } catch (error) {
            console.error("❌ WaitlistService.autoPromote Error:", error);
            throw new Error("Failed to process waitlist promotion.");
        }
    }

    /**
     * Add a candidate to the waitlist safely (Incrementing SeatConfig waitlist metric)
     */
    async enforceWaitlist(applicationId, orgId, hierarchyId, quotaName) {
        const app = await AdmissionApplication.findById(applicationId);
        if (!app) throw new Error("Application not found");

        app.status = "waitlisted";
        app.stage_history.push({
            status: "waitlisted",
            comment: "Added to waitlist. No seats available at the moment.",
            timestamp: new Date()
        });

        await app.save();

        await SeatConfig.findOneAndUpdate(
            { organization_id: orgId, hierarchy_id: hierarchyId, "quotas.name": quotaName },
            { $inc: { "quotas.$.waitlist_count": 1 } }
        );

        return { success: true, status: "waitlisted" };
    }
}

export default new WaitlistService();
