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
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_CHAT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FAKE_EMAILS = [
  "jrc_hod@classgrid.in",
  "jrc_library@classgrid.in",
  "coaching_hod@classgrid.in",
  "coaching_library@classgrid.in",
  "coaching_fee@classgrid.in",
  "coaching_admission@classgrid.in",
  "coaching_faculty@classgrid.in",
  "coaching_student@classgrid.in",
  "coaching_admin@classgrid.in",
  "school_principal@classgrid.in",
  "school_hod@classgrid.in",
  "school_exam@classgrid.in",
  "school_library@classgrid.in",
  "school_fee@classgrid.in",
  "school_admission@classgrid.in",
  "school_faculty@classgrid.in",
  "school_student@classgrid.in",
  "school_admin@classgrid.in",
  "eng_principal@classgrid.in",
  "eng_hod@classgrid.in",
  "eng_exam@classgrid.in",
  "eng_library@classgrid.in",
  "eng_fee@classgrid.in",
  "eng_admission@classgrid.in",
  "eng_faculty@classgrid.in",
  "eng_student@classgrid.in",
  "eng_admin@classgrid.in",
  "mansondaughter7@gmail.com",
  "taken@example.com"
];

async function run() {
  console.log(`Deleting ${FAKE_EMAILS.length} fake emails...`);
  
  const { data, error } = await supabase
    .from("blog_subscribers")
    .delete()
    .in("email", FAKE_EMAILS);
    
  if (error) {
    console.error("Error deleting:", error);
  } else {
    console.log("Successfully deleted fake emails!");
  }
}

run();
