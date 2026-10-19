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
 * =========================================================================================
 * 🚨 vvvCRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

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
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function start() {
    try {
        const { getChatSb } = await import("./config/supabaseClient.js");
        const sb = getChatSb();

        console.log("Connected to Supabase for Chat Bridge (No MongoDB needed).");
        console.log("Waiting for ANY new messages on the platform to auto-detect your chat...");

        let lastCheckedAt = new Date().toISOString();
        let myMockId = "66f7f0b9f0b9f0b9f0b9f0b9"; // Fallback ID if we can't find one
        let activeTargetId = null;
        let activeOrgId = null;

        setInterval(async () => {
            const { data: msgs, error } = await sb
                .from('org_direct_messages')
                .select('*')
                .gt('created_at', lastCheckedAt)
                .order('created_at', { ascending: true });

            if (!error && msgs && msgs.length > 0) {
                for (const msg of msgs) {
                    console.log(`\n[INCOMING] ${msg.sender_name}: ${msg.message}`);
                    activeTargetId = msg.sender_id; // The person who sent the message (Super Admin)
                    myMockId = msg.receiver_id;     // The person they sent it to (Us)
                    activeOrgId = msg.org_id;
                    lastCheckedAt = msg.created_at;
                }
            }
        }, 2000);

        rl.on("line", async (input) => {
            if (!activeTargetId) {
                console.log("Wait for the Super Admin to send a message first!");
                return;
            }

            try {
                const msgData = {
                    sender_id: myMockId,
                    sender_name: "Neha Sharma",
                    user_avatar: "",
                    receiver_id: activeTargetId,
                    message: input.trim(),
                    org_id: activeOrgId,
                    created_at: new Date().toISOString()
                };

                const { error } = await sb.from('org_direct_messages').insert([msgData]);
                if (error) throw error;
                console.log(`[SENT to ${activeTargetId}]: ${input}`);
            } catch (err) {
                console.error("Failed to send message:", err.message);
            }
        });

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

start();
