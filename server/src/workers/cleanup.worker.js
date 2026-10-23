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

import nodeCron from "node-cron";
import Notification from "../models/Notification.js";
import AttendanceSession from "../models/AttendanceSession.js";
import connectDB from "../../config/db.js";
import { processEmailQueue } from "../services/email-queue.service.js";
import { processDemoExpiryReminders } from "../services/demo-expiry-reminder.service.js";

/**
 * DAILY MAINTENANCE WORKER
 */
export const initCronJobs = () => {
    let isEmailQueueRunning = false;

    // 1. Cleanup old notifications (older than 30 days)
    nodeCron.schedule("0 0 * * *", async () => {
        console.log("[Cron] Running notification cleanup...");
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const result = await Notification.deleteMany({
                createdAt: { $lt: thirtyDaysAgo },
                isRead: true,
            });
            console.log(`[Cron] Cleaned up ${result.deletedCount} old notifications.`);
        } catch (err) {
            console.error("[Cron] Notification cleanup error:", err.message);
        }
    }, { timezone: "Asia/Kolkata" });

    // 2. Auto-expire any forgotten attendance sessions
    nodeCron.schedule("*/15 * * * *", async () => {
        console.log("[Cron] Checking for stale attendance sessions...");
        try {
            const result = await AttendanceSession.updateMany(
                { status: "active", expiresAt: { $lt: new Date() } },
                { $set: { status: "expired" } }
            );
            if (result.modifiedCount > 0) {
                console.log(`[Cron] Expired ${result.modifiedCount} stale attendance sessions.`);
            }
        } catch (err) {
            console.error("[Cron] Stale attendance cleanup error:", err.message);
        }
    }, { timezone: "Asia/Kolkata" });

    // 3. Process the transactional email queue every minute.
    nodeCron.schedule("* * * * *", async () => {
        if (isEmailQueueRunning) return;
        isEmailQueueRunning = true;

        try {
            await connectDB();
            const stats = await processEmailQueue(10);
            if (stats.fetched > 0 || stats.sent > 0 || stats.failed > 0) {
                console.log(`[Cron] Email queue processed in worker: fetched=${stats.fetched} sent=${stats.sent} failed=${stats.failed}`);
            }
        } catch (err) {
            console.error("[Cron] Email queue worker error:", err.message);
        } finally {
            isEmailQueueRunning = false;
        }
    }, { timezone: "Asia/Kolkata" });

    // 4. Check demo milestone reminders daily at 10:00 AM IST.
    nodeCron.schedule("0 10 * * *", async () => {
        console.log("[Cron] Running demo expiry reminder check...");
        try {
            await connectDB();
            const results = await processDemoExpiryReminders(new Date());
            console.log(`[Cron] Demo reminder check complete: checked=${results.checked} queued=${results.queued} skipped=${results.skipped}`);
            if (results.errors.length > 0) {
                console.warn("[Cron] Demo reminder check errors:", results.errors);
            }
        } catch (err) {
            console.error("[Cron] Demo reminder check error:", err.message);
        }
    }, { timezone: "Asia/Kolkata" });

    // 5. Auto-close resolved tickets after 7 days of inactivity
    nodeCron.schedule("0 0 * * *", async () => {
        console.log("[Cron] Running ticket auto-close cleanup...");
        try {
            const SupportTicket = (await import("../models/SupportTicket.js")).default;

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const result = await SupportTicket.updateMany(
                {
                    status: "resolved",
                    resolvedAt: { $lt: sevenDaysAgo }
                },
                {
                    $set: { status: "closed" },
                    $push: {
                        events: {
                            type: 'statusChanged',
                            label: 'Ticket auto-closed after 7 days of inactivity',
                            from: 'resolved',
                            to: 'closed',
                            actorName: 'System',
                            actorRole: 'system',
                            createdAt: new Date()
                        }
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`[Cron] Auto-closed ${result.modifiedCount} resolved tickets.`);
            }
        } catch (err) {
            console.error("[Cron] Ticket auto-close error:", err.message);
        }
    }, { timezone: "Asia/Kolkata" });

    console.log("Background cron jobs initialized successfully.");
};
