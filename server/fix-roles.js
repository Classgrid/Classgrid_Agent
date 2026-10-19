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
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    additional_roles: [String]
});

const User = mongoose.model("User", userSchema);

const roleMapping = {
    "_student@": "student",
    "_faculty@": "faculty",
    "_admission@": "admission_head",
    "_fee@": "fee_manager",
    "_library@": "library_manager",
    "_exam@": "exam_controller",
    "_hod@": "hod",
    "_principal@": "principal"
};

async function fixRoles() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB.");

        const users = await User.find({ role: "super_admin" });
        console.log(`Found ${users.length} super_admins to check.`);
        
        let fixedCount = 0;

        for (const user of users) {
            // Skip the true super admin
            if (user.email === "nikhil.shinde@classgrid.in") continue;

            let newRole = null;
            
            for (const [key, role] of Object.entries(roleMapping)) {
                if (user.email.includes(key)) {
                    newRole = role;
                    break;
                }
            }

            if (newRole) {
                user.role = newRole;
                // Also update additional_roles to make sure it's consistent
                user.additional_roles = [newRole];
                await user.save();
                console.log(`✅ Fixed ${user.email} -> ${newRole}`);
                fixedCount++;
            } else {
                console.log(`⚠️ Unsure what role to give ${user.email}, leaving as super_admin.`);
            }
        }

        console.log(`Done! Fixed ${fixedCount} users.`);
        mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
        mongoose.disconnect();
    }
}

fixRoles();
