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
import OrgSubscription from "../src/models/OrgSubscription.js";

dotenv.config({ path: "../.env" });

async function makeOrgActive() {
  const orgId = "6a2d452b1c952d43497101c8";
  
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const subscription = await OrgSubscription.findOneAndUpdate(
      { organization_id: orgId },
      {
        $set: {
          plan: "active",
          status: "active",
          isPaid: true,
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
          razorpay_subscription_id: "sub_mock_" + Date.now(),
          razorpay_customer_id: "cust_mock_" + Date.now(),
          "metadata.storage_limit_gb": 500,
          "billing.basePricePerMonth": 2000,
          "billing.pricePerGB": 20,
          "billing.pricePerEmail": 0.5,
          "billing.pricePerSms": 2.5
        }
      },
      { returnDocument: 'after', upsert: true }
    );

    console.log("✅ Successfully converted org from DEMO to ACTIVE Pay-As-You-Go!");
    console.log("New Subscription Details:", JSON.stringify(subscription, null, 2));
    
  } catch (error) {
    console.error("Error updating subscription:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

makeOrgActive();
