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

import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendPushToDevice, sendPushToMultiple } from './firebase.service.js';
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';
import { sendNotificationEmail } from './notification-email.service.js';
import { sendPushNotification } from './push.service.js';

/**
 * Central Notification Dispatcher
 * Handles internal DB notifications, Firebase Push, and Email alerts.
 */
export async function dispatchNotification({
    recipientId,
    type,
    title,
    message,
    link = '',
    relatedId = '',
    sendPush = true,
    sendEmail = false,
    orgId = null,
    isCall = false // --- Day 17: VoIP Ringing Support ---
}) {
    try {
        const recipientDoc = await User.findById(recipientId).select("organization_id inAppNotifications").lean();
        // Bell preferences: "All Notifications" off silences everything; "Grid messages" off silences Grid chat
        const prefs = recipientDoc?.inAppNotifications || {};
        if (!isCall && (prefs.global === false || (prefs.chat === false && (type === 'chat' || type === 'group_join')))) {
            return null;
        }
        const effectiveOrgId = orgId || recipientDoc?.organization_id;
        if (!effectiveOrgId) {
            console.log('[NotificationService] Dispatch: No organization_id found, proceeding as a system notification.');
        }

        // 1. Throttling Check (Persistent in MongoDB or Redis - using simple DB check for now)
        if (sendPush && type === 'chat') {
            const lastNotif = await Notification.findOne({
                recipient: recipientId,
                type: 'chat',
                createdAt: { $gt: new Date(Date.now() - 30 * 1000) } // 30 second throttle
            }).lean();
            if (lastNotif) {
                // Skip push but still create DB record
                sendPush = false; 
            }
        }

        // 2. Create Internal DB Notification (Mongoose)
        const notification = await Notification.create({
            organization_id: effectiveOrgId,
            recipient: recipientId,
            type,
            title,
            message,
            link,
            relatedId
        });

        // 2. Handle Firebase Push Notifications
        if (sendPush) {
            // Fetch FCM tokens from Supabase/Postgres
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('fcm_token')
                .eq('user_id', recipientId);

            if (tokens && tokens.length > 0) {
                const fcmTokens = tokens.map(t => t.fcm_token);
                await sendPushToMultiple(fcmTokens, title, message, { link, type, relatedId, isCall });
            }

            // Web Push for Browsers
            await sendPushNotification(recipientId, { title, body: message, url: link }).catch(e => console.error("WebPush Dispatch Error:", e));
        }

        // 3. Handle Email Notifications (Optional)
        if (sendEmail) {
            // This assumes notification-email.service handles checking user prefs
            await sendNotificationEmail(recipientId, type, title, message, link);
            notification.emailSent = true;
            notification.emailSentAt = new Date();
            await notification.save();
        }

        return notification;
    } catch (err) {
        console.error('[NotificationService] Dispatch Error:', err.message);
        // We don't want notification failure to break the main application flow
        return null;
    }
}

/**
 * Bulk Dispatch to a list of students or faculty
 */
export async function bulkDispatchNotification({
    recipientIds,
    type,
    title,
    message,
    link = '',
    relatedId = '',
    sendPush = true,
    orgId = null
}) {
    try {
        if (!recipientIds || recipientIds.length === 0) return;
        let effectiveOrgId = orgId;
        if (!effectiveOrgId) {
            effectiveOrgId = (await User.findById(recipientIds[0]).select("organization_id").lean())?.organization_id;
        }
        
        // Ensure effectiveOrgId is a string if it's an ObjectId (to prevent React BSON crashes if logged)
        if (effectiveOrgId) {
            effectiveOrgId = effectiveOrgId.toString();
        } else {
            console.log('[NotificationService] Bulk Dispatch: Proceeding with null organization_id (e.g. System/SuperAdmin target).');
            effectiveOrgId = null;
        }

        const notifications = recipientIds.map(rid => ({
            organization_id: effectiveOrgId,
            recipient: rid,
            type,
            title,
            message,
            link,
            relatedId
        }));

        // Insert into MongoDB
        await Notification.insertMany(notifications);

        if (sendPush) {
            // Fetch all FCM tokens in one batch
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('fcm_token, user_id')
                .in('user_id', recipientIds);

            if (tokens && tokens.length > 0) {
                const fcmTokens = tokens.map(t => t.fcm_token);
                await sendPushToMultiple(fcmTokens, title, message, { link, type, relatedId });
            }

            // Web Push for Browsers
            const webPushPromises = recipientIds.map(rid => 
                sendPushNotification(rid, { title, body: message, url: link }).catch(e => console.error("WebPush Bulk Dispatch Error:", e))
            );
            await Promise.allSettled(webPushPromises);
        }
    } catch (err) {
        console.error('[NotificationService] Bulk Dispatch Error:', err.message);
    }
}
