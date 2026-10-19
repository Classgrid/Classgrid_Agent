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
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const { notifyExternalDomainChange, notifyDomainChange } = await import("./src/services/domain-change-email.service.js");

        console.log("Sending Custom Domain Email (Verified) directly to AWS SES...");
        await notifyExternalDomainChange({
            action: 'verified',
            domainType: 'erp_domain',
            orgName: 'QuantumChem',
            adminName: 'Neha Sharma',
            adminEmail: 'nikhilsubsun321@gmail.com',
            newDomain: 'google.com',
            oldDomain: 'google.com',
            newSettings: { is_enabled: true, allow_classgrid_url: false },
            oldSettings: { is_enabled: false, allow_classgrid_url: true }
        });

        console.log("Successfully sent via Direct AWS SES!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
