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
import fs from 'fs';
import { buildCustomDomainText } from './src/services/domain-change-email.service.js';

const emailAddress = 'nikhilsubsun321@gmail.com';

function generateData(action) {
    const orgName = 'Classgrid University';
    const adminName = 'Nikhil';
    const adminEmail = emailAddress;
    const domainType = 'erp_domain';
    const oldDomain = 'erp.classgrid.edu';
    const newDomain = action === 'removed' ? null : 'erp.classgrid.edu';
    const newSettings = action === 'removed' ? { is_enabled: true, allow_classgrid_url: true } : { is_enabled: true, allow_classgrid_url: false };
    const subdomain = 'classgrid-university';
    
    const typeLabel = domainType === "erp_domain" ? "ERP login domain" : "Public website domain";
    const activeDomain = newDomain || oldDomain;
    const defaultUrl = subdomain ? `https://${subdomain}.classgrid.in` : "https://classgrid.in";
    let actionUrl = newDomain ? `https://${newDomain}${domainType === "erp_domain" ? "/org/login" : ""}` : defaultUrl;
    let copy = {};

    switch (action) {
        case "registered":
            copy = {
                title: "DNS verification required",
                summary: `Your organization's <strong>${typeLabel}</strong> (<code>${activeDomain}</code>) has been registered and now requires DNS verification.`,
                actionBtn: "Review ERP login domain",
                dateLabel: "Verified At",
                checklist: [],
                showURL: false
            };
            break;
        case "changed":
            copy = {
                title: "Domain change verification required",
                summary: `Your organization's <strong>${typeLabel}</strong> has been changed from <code>${oldDomain}</code> to <code>${newDomain}</code> and requires DNS verification.`,
                actionBtn: "Review ERP login domain",
                dateLabel: "Changed at",
                checklist: [],
                showURL: false
            };
            break;
        case "verified":
            copy = {
                title: "Custom domain verified",
                summary: `Your organization's <strong>${typeLabel}</strong> (<code>${activeDomain}</code>) has been successfully verified and is now active.`,
                extraSummary: `Classgrid confirmed ownership of the domain, validated the required DNS records, provisioned a secure HTTPS certificate, and enabled the domain for your organization.`,
                actionBtn: `Manage Domain`,
                actionBtn2: `Open ERP Portal`,
                actionUrl2: `https://${newDomain}`,
                dateLabel: "Verified at",
                checklist: [],
                showURL: false
            };
            break;
        case "settings_updated":
            copy = {
                title: `Custom domain access changed: ${activeDomain}`,
                summary: `The access settings for your custom domain have been updated.`,
                extraSummary: "",
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
            break;
    }

    const cleanDefaultUrl = defaultUrl.replace(/^https?:\/\//, '');

    const details = {
        "Domain Type": typeLabel,
    };
    if (action === "changed") {
        details["Previous Domain"] = `<code>${oldDomain}</code>`;
        details["New Domain"] = `<code>${newDomain}</code>`;
    } else {
        details["Domain"] = `<code>${activeDomain}</code>`;
    }
    
    if (action === "removed") {
        details["Access Status"] = `<code>${cleanDefaultUrl}</code> ONLY`;
    } else {
        details["Access Status"] = `<code>${activeDomain}</code> ONLY (<code>${cleanDefaultUrl}</code> disabled)`;
    }
    
    details["Administrator"] = adminEmail;
    
    return {
        action, copy, orgName, adminName, newDomain: action === 'removed' ? `${subdomain}.classgrid.in` : newDomain, oldDomain, actionUrl, changedAt: new Date(), details
    };
}

const actions = ['registered', 'changed', 'verified', 'settings_updated', 'removed'];

let markdown = '# Plain Text Email Previews\\n\\n';
for (const action of actions) {
    const data = generateData(action);
    const text = buildCustomDomainText(data);
    markdown += `## ${action.toUpperCase()} Email\\n\\n`;
    markdown += `\`\`\`text\\n${text}\\n\`\`\`\\n\\n---\\n\\n`;
}

console.log(markdown);
