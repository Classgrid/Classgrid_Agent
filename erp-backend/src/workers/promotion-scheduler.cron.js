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
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import { getChatSb } from "../config/supabaseClient.js";

/**
 * 📅 SAAS SCHEDULED PROMOTION AUTOMATION
 * This cron job runs every hour on the hour (0 * * * *)
 * It checks for any organizations that have a pending scheduled promotion
 * where the execute_at date is in the past (i.e. it is time to execute).
 */
export const initPromotionSchedulerCron = () => {
    // Runs every 5 minutes for better responsiveness on exact dates
    cron.schedule("*/5 * * * *", async () => {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log("[Promotion Scheduler] Database not connected yet. Skipping this run.");
                return;
            }
            const now = new Date();
            // Find organizations that have a pending promotion ready to execute
            const readyOrgs = await Organization.find({
                "scheduled_promotion.status": "pending",
                "scheduled_promotion.execute_at": { $lte: now }
            });

            if (readyOrgs.length === 0) return;

            console.log(`[Promotion Scheduler] Found ${readyOrgs.length} scheduled promotions to execute at ${now.toISOString()}`);

            const sb = getChatSb();

            for (const org of readyOrgs) {
                const orgId = org._id.toString();
                const { target_year_id, excluded_ids, admin_id } = org.scheduled_promotion;

                // 1. Mark as running & acquire lock
                await Organization.findByIdAndUpdate(orgId, {
                    $set: {
                        is_promoting: true,
                        promotion_started_at: new Date(),
                        "scheduled_promotion.status": "running"
                    }
                });

                try {
                    // Create batch record
                    const { data: activeYear } = await sb.from("academic_years").select("id").eq("org_id", orgId).eq("is_active", true).maybeSingle();

                    const { data: batch, error: bErr } = await sb.from("promotion_batches").insert({
                        org_id: orgId,
                        from_academic_year_id: activeYear?.id || null,
                        to_academic_year_id: target_year_id,
                        status: "idle",
                        created_by: admin_id,
                        excluded_count: excluded_ids.length,
                    }).select().single();

                    if (bErr) throw bErr;

                    const orgType = org.org_type || "COLLEGE";

                    // Execute via RPC
                    const { data: result, error: rpcErr } = await sb.rpc("execute_promotion", {
                        p_batch_id: batch.id,
                        p_org_id: orgId,
                        p_to_academic_year_id: target_year_id,
                        p_excluded_ids: excluded_ids,
                        p_admin_id: admin_id,
                        p_org_type: orgType,
                    });

                    if (rpcErr || result?.success === false) {
                        const errMsg = rpcErr ? rpcErr.message : (result?.error || "Unknown error");
                        console.error(`[Promotion Scheduler] RPC Error for Org ${orgId}:`, errMsg);
                        
                        // Fail batch and schedule
                        if (batch?.id) {
                             await sb.from("promotion_batches").update({ status: "failed", error_message: errMsg, completed_at: new Date().toISOString() }).eq("id", batch.id);
                        }
                        await Organization.findByIdAndUpdate(orgId, {
                            $set: { is_promoting: false, "scheduled_promotion.status": "failed" }
                        });
                    } else {
                        // Success
                        console.log(`[Promotion Scheduler] Success for Org ${orgId}, Batch ${batch.id}`);
                        await Organization.findByIdAndUpdate(orgId, {
                            $set: { is_promoting: false, "scheduled_promotion.status": "completed" }
                        });
                    }
                } catch (err) {
                    console.error(`[Promotion Scheduler] Execution crashed for Org ${orgId}:`, err);
                    await Organization.findByIdAndUpdate(orgId, {
                        $set: { is_promoting: false, "scheduled_promotion.status": "failed" }
                    });
                }
            }
        } catch (error) {
            console.error("[Promotion Scheduler] Fatal error in cron job:", error);
        }
    });
};
