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
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

// Use the CHAT specific env vars
const supabase = createClient(
    process.env.SUPABASE_CHAT_URL,
    process.env.SUPABASE_CHAT_KEY
);

async function checkChat() {
    console.log("=== Checking Chat Table (classroom_messages) in Chat Project ===");
    console.log("Using URL:", process.env.SUPABASE_CHAT_URL);

    // Try to select
    const { data, error } = await supabase
        .from("classroom_messages")
        .select("id")
        .limit(1);

    if (error) {
        console.log("ERROR querying classroom_messages table:", error.message);
        if (error.message.includes("does not exist")) {
            console.log("Status: MISSING");
            console.log("Need to create 'classroom_messages' table in the *Chat* Supabase project.");
        }
    } else {
        console.log("Status: OK - classroom_messages table exists.");
        console.log("Data count:", data.length);
    }
}

checkChat().catch(e => { console.error(e); process.exit(1); });
