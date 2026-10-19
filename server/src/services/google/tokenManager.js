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

import { google } from "googleapis";
import User from "../../models/User.js";

/**
 * Token Manager — Handles Google OAuth2 token lifecycle
 * - Creates OAuth2 client with user credentials
 * - Auto-refreshes expired tokens
 * - Persists refreshed tokens back to MongoDB
 */

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL}/api/calendar/callback`
    );
};

/**
 * Get an authenticated OAuth2 client for a user.
 * Auto-refreshes the access token if it's expired.
 * @param {Object} user — Mongoose user document (must have google_access_token, google_refresh_token)
 * @returns {OAuth2Client} — Ready-to-use authenticated client
 * @throws {Error} — If user has no Google tokens
 */
export const getAuthenticatedClient = async (user) => {
    if (!user.google_access_token || !user.google_refresh_token) {
        throw new Error("GOOGLE_NOT_CONNECTED");
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: user.google_access_token,
        refresh_token: user.google_refresh_token,
        expiry_date: user.google_token_expiry ? user.google_token_expiry.getTime() : null
    });

    // Check if token is expired or about to expire (5-min buffer)
    const now = Date.now();
    const expiry = user.google_token_expiry ? user.google_token_expiry.getTime() : 0;
    const isExpired = !expiry || now >= expiry - 5 * 60 * 1000;

    if (isExpired) {
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);

            // Persist refreshed tokens to MongoDB
            await User.findByIdAndUpdate(user._id, {
                google_access_token: credentials.access_token,
                ...(credentials.refresh_token && { google_refresh_token: credentials.refresh_token }),
                google_token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
            });
        } catch (err) {
            console.error("[TokenManager] Refresh failed:", err.message);
            // Clear stale tokens
            await User.findByIdAndUpdate(user._id, {
                google_access_token: null,
                google_refresh_token: null,
                google_token_expiry: null
            });
            throw new Error("GOOGLE_TOKEN_EXPIRED");
        }
    }

    return oauth2Client;
};

export default { getAuthenticatedClient };
