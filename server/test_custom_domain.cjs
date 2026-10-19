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
const mongoose = require('mongoose');

async function run() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/classgrid_local_v2');
        
        // Dynamically import the ES module service
        const { notifyExternalDomainChange } = await import('./src/services/domain-change-email.service.js');
        
        // Let's use exactly the details the user provided in their previous snippet, 
        // as they said "fetc exact now added domain deatisl", meaning the one they just added
        // via the UI (which triggered the initial email).
        
        // But to be safe, let's fetch from the DB if it exists.
        const Organization = (require('./src/models/Organization.js')).default || require('./src/models/Organization.js');
        const User = (require('./src/models/User.js')).default || require('./src/models/User.js');
        
        // Look for the org that has an erp_domain configured
        const orgs = await Organization.find();
        let targetOrg = null;
        for (const org of orgs) {
            if (org.settings && org.settings.erp_domain && org.settings.erp_domain.domain_name) {
                targetOrg = org;
                break;
            }
        }
        
        if (!targetOrg) {
            console.log("No organization found with an erp_domain. Using fallback QuantumChem details.");
            targetOrg = {
                name: "QuantumChem",
                settings: {
                    erp_domain: {
                        domain_name: "erp.quantumchem.site",
                        is_enabled: true,
                        allow_classgrid_url: false
                    }
                }
            };
        }
        
        // Get the owner
        const owner = await User.findOne({ organization_id: targetOrg._id, role: 'org_admin' });
        
        const orgName = targetOrg.name;
        const adminName = owner ? owner.full_name : "Neha Sharma";
        const adminEmail = owner ? owner.email : "nehasharmaking25@gmail.com";
        const domain = targetOrg.settings.erp_domain.domain_name;
        
        const actions = ["registered", "changed", "verified", "settings_updated", "removed"];
        
        for (const action of actions) {
            console.log(`\nSending email for Action: ${action} | Org: ${orgName}, Domain: ${domain}`);

            const result = await notifyExternalDomainChange({
                to: "nikhil.shinde@classgird.in", 
                orgName: orgName,
                adminName: adminName,
                adminEmail: adminEmail,
                action: action,
                domainType: "erp_domain",
                oldDomain: domain,
                newDomain: action === "removed" ? null : domain,
                oldSettings: { is_enabled: false, allow_classgrid_url: true },
                newSettings: { 
                    is_enabled: targetOrg.settings.erp_domain.is_enabled, 
                    allow_classgrid_url: targetOrg.settings.erp_domain.allow_classgrid_url 
                },
                organizationId: targetOrg._id || new mongoose.Types.ObjectId(),
                userId: owner ? owner._id : new mongoose.Types.ObjectId(),
                brandingReset: action === "removed" // just to show the removed branding note
            });
            
            console.log("Email Result for", action, ":", result);
        }
    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
