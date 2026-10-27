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

import webPush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

// Initialize web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
        webPush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:admin@classgrid.in',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } catch (err) {
        console.error("Failed to initialize VAPID details:", err.message);
        // Clear keys to gracefully degrade if invalid
        process.env.VAPID_PUBLIC_KEY = "";
        process.env.VAPID_PRIVATE_KEY = "";
    }
}

/**
 * Send a web push notification to all devices of a user
 * @param {string} userId - The MongoDB ObjectId of the user
 * @param {object} payload - The notification payload
 */
export const sendPushNotification = async (userId, payload) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
        console.log("VAPID keys not configured, skipping push notification.");
        return;
    }

    try {
        const subscriptions = await PushSubscription.find({ userId });
        if (subscriptions.length === 0) return;

        const pushPayload = JSON.stringify(payload);

        const sendPromises = subscriptions.map(async (sub) => {
            try {
                await webPush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys
                    },
                    pushPayload
                );
                // Update last used
                sub.lastUsed = Date.now();
                await sub.save();
            } catch (error) {
                // If subscription is expired/invalid (status 410 or 404), remove it
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await PushSubscription.deleteOne({ _id: sub._id });
                } else {
                    console.error("Error sending push notification:", error);
                }
            }
        });

        await Promise.all(sendPromises);
    } catch (error) {
        console.error("Failed to send push notifications for user", userId, error);
    }
};

/**
 * Send a web push notification to all devices of a specific role
 * @param {string} role - The role (e.g. "super_admin")
 * @param {object} payload - The notification payload
 */
export const sendPushToRole = async (role, payload) => {
    try {
        const User = (await import("../models/User.js")).default;
        const users = await User.find({ role }).select("_id").lean();
        const promises = users.map(u => sendPushNotification(u._id, payload));
        await Promise.all(promises);
    } catch (error) {
        console.error(`Failed to send push notifications to role ${role}`, error);
    }
};
