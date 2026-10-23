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

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import WebSocket from "ws";

dotenv.config();

// ─────────────────────────────────────────────────────────
// PRIMARY SUPABASE CLIENT (SINGLE SOURCE OF TRUTH)
// All modules MUST use this. No more inline createClient().
// Project: bumxgscngzjadyozdpce.supabase.co
// ─────────────────────────────────────────────────────────
const CHAT_URL = process.env.SUPABASE_CHAT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAT_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_CHAT_KEY;

let _primaryClient = null;

/**
 * Returns the centralized Supabase client.
 * Lazy singleton — created on first call, reused thereafter.
 *
 * PgBouncer Compatibility (Production/Staging):
 * When using Supabase's PgBouncer (port 6543), the client must be configured
 * with `db.schema` set explicitly and connection pooling awareness.
 * The JS SDK handles this via the REST API (PostgREST), not direct PG connections,
 * so the main optimization is ensuring we reuse a SINGLE client instance
 * across all PM2 workers (each worker creates exactly one client).
 */
export function getChatSb() {
    if (!_primaryClient) {
        if (!CHAT_URL || !CHAT_KEY) {
            console.error("❌ SUPABASE_CHAT_URL or SUPABASE_CHAT_KEY not set!");
            throw new Error("Supabase credentials missing");
        }
        _primaryClient = createClient(CHAT_URL, CHAT_KEY, {
            db: {
                schema: 'public',
            },
            auth: {
                persistSession: false,  // Server-side: no session persistence needed
                autoRefreshToken: false,
            },
            global: {
                headers: {
                    'x-connection-pool': 'pgbouncer', // Signal to Supabase for pool-aware routing
                },
            },
            realtime: {
                transport: WebSocket,
            }
        });
        console.log(`✅ Supabase client initialized (PID: ${process.pid})`);
    }
    return _primaryClient;
}

// ─────────────────────────────────────────────────────────
// BACKWARD-COMPATIBLE OBJECT EXPORTS
// These previously pointed to separate Supabase projects.
// Now they ALL resolve to the same unified client.
// Used by: org-delete.service.js, admin.controller.js,
//          messaging.routes.js, notes.routes.js, etc.
// ─────────────────────────────────────────────────────────

// Proxy-based lazy accessor: behaves like a direct client object,
// but defers creation until first property access.
function createLazyClient() {
    return new Proxy({}, {
        get(_, prop) {
            const client = getChatSb();
            const value = client[prop];
            // Supabase methods require `this` to be the actual client instance, not the Proxy object.
            return typeof value === 'function' ? value.bind(client) : value;
        }
    });
}

export const primarySupabaseClient = createLazyClient();
export const classroomClient = createLazyClient();
export const studentNotesClient = createLazyClient();
