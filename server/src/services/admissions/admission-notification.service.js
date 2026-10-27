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
 * CRITICAL RULE: DO NOT ADD <h1> OR ANY LARGE HEADINGS TO EMAIL TEMPLATES.
 * The Classgrid design system requires all emails to rely solely on the Classgrid Logo at the top.
 * Adding huge static or dynamic headings (e.g. <h1>Re: Subject</h1> or <h1>Welcome</h1>) is COMPLETELY BANNED.
 * This applies to all human developers and AI agents.
 */
import { sendEmail } from "../aws-ses.service.js";

/**
 * admission-notification.service.js — Unified Admission Notification Dispatcher
 * 
 * Sends event-driven notifications across all channels:
 *   1. Email (Brevo SMTP)
import { sendSMS } from "../sms.service.js";

// ─── SMS Budget Control ─── 
let smsBudgetUsed = 0;
const SMS_BUDGET_LIMIT = parseInt(process.env.SMS_BUDGET_LIMIT || "5000"); // ₹ limit
const SMS_COST_PER_MSG = 0.09;

/**
 * Send SMS via AWS SNS.
 * @param {string} phone - 10-digit Indian mobile
 * @param {string} message - SMS body (max 160 chars for single part)
 * @returns {Promise<Object>}
 */
async function sendNotificationSMS(phone, message) {
    // Budget guard
    const projectedCost = smsBudgetUsed + SMS_COST_PER_MSG;
    if (projectedCost > SMS_BUDGET_LIMIT) {
        console.warn(`[SMS] Budget limit reached! Used: ₹${smsBudgetUsed}/${SMS_BUDGET_LIMIT}`);
        return { success: false, error: "SMS budget exhausted" };
    }

    try {
        const result = await sendSMS(phone, message);
        if (result.success) {
            smsBudgetUsed += SMS_COST_PER_MSG;
            console.log(`[SMS] Sent to ${phone}. Budget: ₹${smsBudgetUsed.toFixed(2)}/${SMS_BUDGET_LIMIT}`);
        }
        return result;
    } catch (err) {
        console.error("[SMS] Error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send Push Notification via Firebase FCM.
 * @param {Array<string>} fcmTokens 
 * @param {string} title 
 * @param {string} body 
 */
async function sendPush(fcmTokens, title, body) {
    if (!fcmTokens || fcmTokens.length === 0) return { success: false, error: "No FCM tokens" };

    try {
        const admin = (await import("firebase-admin")).default;
        const message = {
            notification: { title, body },
            tokens: fcmTokens
        };
        const result = await admin.messaging().sendEachForMulticast(message);
        console.log(`[FCM] Sent: ${result.successCount}/${fcmTokens.length}`);
        return { success: true, sent: result.successCount, failed: result.failureCount };
    } catch (err) {
        console.error("[FCM] Error:", err.message);
        return { success: false, error: err.message };
    }
}

// ─── NOTIFICATION TEMPLATES ───
const TEMPLATES = {
    APPLICATION_RECEIVED: {
        sms: (name, orgName, extra) => `Hi ${name}, your application to ${orgName} has been received. Track status directly here: ${extra.track_url}`,
        email_subject: (orgName) => `Application Received — ${orgName}`,
        email_body: (name, orgName, extra) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your application to <strong>${orgName}</strong> has been successfully received.</p>
                    <p>Application ID: <code>${extra.appId}</code></p>
                    <div style="margin-top: 24px; text-align: center;">
                        <a href="${extra.track_url}" style="display:inline-block;padding:12px 24px;background-color:#6366f1;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Track Application Status</a>
                    </div>
                </div>
            </div>`,
        push_title: "📝 Application Received",
        push_body: (orgName) => `Your application to ${orgName} has been received.`
    },

    DOCUMENTS_VERIFIED: {
        sms: (name, orgName, extra) => `Hi ${name}, your documents for ${orgName} have been verified. Pay fees here: ${extra.track_url}`,
        email_subject: (orgName) => `Documents Verified — ${orgName}`,
        email_body: (name, orgName, extra) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>All your submitted documents for <strong>${orgName}</strong> have been verified.</p>
                    <p>Please proceed to complete the fee payment to confirm your admission.</p>
                    <div style="margin-top: 24px; text-align: center;">
                        <a href="${extra.track_url}" style="display:inline-block;padding:12px 24px;background-color:#10b981;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Pay Admission Fee</a>
                    </div>
                </div>
            </div>`,
        push_title: "✅ Documents Verified",
        push_body: (orgName) => `Your documents for ${orgName} have been verified. Pay fees to confirm.`
    },

    DOCUMENTS_REJECTED: {
        sms: (name, orgName) => `Hi ${name}, one or more documents for ${orgName} were rejected. Please re-upload.`,
        email_subject: (orgName) => `Document Issue — ${orgName}`,
        email_body: (name, orgName, reason) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>One or more of your documents for <strong>${orgName}</strong> require correction.</p>
                    <p><strong>Reason:</strong> ${reason || "Please contact the admission office."}</p>
                    <p>Please re-upload the corrected document(s) at your earliest convenience.</p>
                </div>
            </div>`,
        push_title: "⚠️ Document Issue",
        push_body: () => `A document was rejected. Please re-upload.`
    },

    MERIT_LIST_PUBLISHED: {
        sms: (name, orgName) => `Hi ${name}, the merit list for ${orgName} has been published. Check your rank on classgrid.in`,
        email_subject: (orgName) => `Merit List Published — ${orgName}`,
        email_body: (name, orgName, rank) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>The merit list for <strong>${orgName}</strong> has been published.</p>
                    ${rank ? `<p>Your Merit Rank: <strong>#${rank}</strong></p>` : ""}
                    <p>Please check the admission portal for further steps.</p>
                </div>
            </div>`,
        push_title: "📊 Merit List Published",
        push_body: (orgName) => `Merit list for ${orgName} is now available.`
    },

    SELECTED: {
        sms: (name, orgName) => `Congratulations ${name}! You have been SELECTED for admission at ${orgName}. Complete fee payment to confirm.`,
        email_subject: (orgName) => `🎉 Admission Offer — ${orgName}`,
        email_body: (name, orgName) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>We are pleased to inform you that you have been <strong>selected</strong> for admission at <strong>${orgName}</strong>.</p>
                    <p>Please complete your fee payment at the earliest to confirm your seat.</p>
                </div>
            </div>`,
        push_title: "🎉 You're Selected!",
        push_body: (orgName) => `You have been selected for admission at ${orgName}!`
    },

    WAITLISTED: {
        sms: (name, orgName, pos) => `Hi ${name}, you are on the waitlist (Position: ${pos}) for ${orgName}. We'll notify you if a seat opens.`,
        email_subject: (orgName) => `Waitlisted — ${orgName}`,
        email_body: (name, orgName, pos) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>You have been placed on the waitlist for <strong>${orgName}</strong>.</p>
                    <p>Waitlist Position: <strong>#${pos || "N/A"}</strong></p>
                    <p>You will be notified automatically if a seat becomes available.</p>
                </div>
            </div>`,
        push_title: "⏳ Waitlisted",
        push_body: (orgName) => `You are on the waitlist for ${orgName}.`
    },

    FEE_PAYMENT_PENDING: {
        sms: (name, orgName) => `Hi ${name}, your fee payment for ${orgName} is pending. Complete payment to confirm admission.`,
        email_subject: (orgName) => `Fee Payment Pending — ${orgName}`,
        email_body: (name, orgName) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your admission fee payment for <strong>${orgName}</strong> is pending.</p>
                    <p>Please complete the payment before the deadline to secure your seat.</p>
                </div>
            </div>`,
        push_title: "💳 Payment Pending",
        push_body: (orgName) => `Complete your fee payment for ${orgName}.`
    },

    ENROLLED: {
        sms: (name, orgName) => `Congratulations ${name}! You are now officially enrolled at ${orgName}. Welcome aboard! 🎓`,
        email_subject: (orgName) => `🎓 Enrollment Confirmed — ${orgName}`,
        email_body: (name, orgName) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your enrollment at <strong>${orgName}</strong> is confirmed!</p>
                    <p>Login credentials have been sent separately. Please check your email.</p>
                </div>
            </div>`,
        push_title: "🎓 Enrolled!",
        push_body: (orgName) => `You are now enrolled at ${orgName}!`
    },

    WITHDRAWN: {
        sms: (name, orgName) => `Hi ${name}, your admission at ${orgName} has been withdrawn. Contact admin for any queries.`,
        email_subject: (orgName) => `Application Withdrawn — ${orgName}`,
        email_body: (name, orgName) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your application at <strong>${orgName}</strong> has been withdrawn.</p>
                    <p>If this was not intended, please contact the admission office immediately.</p>
                </div>
            </div>`,
        push_title: "Application Withdrawn",
        push_body: (orgName) => `Your application at ${orgName} has been withdrawn.`
    },

    APPLICATION_UNDER_REVIEW: {
        sms: (name, orgName) => `Hi ${name}, your application for ${orgName} is under review. We'll update you soon.`,
        email_subject: (orgName) => `Application Under Review — ${orgName}`,
        email_body: (name, orgName) => `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
                <div style="padding:32px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your application for <strong>${orgName}</strong> is currently being reviewed.</p>
                    <p>We will notify you once the verification is complete.</p>
                </div>
            </div>`,
        push_title: "🔍 Under Review",
        push_body: (orgName) => `Your application for ${orgName} is being reviewed.`
    }
};

/**
 * Dispatch notification across all channels for a specific trigger.
 * 
 * @param {string} trigger - e.g., "APPLICATION_RECEIVED", "ENROLLED"
 * @param {Object} context - { application, orgName, fcmTokens, extra }
 * @returns {Promise<Object>} { email, sms, push }
 */
export async function dispatchNotification(trigger, context) {
    const template = TEMPLATES[trigger];
    if (!template) {
        console.warn(`[Notification] No template for trigger: ${trigger}`);
        return { error: `Unknown trigger: ${trigger}` };
    }

    const { application, orgName, fcmTokens, extra } = context;
    const name = application.full_name;
    const results = { email: null, sms: null, push: null };

    // 1. Email
    if (application.email) {
        try {
            const subject = template.email_subject(orgName);
            const html = template.email_body(name, orgName, extra);
            await sendEmail({
                to: application.email,
                subject,
                html,
                text: template.sms(name, orgName, extra)
            });
            results.email = { success: true };
        } catch (err) {
            results.email = { success: false, error: err.message };
        }
    }

    // 2. SMS
    if (application.phone) {
        results.sms = await sendNotificationSMS(application.phone, template.sms(name, orgName, extra));
    }

    // 3. Push
    if (fcmTokens && fcmTokens.length > 0) {
        results.push = await sendPush(
            fcmTokens,
            template.push_title,
            template.push_body(orgName)
        );
    }

    console.log(`[Notification] ${trigger} dispatched for ${name}: Email=${results.email?.success}, SMS=${results.sms?.success}, Push=${results.push?.success}`);
    return results;
}

/**
 * Get current SMS budget usage.
 * @returns {{ used: number, limit: number, remaining: number, messages_sent: number }}
 */
export function getSMSBudgetStatus() {
    return {
        used: smsBudgetUsed,
        limit: SMS_BUDGET_LIMIT,
        remaining: SMS_BUDGET_LIMIT - smsBudgetUsed,
        messages_sent: Math.floor(smsBudgetUsed / SMS_COST_PER_MSG),
        cost_per_msg: SMS_COST_PER_MSG
    };
}

export default {
    dispatchNotification,
    getSMSBudgetStatus,
    TEMPLATES
};
