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
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;
const SUPABASE_URL = process.env.SUPABASE_CHAT_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function runTest() {
  try {
    console.log("\n📡 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    // Import User model (this loads the post-save hook)
    const { default: User } = await import("../src/models/User.js");

    const TEST_EMAIL = "gemini@classgrid.in";

    // Cleanup: remove if already exists from a previous test run
    await User.deleteOne({ email: TEST_EMAIL });
    await supabaseAdmin.from("blog_subscribers").delete().eq("email", TEST_EMAIL);
    console.log(`🧹 Cleaned up any existing test data for ${TEST_EMAIL}`);

    // Step 1: Create user in MongoDB via User model → triggers post('save') hook
    console.log(`\n🔨 Creating demo user in MongoDB: ${TEST_EMAIL}`);
    const demoUser = await User.create({
      name: "Gemini AI",
      email: TEST_EMAIL,
      password: "hashedpassword_not_real",
      role: "student",
      isEmailVerified: true,
      isSandbox: true,
    });
    console.log(`✅ MongoDB user created! ID: ${demoUser._id}`);
    console.log(`⏳ post('save') hook fired — waiting 2 seconds for Supabase sync...`);

    // Step 2: Wait briefly for the async sync to complete
    await new Promise(res => setTimeout(res, 2000));

    // Step 3: Check Supabase
    console.log(`\n🔍 Checking Supabase blog_subscribers for ${TEST_EMAIL}...`);
    const { data, error } = await supabaseAdmin
      .from("blog_subscribers")
      .select("*")
      .eq("email", TEST_EMAIL)
      .single();

    if (error || !data) {
      console.error("❌ NOT FOUND in Supabase! Auto-sync failed.", error?.message);
    } else {
      console.log("🎉 AUTO-SYNC WORKS! User found in Supabase:");
      console.log(`   Email     : ${data.email}`);
      console.log(`   Name      : ${data.name}`);
      console.log(`   is_active : ${data.is_active}`);
      console.log(`   Created   : ${data.created_at}`);
    }

    console.log(`\n✅ Done! gemini@classgrid.in is now live in Supabase.`);
    console.log(`👉 Go check it at: https://supabase.com/dashboard/project/bumxgscngzjadyozdpce/editor`);
    console.log(`   Table: blog_subscribers | Filter: email = gemini@classgrid.in`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runTest();
