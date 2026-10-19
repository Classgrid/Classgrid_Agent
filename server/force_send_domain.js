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
import dotenv from 'dotenv';
dotenv.config();
import { notifyExternalDomainChange } from './src/services/domain-change-email.service.js';

const emailAddress = "nikhilsubsun321@gmail.com";

const basePayload = {
    to: emailAddress,
    orgName: "Classgrid University",
    adminName: "Nikhil",
    adminEmail: emailAddress,
    domainType: "erp_domain",
    oldDomain: "erp.classgrid.edu",
    oldSettings: { is_enabled: false, allow_classgrid_url: true },
    newSettings: { is_enabled: true, allow_classgrid_url: false },
    organizationId: "12345",
    userId: "user_67890",
    subdomain: "classgrid-university",
};

const actions = ["registered", "changed", "verified", "settings_updated", "removed"];

async function runBulkTests() {
    console.log(`Starting to send all ${actions.length} Domain Status emails to ${emailAddress}...`);
    
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        try {
            console.log(`\n[${i+1}/${actions.length}] Sending '${action}' email...`);
            await notifyExternalDomainChange({
                ...basePayload,
                action: action,
            });
            console.log(`✅ Success for action: ${action}`);
            
            // Wait 2 seconds to prevent AWS rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`❌ Error sending '${action}':`, error);
        }
    }
    
    console.log(`\n🎉 Finished sending all domain registry emails!`);
    process.exit(0);
}

runBulkTests();
