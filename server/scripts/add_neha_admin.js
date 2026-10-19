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
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

import User from "./src/models/User.js";
import Organization from "./src/models/Organization.js";

async function addAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const email = "nehasharmaking25@gmail.com";
    const password = "Nikhil@5049";

    // 1. Find the nikhil organization
    let org = await Organization.findOne({ name: "nikhil" });
    if (!org) {
      org = await Organization.findOne({ subdomain: "nikhil" });
    }
    if (!org) {
      org = await Organization.findOne({ custom_domain: "nikhil.quantumchem.site" });
    }
    if (!org) {
      console.log("Organization 'nikhil' not found!");
      const allOrgs = await Organization.find();
      console.log("Available orgs:", allOrgs.map(o => ({name: o.name, sub: o.subdomain, dom: o.custom_domain})));
      process.exit(1);
    }
    console.log(`Found org: ${org.name} (${org._id})`);

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Upsert the user
    let user = await User.findOne({ email });
    if (user) {
      user.password = hashedPassword;
      user.role = "org_admin";
      user.organization_id = org._id;
      user.isEmailVerified = true;
      user.mustResetPassword = false;
      await user.save();
      console.log("Existing user updated to org_admin.");
    } else {
      user = await User.create({
        name: "Neha Sharma",
        email,
        password: hashedPassword,
        role: "org_admin",
        organization_id: org._id,
        isEmailVerified: true,
        mustResetPassword: false,
        authProvider: "manual",
        linkedProviders: ["manual"]
      });
      console.log("New user created and set as org_admin.");
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

addAdmin();
