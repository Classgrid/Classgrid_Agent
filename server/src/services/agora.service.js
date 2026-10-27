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

import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = pkg;
import "../../env.js";
import accessLogger from "../config/logger.js";

const APP_ID = process.env.AGORA_APP_ID || "PLACEHOLDER_APP_ID";
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "PLACEHOLDER_CERTIFICATE";

/**
 * generateRtcToken
 * Generates a secure RTC token for a specific channel (e.g. classroomId).
 * 
 * @param {string} channelName  Classroom or Chat ID
 * @param {string} uid          Numeric UID (Agora requires integers or strings, using string uid here)
 * @param {string} role         'publisher' or 'subscriber'
 * @param {number} expiryTime   How long the token is valid (seconds)
 */
export const generateRtcToken = (channelName, uid, role = 'publisher', expiryTime = 3600) => {
    const privilegeExpireTime = Math.floor(Date.now() / 1000) + expiryTime;
    
    const tokenRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        tokenRole,
        privilegeExpireTime
    );

    accessLogger.info(`Generated Agora RTC token for channel ${channelName}`, {
        provider: 'agora',
        channel: channelName,
        role: role
    });

    return token;
};

/**
 * generateRtmToken
 * Generates a secure RTM (Real-Time Messaging) token for a specific user.
 * Required for signaling, chat, and call-ringing.
 * 
 * @param {string} uid          The user's unique ID
 * @param {number} expiryTime   How long the token is valid (seconds)
 */
export const generateRtmToken = (uid, expiryTime = 3600) => {
    const privilegeExpireTime = Math.floor(Date.now() / 1000) + expiryTime;

    const token = RtmTokenBuilder.buildToken(
        APP_ID,
        APP_CERTIFICATE,
        uid,
        privilegeExpireTime
    );

    accessLogger.info(`Generated Agora RTM token`, {
        provider: 'agora'
    });

    return token;
};
