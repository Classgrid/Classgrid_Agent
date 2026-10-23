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

import { sendEmail } from "./aws-ses.service.js";
import { baseTemplate } from "./email-templates.service.js";

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

// ============================================================================
// STANDARD CLASSGRID DOMAIN CHANGES (org.classgrid.in)
// ============================================================================

function buildNotificationHtml({ title, orgName, adminName, summary, details, actionUrl, actionLabel, note, changedAt }) {
    const formattedDate = formatDate(changedAt);
    
    // Build the details block
    const detailsHtml = Object.entries(details)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([label, value]) => `
            <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #111111; width: 40%; vertical-align: top;">${escapeHtml(label)}</td>
                <td style="padding: 8px 0; color: #374151; vertical-align: top;">${escapeHtml(value)}</td>
            </tr>
        `).join("");

    const content = `
        <h2 style="color: #111111; margin-top: 0;">Hello ${escapeHtml(adminName || "Admin")},</h2>
        <p style="font-size: 15px; color: #374151;">${escapeHtml(summary)}</p>
        
        <div class="box" style="margin: 24px 0; padding: 20px; background-color: #f9f9f9; border: 1px solid #eaeaea; border-radius: 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                ${detailsHtml}
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #111111; width: 40%; vertical-align: top;">Changed at</td>
                    <td style="padding: 8px 0; color: #374151; vertical-align: top;">${escapeHtml(formattedDate)}</td>
                </tr>
            </table>
        </div>

        ${note ? `<div class="box" style="margin: 24px 0; padding: 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;"><p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Important:</strong> ${escapeHtml(note)}</p></div>` : ""}

        ${actionUrl ? `<div style="margin: 32px 0;"><a href="${escapeHtml(actionUrl)}" class="btn" style="background-color: #111111; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${escapeHtml(actionLabel || "Open Classgrid")}</a></div>` : ""}

        <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">If you did not authorize this change, contact Classgrid support immediately.</p>
        <p style="font-size: 14px; color: #6b7280;"><a href="https://classgrid.in/support" style="color: #111111; text-decoration: underline;">Open Support Portal</a></p>
    `;

    return baseTemplate({
        title: escapeHtml(title),
        content,
        ignoreText: "This security notification was sent because a domain setting changed on your organization account."
    });
}

function buildNotificationText({ title, orgName, adminName, summary, details, actionUrl, note, changedAt }) {
    const rows = Object.entries({ ...details, "Changed at": formatDate(changedAt) })
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([label, value]) => `${label}: ${value}`);

    return [
        title,
        "",
        `Hello ${adminName || "Admin"},`,
        "",
        summary,
        "",
        `Organization: ${orgName}`,
        ...rows,
        note ? `\nImportant: ${note}` : "",
        actionUrl ? `\nOpen Classgrid: ${actionUrl}` : "",
        "",
        "If you did not authorize this change, contact Classgrid support immediately.",
        `Need assistance? Open Support Portal: ${process.env.SUPPORT_URL || 'https://classgrid.in/support'}`,
        "",
        "Regards,",
        "The Classgrid Team",
    ].filter(Boolean).join("\n");
}

async function queueDomainEmail({ to, subject, template, organizationId, userId }) {
    if (!to) return { queued: false, reason: "missing_admin_email" };

    const job = await sendEmail({
        to,
        subject,
        html: buildNotificationHtml(template),
        text: buildNotificationText(template),
        type: "domain_change",
        channel: "notification",
        userId: userId || null,
        organizationId: organizationId || null,
    });

    return { queued: Boolean(job), jobId: job?._id || null };
}

export async function notifyDomainChange({
    to,
    orgName,
    adminName,
    adminEmail,
    oldDomain,
    newDomain,
    organizationId,
    userId,
}) {
    const oldHost = oldDomain && oldDomain !== "none" ? `${oldDomain}.classgrid.in` : "Not previously assigned";
    const newHost = `${newDomain}.classgrid.in`;
    const actionUrl = `https://${newHost}/org/login`;
    const template = {
        title: "Classgrid organization URL changed",
        orgName,
        adminName,
        summary: "Your Classgrid organization URL has changed. The new URL is active immediately.",
        details: {
            "Old URL": oldHost,
            "New URL": newHost,
            "Administrator": adminEmail,
        },
        actionUrl,
        actionLabel: "Open admin login",
        note: oldDomain && oldDomain !== "none"
            ? `The old URL no longer points to this organization. Update bookmarks and shared links. The old name is not described as permanently reserved and may be available under platform rules.`
            : "Share the new URL only with people who should access this organization.",
        changedAt: new Date(),
    };

    return queueDomainEmail({
        to,
        subject: `Classgrid organization URL changed to ${newHost}`,
        template,
        organizationId,
        userId,
    });
}

// ============================================================================
// CUSTOM DOMAIN CHANGES (erp.custom.com)
// ============================================================================

// The copy is now built dynamically inside notifyExternalDomainChange based on domainType

export function buildCustomDomainHtml(data) {
    const formattedDate = formatDate(data.changedAt);

    // Build the details block
    const detailsHtml = Object.entries(data.details)
        .filter(([, val]) => val !== undefined && val !== null && val !== "")
        .map(([label, val]) => `
            <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #111111; width: 35%; vertical-align: top; word-break: break-word;">${escapeHtml(label)}</td>
                <td style="padding: 8px 0; color: #374151; vertical-align: top; word-break: break-word;">${val}</td>
            </tr>
        `).join("");

    const content = `
        <h2 style="color: #111111; margin-top: 0;">Hello ${escapeHtml(data.adminName || "Admin")},</h2>
        <p style="font-size: 15px; color: #374151;">${data.copy.summary}</p>
        
        ${data.copy.extraSummary ? `<p style="font-size: 15px; color: #374151;">${escapeHtml(data.copy.extraSummary)}</p>` : ''}
        
        <h3 style="color: #111111; margin-top: 32px; font-size: 16px;">Custom Domain Details</h3>
        <div class="box" style="margin: 16px 0 24px; padding: 20px; background-color: #f9f9f9; border: 1px solid #eaeaea; border-radius: 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                ${detailsHtml}
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #111111; width: 40%; vertical-align: top;">${escapeHtml(data.copy.dateLabel || 'Changed at')}</td>
                    <td style="padding: 8px 0; color: #374151; vertical-align: top;">${escapeHtml(formattedDate)}</td>
                </tr>
            </table>
        </div>

        ${data.copy.showURL && data.newDomain ? `
        <div class="box" style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #111111;">What changed?</p>
            <p style="margin: 0 0 12px; color: #374151; font-size: 14px;">Your organization will now use the following URL to access Classgrid:</p>
            <p style="margin: 0; font-size: 16px; font-weight: bold;"><a href="https://${escapeHtml(data.newDomain)}" style="color: #16a34a; text-decoration: none;">https://${escapeHtml(data.newDomain)}</a></p>
        </div>
        ` : ''}

        ${data.copy.checklist && data.copy.checklist.length > 0 ? `
        <h3 style="color: #111111; margin-top: 32px; font-size: 16px;">Verification completed</h3>
        <ul style="margin: 16px 0 24px 20px; padding: 0; color: #374151; font-size: 14px;">
          ${data.copy.checklist.map(item => `<li style="margin-bottom: 8px; font-weight: 500;">${item}</li>`).join('')}
        </ul>
        ` : ''}

        ${data.copy.note ? `<div class="box" style="margin: 24px 0; padding: 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;"><p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Important:</strong> ${escapeHtml(data.copy.note)}</p></div>` : ""}

        <div style="margin: 32px 0;">
            ${data.copy.actionUrl2 ? `
            <a href="${escapeHtml(data.copy.actionUrl2)}" class="btn" style="background-color: #111111; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 12px;">${escapeHtml(data.copy.actionBtn2)}</a>
            ` : ''}
            <a href="${escapeHtml(data.actionUrl)}" class="btn" style="background-color: ${data.copy.actionUrl2 ? '#ffffff' : '#111111'}; color: ${data.copy.actionUrl2 ? '#111111' : '#ffffff'} !important; border: ${data.copy.actionUrl2 ? '1px solid #111111' : 'none'}; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${escapeHtml(data.copy.actionBtn)}</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">If you did not authorize this action, contact Classgrid Support immediately.</p>
        <p style="font-size: 14px; color: #6b7280;"><a href="https://classgrid.in/support" style="color: #111111; text-decoration: underline;">Open Support Portal</a></p>
    `;

    return baseTemplate({
        title: escapeHtml(data.copy.title),
        content,
        ignoreText: "This security notification was sent because a custom domain setting changed on your organization account."
    });
}

export function buildCustomDomainText(data) {
    const formattedDate = formatDate(data.changedAt);
    return [
        data.copy.title,
        "",
        `Hello ${data.adminName || "Admin"},`,
        "",
        data.copy.summary.replace(/<[^>]+>/g, ''),
        data.copy.extraSummary || "",
        "",
        "Organization: " + data.orgName,
        ...Object.entries(data.details)
            .filter(([, val]) => val !== undefined && val !== null && val !== "")
            .map(([label, val]) => `${label}: ${String(val).replace(/<[^>]*>?/gm, '')}`),
        `${data.copy.dateLabel || 'Changed at'}: ${formattedDate}`,
        "",
        data.copy.showURL && data.newDomain ? [
            "What changed?",
            "Your organization will now use the following URL to access Classgrid:",
            `https://${data.newDomain}`,
            ""
        ].join("\n") : "",
        data.copy.checklist && data.copy.checklist.length > 0 ? [
            "Verification completed",
            ...data.copy.checklist.map(item => `- ${item}`),
            ""
        ].join("\n") : "",
        data.copy.note ? `Important: ${data.copy.note}\n` : "",
        data.copy.actionUrl2 ? `${data.copy.actionBtn2}: ${data.copy.actionUrl2}` : "",
        `${data.copy.actionBtn}: ${data.actionUrl}`,
        "",
        "If you did not authorize this action, contact Classgrid Support immediately.",
        `Need assistance? Open Support Portal: https://classgrid.in/support`,
    ].filter(Boolean).join("\n");
}

export async function notifyExternalDomainChange({
    action,
    to,
    orgName,
    adminName,
    adminEmail,
    domainType,
    oldDomain,
    newDomain,
    newSettings,
    organizationId,
    userId,
    subdomain,
}) {
    const typeLabel = domainType === "erp_domain" ? "ERP login domain" : "Public website domain";
    const activeDomain = newDomain || oldDomain;
    const defaultUrl = subdomain ? `https://${subdomain}.classgrid.in` : "https://classgrid.in";
    let actionUrl = newDomain ? `https://${newDomain}${domainType === "erp_domain" ? "/org/login" : ""}` : defaultUrl;
    let copy = {};

    switch (action) {
        case "registered":
            copy = {
                title: "Action required: Configure DNS for " + activeDomain,
                summary: `A new custom domain has been registered for your organization.`,
                actionBtn: `Configure DNS Records`,
                dateLabel: "Registered at",
                note: "You must configure the required DNS records for the new domain before it can be activated.",
                checklist: [],
                showURL: false
            };
            break;
        case "changed":
            copy = {
                title: `Custom domain changed to ${newDomain}`,
                summary: `Your organization's custom domain has been changed.`,
                actionBtn: `Configure DNS Records`,
                dateLabel: "Changed at",
                note: "You must configure the required DNS records for the new domain before it can be activated.",
                checklist: [],
                showURL: false
            };
            break;
        case "verified":
            copy = {
                title: `Custom domain verified and active: ${newDomain}`,
                summary: `Your custom domain has been successfully verified and is now active.`,
                extraSummary: `Classgrid confirmed ownership of the domain, validated the required DNS records, provisioned a secure HTTPS certificate, and enabled the domain for your organization.`,
                actionBtn: `Manage Domain`,
                actionBtn2: `Open ERP Portal`,
                actionUrl2: `https://${newDomain}`,
                dateLabel: "Verified at",
                checklist: [],
                showURL: false // Replaced with actionUrl2 buttons for cleaner layout
            };
            break;
        case "settings_updated":
            const isDisabled = newSettings && newSettings.is_enabled === false;
            copy = {
                title: isDisabled ? `Custom domain disabled: ${activeDomain}` : `Custom domain access changed: ${activeDomain}`,
                summary: `The access settings for your custom domain have been updated.`,
                extraSummary: isDisabled ? `Users can no longer access Classgrid through this custom domain. Your default Classgrid organisation URL remains available.` : "",
                actionBtn: `Manage Domain`,
                dateLabel: "Updated at",
                checklist: [],
                showURL: false
            };
            break;
        case "removed":
            actionUrl = defaultUrl;
            copy = {
                title: `Domain removed: ${activeDomain}`,
                summary: `The domain <strong>${activeDomain}</strong> has been removed from your organization.`,
                extraSummary: `This domain will no longer provide access to your Classgrid organisation. Your organization will now use the URL ${defaultUrl} for access.`,
                actionBtn: `Open Default Portal`,
                dateLabel: "Removed at",
                checklist: [],
                showURL: true
            };
            newDomain = subdomain ? `${subdomain}.classgrid.in` : "classgrid.in"; // Trick the template into showing the new default URL
            break;
        default:
            copy = {
                title: `Custom domain updated: ${activeDomain}`,
                summary: `Settings for your organization's custom domain were updated.`,
                actionBtn: "Manage Domain",
                dateLabel: "Updated at",
                checklist: [],
                showURL: false
            };
    }

    const cleanDefaultUrl = defaultUrl.replace(/^https?:\/\//, '');

    const settingsSummary = (settings) => {
        if (!settings) return undefined;
        if (settings.is_enabled) {
            if (settings.allow_classgrid_url) {
                return `<code>${escapeHtml(activeDomain)}</code> AND <code>${cleanDefaultUrl}</code>`;
            } else {
                return `<code>${escapeHtml(activeDomain)}</code> ONLY (<code>${cleanDefaultUrl}</code> disabled)`;
            }
        } else {
            return `<code>${cleanDefaultUrl}</code> ONLY (<code>${escapeHtml(activeDomain)}</code> disabled)`;
        }
    };

    const details = {
        "Domain Type": typeLabel,
    };

    if (action === "changed" && oldDomain && oldDomain !== newDomain) {
        details["Previous Domain"] = `<code>${escapeHtml(oldDomain)}</code>`;
        details["New Domain"] = `<code>${escapeHtml(newDomain)}</code>`;
    } else {
        details["Domain"] = `<code>${escapeHtml(activeDomain)}</code>`;
    }

    if (action === "removed") {
        details["Access Status"] = `<code>${cleanDefaultUrl}</code> ONLY`;
    } else if (newSettings) {
        details["Access Status"] = settingsSummary(newSettings);
    }
    
    details["Administrator"] = `<a href="mailto:${escapeHtml(adminEmail)}" style="color:#007bff;text-decoration:none;">${escapeHtml(adminEmail)}</a>`;

    const data = {
        action,
        copy,
        orgName,
        adminName,
        newDomain,
        oldDomain,
        actionUrl,
        changedAt: new Date(),
        details
    };

    // Add specific statuses based on action type
    if (action === 'verified') {
        data.details["Verification Status"] = "✅ Verified";
        data.details["SSL/TLS Status"] = "✅ Active";
        data.details["DNS Status"] = "Ownership & routing records validated";
    } else if (action === 'registered' || action === 'changed') {
        data.details["Verification Status"] = "⏳ Pending Verification (Action Required)";
        data.details["SSL/TLS Status"] = "⏳ Pending DNS Validation";
    }

    if (!to) return { queued: false, reason: "missing_admin_email" };

    const subject = copy.title;
    await sendEmail({
        to,
        subject,
        html: buildCustomDomainHtml(data),
        text: buildCustomDomainText(data),
        type: "domain_change",
        channel: "notification",
        userId: userId || null,
        organizationId: organizationId || null,
    });

    return { queued: true };
}
