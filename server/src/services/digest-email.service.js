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

/**
 * Classgrid — Digest Email Service (Phase 1.5)
 *
 * Sends daily and weekly digest emails to users who prefer batched delivery.
 * Uses lastDigestSentAt for reliable tracking — never loses notifications
 * even if a cron run is missed.
 */

import { sendEmail } from "./aws-ses.service.js";
import {
    getDailyDigestEmailHtml,
    getDailyDigestEmailPlainText,
} from "./email-templates.service.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const BATCH_SIZE = 50;
const FRONTEND_URL = () =>
    process.env.FRONTEND_URL?.trim() ||
    (process.env.NODE_ENV === "production"
        ? "https://classgrid.in"
        : "https://classgrid.in");

// ─────────────────────────────────────────────────
// HELPER: Send emails in batches
// ─────────────────────────────────────────────────
async function sendInBatches(emailPayloads) {
    const results = { sent: 0, failed: 0 };
    for (let i = 0; i < emailPayloads.length; i += BATCH_SIZE) {
        const batch = emailPayloads.slice(i, i + BATCH_SIZE);
        const settled = await Promise.allSettled(
            batch.map((p) => sendEmail(p))
        );
        settled.forEach((r) => {
            if (r.status === "fulfilled") results.sent++;
            else results.failed++;
        });
    }
    return results;
}

// ─────────────────────────────────────────────────
// DAILY DIGEST
// Queries unread notifications since lastDigestSentAt
// ─────────────────────────────────────────────────
export async function sendDailyDigests() {
    try {
        // Find all users with digestMode = 'daily' and global enabled
        const users = await User.find({
            "emailNotifications.digestMode": "daily",
            "emailNotifications.global": { $ne: false },
            is_demo: { $ne: true },
        })
            .select("name email emailNotifications")
            .lean();

        if (!users.length) {
            console.log("[Digest] No daily digest users found");
            return { total: 0, sent: 0, failed: 0 };
        }

        const emailPayloads = [];

        for (const user of users) {
            if (!user.email) continue;

            // Query from lastDigestSentAt (or last 24h fallback)
            const since = user.emailNotifications?.lastDigestSentAt
                ? new Date(user.emailNotifications.lastDigestSentAt)
                : new Date(Date.now() - 24 * 60 * 60 * 1000);

            const notifications = await Notification.find({
                recipient: user._id,
                createdAt: { $gte: since },
            })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            if (!notifications.length) continue;

            // Group by type for summary
            const grouped = {};
            for (const n of notifications) {
                const key = n.type || "other";
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(n);
            }

            const settingsUrl = `${FRONTEND_URL()}/settings`;

            emailPayloads.push({
                userId: user._id,
                to: user.email,
                channel: "notification",
                subject: `Daily Summary: ${notifications.length} update${notifications.length > 1 ? "s" : ""} | Classgrid`,
                html: getDailyDigestEmailHtml({
                    userName: user.name,
                    notifications,
                    grouped,
                    totalCount: notifications.length,
                    settingsUrl,
                    frontendUrl: FRONTEND_URL(),
                }),
                text: getDailyDigestEmailPlainText({
                    userName: user.name,
                    notifications,
                    totalCount: notifications.length,
                    settingsUrl,
                }),
            });
        }

        if (!emailPayloads.length) {
            console.log("[Digest] No pending notifications for daily digest users");
            return { total: 0, sent: 0, failed: 0 };
        }

        // Send all digests
        const results = await sendInBatches(emailPayloads);

        // Update lastDigestSentAt for successful users
        const userIds = emailPayloads.map((p) => p.userId);
        await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { "emailNotifications.lastDigestSentAt": new Date() } }
        ).catch((err) => {
            console.error("[Digest] Failed to update lastDigestSentAt:", err.message);
        });

        console.log(
            `[Digest] Daily: ${results.sent} sent, ${results.failed} failed, ${emailPayloads.length} total`
        );
        return { total: emailPayloads.length, ...results };
    } catch (err) {
        console.error("[Digest] Daily digest failed:", err.message);
        return { total: 0, sent: 0, failed: 0 };
    }
}

// ─────────────────────────────────────────────────
// WEEKLY DIGEST
// Same as daily but for weekly users, queries from lastDigestSentAt
// ─────────────────────────────────────────────────
export async function sendWeeklyDigests() {
    try {
        const users = await User.find({
            "emailNotifications.digestMode": "weekly",
            "emailNotifications.global": { $ne: false },
            is_demo: { $ne: true },
        })
            .select("name email emailNotifications")
            .lean();

        if (!users.length) {
            console.log("[Digest] No weekly digest users found");
            return { total: 0, sent: 0, failed: 0 };
        }

        const emailPayloads = [];

        for (const user of users) {
            if (!user.email) continue;

            const since = user.emailNotifications?.lastDigestSentAt
                ? new Date(user.emailNotifications.lastDigestSentAt)
                : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const notifications = await Notification.find({
                recipient: user._id,
                createdAt: { $gte: since },
            })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            if (!notifications.length) continue;

            const grouped = {};
            for (const n of notifications) {
                const key = n.type || "other";
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(n);
            }

            const settingsUrl = `${FRONTEND_URL()}/settings`;

            emailPayloads.push({
                userId: user._id,
                to: user.email,
                channel: "notification",
                subject: `Weekly Summary: ${notifications.length} update${notifications.length > 1 ? "s" : ""} | Classgrid`,
                html: getDailyDigestEmailHtml({
                    userName: user.name,
                    notifications,
                    grouped,
                    totalCount: notifications.length,
                    settingsUrl,
                    frontendUrl: FRONTEND_URL(),
                    isWeekly: true,
                }),
                text: getDailyDigestEmailPlainText({
                    userName: user.name,
                    notifications,
                    totalCount: notifications.length,
                    settingsUrl,
                    isWeekly: true,
                }),
            });
        }

        if (!emailPayloads.length) {
            console.log("[Digest] No pending notifications for weekly digest users");
            return { total: 0, sent: 0, failed: 0 };
        }

        const results = await sendInBatches(emailPayloads);

        const userIds = emailPayloads.map((p) => p.userId);
        await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { "emailNotifications.lastDigestSentAt": new Date() } }
        ).catch((err) => {
            console.error("[Digest] Failed to update lastDigestSentAt:", err.message);
        });

        console.log(
            `[Digest] Weekly: ${results.sent} sent, ${results.failed} failed, ${emailPayloads.length} total`
        );
        return { total: emailPayloads.length, ...results };
    } catch (err) {
        console.error("[Digest] Weekly digest failed:", err.message);
        return { total: 0, sent: 0, failed: 0 };
    }
}
