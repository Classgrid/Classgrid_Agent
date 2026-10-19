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
import path from 'path';
import { buildCustomDomainText, buildCustomDomainHtml } from "./src/services/domain-change-email.service.js";

const emailAddress = "nikhilsubsun321@gmail.com";
const adminName = "Neha Sharma";
const orgName = "QuantumChem";
const artifactDir = "C:\\Users\\nikhi\\.gemini\\antigravity-ide\\brain\\d97f2eee-4d2b-4d00-93a2-d6b0dac150af\\artifacts";

const scenarios = [
    {
        action: 'registered',
        copy: { title: "Domain Registered", actionBtn: "Open Settings" },
        orgName, adminName, adminEmail: emailAddress,
        domainType: 'erp_domain',
        newDomain: 'erp.quantumchem.site', oldDomain: null,
        details: {
            "Verification Status": "⏳ Pending Verification (Action Required)",
            "SSL/TLS Status": "⏳ Pending DNS Validation"
        }
    },
    {
        action: 'changed',
        copy: { title: "Domain Changed", actionBtn: "Open Settings" },
        orgName, adminName, adminEmail: emailAddress,
        domainType: 'erp_domain',
        newDomain: 'erp.quantumchem.site', oldDomain: 'old.quantumchem.site',
        details: {
            "Verification Status": "⏳ Pending Verification (Action Required)",
            "SSL/TLS Status": "⏳ Pending DNS Validation"
        }
    },
    {
        action: 'verified',
        copy: { title: "Domain Verified", actionBtn: "Open Settings" },
        orgName, adminName, adminEmail: emailAddress,
        domainType: 'erp_domain',
        newDomain: 'erp.quantumchem.site', oldDomain: 'erp.quantumchem.site',
        details: {
            "Verification Status": "✅ Verified",
            "SSL/TLS Status": "✅ Active",
            "DNS Status": "Ownership & routing records validated"
        }
    },
    {
        action: 'settings_updated',
        copy: { title: "Domain Settings Updated", actionBtn: "Open Settings" },
        orgName, adminName, adminEmail: emailAddress,
        domainType: 'erp_domain',
        newDomain: 'erp.quantumchem.site', oldDomain: 'erp.quantumchem.site',
        newSettings: { is_enabled: false }, oldSettings: { is_enabled: true },
        details: {}
    },
    {
        action: 'removed',
        copy: { title: "Domain Removed", actionBtn: "Open Settings" },
        orgName, adminName, adminEmail: emailAddress,
        domainType: 'erp_domain',
        oldDomain: 'erp.quantumchem.site', newDomain: null,
        details: {}
    }
];

if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
}

scenarios.forEach((data, index) => {
    // Fill in the rest of the fields that notifyExternalDomainChange normally builds
    const activeDomain = data.newDomain || data.oldDomain;
    data.changedAt = new Date();
    data.details = {
        "Organization": data.orgName,
        "Domain Type": "ERP Login Domain",
        "Domain": data.action === "changed" && data.oldDomain !== data.newDomain
            ? `${data.newDomain} (was ${data.oldDomain})`
            : activeDomain,
        ...data.details
    };
    
    // add actionUrl and note based on action
    if (data.action === 'registered') {
        data.copy.summary = `A new custom domain has been registered for your organization. You must configure your DNS settings before it can be activated.`;
        data.actionUrl = "https://erp.quantumchem.site/admin/settings/domain";
        data.note = "Please log in to your admin dashboard to view the required DNS records.";
    } else if (data.action === 'changed') {
        data.copy.summary = `Your organization's custom domain has been changed.`;
        data.actionUrl = "https://erp.quantumchem.site/admin/settings/domain";
        data.note = "You will need to update your DNS records to point to the new domain.";
    } else if (data.action === 'verified') {
        data.copy.summary = `Your custom domain has been successfully verified and is now active.`;
        data.actionUrl = "https://erp.quantumchem.site/admin/settings/domain";
        data.copy.showURL = true;
    } else if (data.action === 'settings_updated') {
        data.copy.summary = `The access settings for your custom domain have been updated.`;
        data.details["Access Status"] = "Disabled";
        data.actionUrl = "https://erp.quantumchem.site/admin/settings/domain";
    } else if (data.action === 'removed') {
        data.copy.summary = `A custom domain has been removed from your organization.`;
        data.actionUrl = "https://erp.quantumchem.site/admin/settings/domain";
    }

    data.copy.checklist = [];
    const html = buildCustomDomainHtml(data);
    const fileName = `email_html_preview_${data.action}.html`;
    fs.writeFileSync(path.join(artifactDir, fileName), html);
});

console.log("HTML previews generated!");
