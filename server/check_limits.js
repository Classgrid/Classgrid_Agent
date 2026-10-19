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
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";
import Organization from "./src/models/Organization.js";
import GlobalAiConfig from "./src/models/GlobalAiConfig.js";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = "support@classgrid.in"; // Assuming this is the superadmin email
  const user = await User.findOne({ email }).select("ai_tokens organization_id").lean();
  console.log("USER:", JSON.stringify(user, null, 2));

  if (user && user.organization_id) {
      const org = await Organization.findById(user.organization_id).select("ai_config").lean();
      console.log("ORG:", JSON.stringify(org, null, 2));
  }
  
  const global = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
  console.log("GLOBAL:", JSON.stringify(global, null, 2));
  
  mongoose.disconnect();
}
check();
