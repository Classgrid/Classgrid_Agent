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

import mongoose from 'mongoose';
import { getIO } from './socket.service.js';
import DemoRequest from '../models/DemoRequest.js';

let leadChangeStream = null;

export const initLeadStream = () => {
    try {
        if (leadChangeStream) {
            console.log("[LeadStream] Stream is already running.");
            return;
        }

        if (mongoose.connection.readyState !== 1) {
            console.log("[LeadStream] Waiting for MongoDB connection before initializing stream...");
            mongoose.connection.once('open', () => {
                initLeadStream();
            });
            return;
        }

        console.log("[LeadStream] Initializing MongoDB Change Stream for DemoRequest...");

        // Watch for changes on the DemoRequest collection
        leadChangeStream = DemoRequest.watch([], { fullDocument: 'updateLookup' });

        leadChangeStream.on('change', (change) => {
            const io = getIO();
            if (!io) return;

            // Whenever a lead is inserted, updated, or deleted, we notify the superadmin room.
            // In the socket.service.js, we saw `superadmin:support` is joined by super admins.
            if (change.operationType === 'insert' || change.operationType === 'update' || change.operationType === 'delete') {
                console.log(`[LeadStream] Detected ${change.operationType} on DemoRequest ${change.documentKey?._id}`);
                
                // Emit the event to all users connected to the superadmin support room
                io.to("superadmin:support").emit("superadmin:leads_updated", {
                    operationType: change.operationType,
                    documentKey: change.documentKey?._id
                });
            }
        });

        leadChangeStream.on('error', (error) => {
            console.error('[LeadStream] Error in DemoRequest change stream:', error);
            // In case of error (e.g., network issue), we want to close and potentially retry, 
            // but for safety, we log it and close the stream.
            leadChangeStream.close();
            leadChangeStream = null;
        });

    } catch (error) {
        console.error("[LeadStream] Failed to initialize DemoRequest stream:", error);
    }
};

export const closeLeadStream = async () => {
    if (leadChangeStream) {
        await leadChangeStream.close();
        leadChangeStream = null;
        console.log("[LeadStream] Change stream closed.");
    }
};
