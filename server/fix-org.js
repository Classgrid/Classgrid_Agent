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
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to DB");
    const Organization = (await import('./src/models/Organization.js')).default;
    const User = (await import('./src/models/User.js')).default;
    const AiUsageLog = (await import('./src/models/AiUsageLog.js')).default;

    // Check if Classgrid Platform exists
    let platformOrg = await Organization.findOne({ name: "Classgrid Platform" });
    if (!platformOrg) {
        platformOrg = new Organization({
            name: "Classgrid Platform",
            org_type: "other",
            structure_type: "custom",
            address: "Remote",
            logo_url: "https://d2j0nys7wmt8n5.cloudfront.net/images/logo-icon.png",
            sidebar_name: "Classgrid Platform",
            private_code: "CGPLATFORM",
            is_active: true,
            status: "active"
        });
        await platformOrg.save();
        console.log("Created Classgrid Platform Org:", platformOrg._id);
    } else {
        console.log("Found Classgrid Platform Org:", platformOrg._id);
    }

    // Find all users who are super admins with no org, and assign them
    const result = await User.updateMany(
        { role: "super_admin" },
        { $set: { organization_id: platformOrg._id } }
    );
    console.log(`Updated ${result.modifiedCount} super admins.`);

    // Find all AiUsageLogs with null org, and assign them
    const logResult = await AiUsageLog.updateMany(
        { organization_id: null },
        { $set: { organization_id: platformOrg._id } }
    );
    console.log(`Updated ${logResult.modifiedCount} AiUsageLogs.`);

    process.exit(0);
  })
  .catch(err => {
    console.error("DB Error", err);
    process.exit(1);
  });
