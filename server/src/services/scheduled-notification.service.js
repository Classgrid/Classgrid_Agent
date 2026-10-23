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

import ScheduledNotification from "../models/ScheduledNotification.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import { sendPushToMultiple } from "./firebase.service.js";
import { sendPushNotification } from "./push.service.js";
import { sendNotificationEmail } from "./notification-email.service.js";
import {
    buildUserRoleFilter,
    getUserRolesForTarget,
    normalizeScheduledTarget,
} from "../utils/notification-targeting.js";

const DEFAULT_BATCH_SIZE = 10;
const FCM_BATCH_SIZE = 500;

function chunkArray(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
    return chunks;
}

function addOneYear(date) {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + 1);
    return next;
}

function scheduledTypeForCategory(category) {
    if (["maintenance", "update"].includes(category)) return "alert";
    return "system";
}

async function resolveScheduledRecipients(schedule) {
    const target = normalizeScheduledTarget(schedule.target);
    const baseFilter = { status: "active" };

    if (target === "global") {
        return User.find(baseFilter).select("_id").lean();
    }

    if (target === "active_orgs") {
        const orgs = await Organization.find({ status: "active" }).select("_id").lean();
        const orgIds = orgs.map((org) => org._id);
        if (orgIds.length === 0) return [];
        return User.find({ ...baseFilter, organization_id: { $in: orgIds } }).select("_id").lean();
    }

    if (target === "specific_org") {
        if (!schedule.targetOrgId) return [];
        return User.find({ ...baseFilter, organization_id: schedule.targetOrgId }).select("_id").lean();
    }

    const roles = getUserRolesForTarget(target);
    if (roles.length === 0) return [];
    return User.find({ ...baseFilter, ...buildUserRoleFilter(roles) }).select("_id").lean();
}

async function sendPushToRecipientIds(recipientIds, title, body, data) {
    if (recipientIds.length === 0) return { sent: 0, failed: 0, cleaned: 0 };

    let sent = 0;
    let failed = 0;
    let cleaned = 0;

    for (const recipientChunk of chunkArray(recipientIds, FCM_BATCH_SIZE)) {
        const { data: tokens, error } = await supabase
            .from("device_tokens")
            .select("fcm_token")
            .in("user_id", recipientChunk);

        if (error) {
            console.error("[ScheduledNotification] FCM token fetch failed:", error.message);
            failed += recipientChunk.length;
            continue;
        }

        const fcmTokens = (tokens || []).map((token) => token.fcm_token).filter(Boolean);
        if (fcmTokens.length > 0) {
            const result = await sendPushToMultiple(fcmTokens, title, body, data);
            sent += result.success;
            failed += result.failure;

            if (result.invalidTokens.length > 0) {
                await supabase.from("device_tokens").delete().in("fcm_token", result.invalidTokens);
                cleaned += result.invalidTokens.length;
            }
        }

        await Promise.allSettled(
            recipientChunk.map((recipientId) =>
                sendPushNotification(recipientId, { title, body, url: data.deepLink || data.link || "" })
            )
        );
    }

    return { sent, failed, cleaned };
}

async function sendEmailToRecipientIds(recipientIds, type, title, body, link) {
    if (recipientIds.length === 0) return 0;

    const results = await Promise.allSettled(
        recipientIds.map((recipientId) => sendNotificationEmail(recipientId, type, title, body, link))
    );

    return results.filter((result) => result.status === "fulfilled").length;
}

async function executeScheduledNotification(schedule) {
    const type = scheduledTypeForCategory(schedule.category);
    const recipients = await resolveScheduledRecipients(schedule);
    const recipientIds = recipients.map((recipient) => recipient._id.toString());
    const relatedId = schedule._id.toString();
    const link = schedule.deepLink || "";

    if (recipientIds.length > 0) {
        await Notification.insertMany(
            recipientIds.map((recipientId) => ({
                recipient: recipientId,
                type,
                title: schedule.title,
                message: schedule.body,
                link,
                relatedId,
            })),
            { ordered: false }
        );
    }

    const pushStats = await sendPushToRecipientIds(recipientIds, schedule.title, schedule.body, {
        deepLink: link,
        link,
        type,
        relatedId,
    });

    let emailsQueued = 0;
    if (schedule.sendEmail) {
        emailsQueued = await sendEmailToRecipientIds(recipientIds, type, schedule.title, schedule.body, link);
    }

    return {
        recipientCount: recipientIds.length,
        pushStats,
        emailsQueued,
    };
}

export async function processDueScheduledNotifications({ now = new Date(), batchSize = DEFAULT_BATCH_SIZE } = {}) {
    const due = await ScheduledNotification.find({
        status: "pending",
        scheduledAt: { $lte: now },
    })
        .sort({ scheduledAt: 1 })
        .limit(batchSize)
        .lean();

    const stats = { checked: due.length, sent: 0, failed: 0, skipped: 0 };

    for (const item of due) {
        const schedule = await ScheduledNotification.findOneAndUpdate(
            { _id: item._id, status: "pending" },
            { $set: { status: "processing" } },
            { returnDocument: 'after' }
        );

        if (!schedule) {
            stats.skipped += 1;
            continue;
        }

        try {
            const result = await executeScheduledNotification(schedule);

            await ScheduledNotification.findByIdAndUpdate(schedule._id, {
                $set: {
                    status: "sent",
                    sentAt: new Date(),
                    sentCount: result.recipientCount,
                },
            });

            if (schedule.isRecurring) {
                await ScheduledNotification.create({
                    title: schedule.title,
                    body: schedule.body,
                    target: schedule.target,
                    targetOrgId: schedule.targetOrgId,
                    scheduledAt: addOneYear(schedule.scheduledAt),
                    isRecurring: true,
                    category: schedule.category,
                    deepLink: schedule.deepLink,
                    sendEmail: schedule.sendEmail,
                    createdBy: schedule.createdBy,
                });
            }

            stats.sent += 1;
        } catch (err) {
            await ScheduledNotification.findByIdAndUpdate(schedule._id, {
                $set: { status: "failed" },
            });
            stats.failed += 1;
            console.error("[ScheduledNotification] Delivery failed:", {
                id: schedule._id.toString(),
                error: err.message,
            });
        }
    }

    return stats;
}
