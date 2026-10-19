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
import "../env.js";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// We need to login first to get a token, then use the API
const BASE = "http://127.0.0.1:3000";
const out = [];
function log(msg) { out.push(msg); console.log(msg); }

async function testChat() {
    log("=== TESTING CHAT SYSTEM ===\n");

    // 1. Login as teacher
    log("1. Logging in as teacher...");
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "physics@classgrid.in", password: "dummy_pass_123" }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) { log("   FAIL: " + loginData.message); process.exit(1); }
    const token = loginData.token;
    log("   OK - got token");

    // 2. Get a classroom ID
    log("\n2. Getting classrooms...");
    const listRes = await fetch(`${BASE}/api/classrooms`, { headers: { Authorization: `Bearer ${token}` } });
    const listData = await listRes.json();
    if (!listData.classrooms || listData.classrooms.length === 0) {
        log("   FAIL: No classrooms found to test chat in.");
        process.exit(1);
    }
    const classroomId = listData.classrooms[0]._id;
    log(`   Using classroom: ${listData.classrooms[0].name} (${classroomId})`);

    // 3. Send a message via API
    log("\n3. Sending a test message...");
    const msgContent = "Automated test message " + Date.now();
    const sendRes = await fetch(`${BASE}/api/classroom-chat/${classroomId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: msgContent })
    });
    const sendData = await sendRes.json();

    if (sendRes.ok) {
        log("   OK - Message sent.");
        // log("   Response: " + JSON.stringify(sendData)); 
    } else {
        log("   FAIL: " + sendData.message);
        if (sendData.error) log("   Error detail: " + sendData.error);
        process.exit(1);
    }

    // 4. Fetch messages via API
    log("\n4. Fetching messages...");
    const fetchRes = await fetch(`${BASE}/api/classroom-chat/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const fetchData = await fetchRes.json();

    if (fetchRes.ok) {
        log(`   OK - Fetched ${fetchData.messages?.length || 0} messages.`);
        const found = fetchData.messages.find(m => m.message === msgContent);
        if (found) {
            log("   SUCCESS: Found our sent message!");
            log(`   Content: "${found.message}"`);
            log(`   Sender: ${found.sender_name}`);
        } else {
            log("   FAIL: Could not find our sent message in the list.");
        }
    } else {
        log("   FAIL: " + fetchData.message);
    }

    log("\n=== CHAT TEST COMPLETE ===");
    fs.writeFileSync("chat_test_results.txt", out.join("\n"), "utf8");
    process.exit(0);
}

testChat().catch(e => { log("FATAL: " + e.message); fs.writeFileSync("chat_test_results.txt", out.join("\n"), "utf8"); process.exit(1); });
