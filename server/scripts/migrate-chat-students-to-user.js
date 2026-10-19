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
 * One-time migration (AI_MASTER_FIX_PLAN Phase 5.2):
 * chat.classgrid.in accounts (org 6ac4b95e0f8a97f45e98b0ff) created as "student" become "user".
 * @classgrid.in emails are left alone.
 *
 * Usage (run only after Nikhil approves, from server/):
 *   node scripts/migrate-chat-students-to-user.js           -> dry run, only counts (default)
 *   node scripts/migrate-chat-students-to-user.js --apply   -> runs the updateMany
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const CHAT_ORG_ID = "6ac4b95e0f8a97f45e98b0ff";
const APPLY = process.argv.includes("--apply");

const filter = {
  // Match both ObjectId and legacy string values
  organization_id: { $in: [new mongoose.Types.ObjectId(CHAT_ORG_ID), CHAT_ORG_ID] },
  role: "student",
  email: { $not: /@classgrid\.in$/i },
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = mongoose.connection.collection("users");

    const count = await users.countDocuments(filter);
    console.log(`Matching chat accounts with role "student": ${count}`);

    if (!APPLY) {
      console.log("Dry run only. Re-run with --apply to update them to role \"user\".");
      return;
    }

    const result = await users.updateMany(filter, { $set: { role: "user" } });
    console.log(`Updated ${result.modifiedCount} of ${result.matchedCount} matched accounts to role "user".`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
