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

import SeatConfig from "../../models/SeatConfig.js";
import { getIO } from "../socket.service.js";

/**
 * SeatMatrixService handles seat allocation, seat release, and live broadcasts.
 */
class SeatMatrixService {
    /**
     * Atomically increment filled seats for a quota.
     * Supports optional mongoose sessions so enrollment flows can keep
     * seat updates consistent with user/application writes.
     */
    async allocateSeat(orgId, hierarchyId, quotaName, options = {}) {
        const { session = null, suppressBroadcast = false } = options;
        let retries = 5;

        while (retries > 0) {
            try {
                let configQuery = SeatConfig.findOne({
                    organization_id: orgId,
                    hierarchy_id: hierarchyId,
                    "quotas.name": quotaName
                }).lean();

                if (session) {
                    configQuery = configQuery.session(session);
                }

                const config = await configQuery;
                if (!config) {
                    return { success: false, error: "Seat configuration not found" };
                }

                const quota = config.quotas.find((q) => q.name === quotaName);
                if (!quota) {
                    return { success: false, error: `Quota ${quotaName} not configured` };
                }

                if (quota.filled >= quota.capacity) {
                    return { success: false, error: `No vacant seats available for ${quotaName}` };
                }

                const updateOptions = { returnDocument: 'after' };
                if (session) {
                    updateOptions.session = session;
                }

                const result = await SeatConfig.findOneAndUpdate(
                    {
                        _id: config._id,
                        quotas: {
                            $elemMatch: {
                                name: quotaName,
                                filled: quota.filled
                            }
                        }
                    },
                    { $inc: { "quotas.$.filled": 1 } },
                    updateOptions
                );

                if (result) {
                    const updatedQuota = result.quotas.find((q) => q.name === quotaName);
                    const vacancy = updatedQuota.capacity - updatedQuota.filled;
                    const allocationResult = {
                        success: true,
                        hierarchyId,
                        quotaName,
                        vacancy,
                        totalFilled: updatedQuota.filled,
                        waitlistCount: updatedQuota.waitlist_count || 0,
                    };

                    if (!suppressBroadcast) {
                        this.broadcastUpdate(orgId, "SEAT_ALLOCATED", {
                            hierarchyId,
                            quotaName,
                            vacancy,
                            totalFilled: updatedQuota.filled
                        });
                    }

                    return allocationResult;
                }

                retries--;
                console.warn(`[SeatMatrix] Conflict detected for ${quotaName}, retrying... (${retries} left)`);
                await new Promise((resolve) => setTimeout(resolve, 50 * (5 - retries)));
            } catch (error) {
                console.error("[SeatMatrix] allocateSeat error:", error.message);
                throw error;
            }
        }

        return { success: false, error: "Conflict during seat allocation. Please try again." };
    }

    /**
     * Release an allocated seat.
     * Supports optional session use and deferred side effects.
     */
    async releaseSeat(orgId, hierarchyId, quotaName, options = {}) {
        const {
            session = null,
            suppressBroadcast = false,
            suppressWaitlist = false,
        } = options;

        try {
            const updateOptions = { returnDocument: 'after' };
            if (session) {
                updateOptions.session = session;
            }

            const result = await SeatConfig.findOneAndUpdate(
                {
                    organization_id: orgId,
                    hierarchy_id: hierarchyId,
                    quotas: {
                        $elemMatch: {
                            name: quotaName,
                            filled: { $gt: 0 }
                        }
                    }
                },
                { $inc: { "quotas.$.filled": -1 } },
                updateOptions
            );

            if (!result) {
                return { success: false, error: `No allocated seats to release for ${quotaName}` };
            }

            const updatedQuota = result.quotas.find((q) => q.name === quotaName);
            const vacancy = updatedQuota.capacity - updatedQuota.filled;
            const releaseResult = {
                success: true,
                hierarchyId,
                quotaName,
                vacancy,
                totalFilled: updatedQuota.filled,
                waitlistCount: updatedQuota.waitlist_count || 0,
            };

            if (!suppressBroadcast) {
                this.broadcastUpdate(orgId, "SEAT_RELEASED", {
                    hierarchyId,
                    quotaName,
                    vacancy,
                    totalFilled: updatedQuota.filled
                });
            }

            if (!suppressWaitlist && updatedQuota.waitlist_count > 0) {
                try {
                    const { default: waitlistService } = await import("./waitlist.service.js");
                    await waitlistService.autoPromoteFromWaitlist(orgId, hierarchyId, quotaName, 1);
                } catch (waitErr) {
                    console.error("[SeatMatrix] Failed to trigger waitlist promotion:", waitErr);
                }
            }

            return releaseResult;
        } catch (error) {
            console.error("[SeatMatrix] releaseSeat error:", error.message);
            throw error;
        }
    }

    /**
     * Broadcast live updates to projectors.
     */
    broadcastUpdate(orgId, type, data) {
        try {
            const io = getIO();
            if (io) {
                io.to(`org_${orgId}_admission`).emit("ADMISSION_LIVE_UPDATE", {
                    type,
                    data,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.warn(`[SeatMatrix] Broadcast failed: ${error.message}`);
        }
    }

    /**
     * Get live state of all seats for an organization.
     */
    async getFullMatrix(orgId) {
        return await SeatConfig.find({ organization_id: orgId, is_active: true })
            .populate("hierarchy_id", "name level_type code")
            .lean();
    }
}

export default new SeatMatrixService();
