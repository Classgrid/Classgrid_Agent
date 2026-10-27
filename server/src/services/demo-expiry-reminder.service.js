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

import OrgSubscription from "../models/OrgSubscription.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import { enqueueEmail } from "./email-queue.service.js";
import {
    getPlanExpiryReminderHtml,
    getPlanExpiryReminderPlainText,
} from "./email-templates.service.js";

export async function processDemoExpiryReminders(now = new Date()) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subscriptions = await OrgSubscription.find({
        plan: "demo",
        status: { $in: ["active", "grace_period"] },
        expiresAt: { $gte: sevenDaysAgo, $lte: sevenDaysFromNow },
    }).lean();

    const reminderConfigs = {
        7: { key: "demo_review_reminder_sent_at", label: "review" },
        3: { key: "demo_ending_soon_sent_at", label: "ending_soon" },
        1: { key: "demo_final_reminder_sent_at", label: "final" },
        expired: { key: "demo_payment_required_sent_at", label: "payment_required" },
    };

    const results = {
        checked: subscriptions.length,
        queued: 0,
        skipped: 0,
        errors: [],
    };

    for (const subscription of subscriptions) {
        try {
            const expiryDate = new Date(subscription.expiresAt);
            const msRemaining = expiryDate.getTime() - now.getTime();
            const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
            const reminder = daysRemaining <= 0
                ? reminderConfigs.expired
                : reminderConfigs[daysRemaining];

            if (!reminder) {
                results.skipped++;
                continue;
            }

            if (subscription?.metadata?.[reminder.key]) {
                results.skipped++;
                continue;
            }

            const organization = await Organization.findById(subscription.organization_id)
                .select("name ownerName ownerEmail is_active")
                .lean();

            if (!organization || organization.is_active === false) {
                results.skipped++;
                continue;
            }

            let ownerEmail = organization.ownerEmail || "";
            let ownerName = organization.ownerName || "Admin";

            if (!ownerEmail) {
                const orgAdmin = await User.findOne({
                    organization_id: subscription.organization_id,
                    role: "org_admin",
                    status: "active",
                })
                    .select("name email")
                    .lean();

                ownerEmail = orgAdmin?.email || "";
                ownerName = orgAdmin?.name || ownerName;
            }

            if (!ownerEmail) {
                results.errors.push(`Org \"${organization.name}\" has no owner/admin email.`);
                continue;
            }

            const planName = String(subscription.plan || "demo").toLowerCase();
            const html = getPlanExpiryReminderHtml(
                organization.name,
                ownerName,
                planName,
                expiryDate,
                daysRemaining
            );
            const text = getPlanExpiryReminderPlainText(
                organization.name,
                ownerName,
                planName,
                expiryDate,
                daysRemaining
            );

            const subject = daysRemaining <= 0
                ? `Your Classgrid demo has ended - ${organization.name}`
                : daysRemaining === 1
                    ? `Final reminder: your Classgrid demo ends tomorrow - ${organization.name}`
                    : daysRemaining === 3
                        ? `Your Classgrid demo is ending soon - ${organization.name}`
                        : `Review your Classgrid demo progress - ${organization.name}`;

            const adminEmailJob = await enqueueEmail({
                to: ownerEmail,
                subject,
                html,
                text,
                type: "demo_expiry_reminder",
                channel: "billing",
                organizationId: subscription.organization_id,
            });

            if (!adminEmailJob) {
                throw new Error("Failed to queue reminder email.");
            }

            const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "support@classgrid.in";
            await enqueueEmail({
                to: superAdminEmail,
                subject: `Demo reminder queued: ${organization.name} - ${reminder.label}`,
                channel: "billing",
                html: `<h2>Demo Reminder Queued</h2>
                    <table style="border-collapse:collapse;width:100%;max-width:500px;">
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Organization</td><td style="padding:8px;border:1px solid #ddd;">${organization.name}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Subscription</td><td style="padding:8px;border:1px solid #ddd;">${planName}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Demo Ends</td><td style="padding:8px;border:1px solid #ddd;">${expiryDate.toLocaleDateString("en-IN")}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Reminder Type</td><td style="padding:8px;border:1px solid #ddd;">${reminder.label}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Admin Email</td><td style="padding:8px;border:1px solid #ddd;">${ownerEmail}</td></tr>
                    </table>
                    <p style="color:#666;margin-top:16px;">Org admin reminder has been queued successfully.</p>`,
                text: `Demo reminder queued for ${organization.name} (${planName}) - ${reminder.label}. Admin: ${ownerEmail}.`,
                type: "demo_expiry_reminder_internal",
                organizationId: subscription.organization_id,
            });

            await OrgSubscription.updateOne(
                { _id: subscription._id },
                { $set: { [`metadata.${reminder.key}`]: new Date() } }
            );

            results.queued++;
        } catch (error) {
            results.errors.push(error.message || "Unknown demo reminder error");
            console.error("[DemoReminder] Error:", error.message);
        }
    }

    return results;
}

export default { processDemoExpiryReminders };
