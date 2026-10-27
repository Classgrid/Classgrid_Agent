/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
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
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
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

import IORedis from "ioredis";
import { flushChatStream } from "../services/socket.service.js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isDev = process.env.NODE_ENV !== "production";

const redisClient = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: isDev,
    retryStrategy: (times) => {
        if (isDev) return null;
        return Math.min(times * 200, 3000);
    },
});

redisClient.on("error", () => {});

/**
 * The Adaptive Chat Worker
 * Runs periodically to flush Redis Streams into MongoDB for all active organizations.
 */
let isRunning = false;

const startChatWorker = () => {
    // Skip in dev if Redis is not available
    if (isDev) {
        console.log("👷 Adaptive Chat Worker skipped (no Redis in dev)");
        return;
    }

    // Run every 10 seconds
    setInterval(async () => {
        if (isRunning) return;
        isRunning = true;

        try {
            // Find all chat streams
            let cursor = "0";
            const streamKeys = [];

            do {
                const [nextCursor, keys] = await redisClient.scan(
                    cursor,
                    "MATCH",
                    "chat:stream:org_*",
                    "COUNT",
                    100
                );
                cursor = nextCursor;
                streamKeys.push(...keys);
            } while (cursor !== "0");

            // Process each stream
            for (const key of streamKeys) {
                const orgId = key.split("org_")[1];
                if (orgId) {
                    await flushChatStream(orgId);
                }
            }
        } catch (error) {
            console.error("[Adaptive Worker] Error during periodic flush:", error);
        } finally {
            isRunning = false;
        }
    }, 10000); // 10 seconds interval

    console.log("👷 Adaptive Chat Worker Started (10s polling interval)");
};

startChatWorker();
