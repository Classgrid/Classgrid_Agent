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

import Organization from "../models/Organization.js";
import crypto from "crypto";

export const verifyBiometricDevice = async (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"];
        const signature = req.headers["x-signature"]; // Optional: HMAC signature of payload
        const requestIp = req.ip || req.connection.remoteAddress;

        if (!apiKey) {
            return res.status(401).json({ success: false, message: "Missing x-api-key header" });
        }

        // Find organization with this API key
        const org = await Organization.findOne({ "hr_config.biometric_api_key": apiKey });

        if (!org) {
            return res.status(401).json({ success: false, message: "Invalid API Key" });
        }

        // Check if IP is whitelisted (if whitelists are configured)
        const whitelistedIps = org.hr_config?.whitelisted_ips || [];
        if (whitelistedIps.length > 0 && !whitelistedIps.includes(requestIp)) {
            // Note: In local development or misconfigured proxies, IP might not match perfectly.
            // You might want to bypass IP check in non-production.
            if (process.env.NODE_ENV === "production") {
                return res.status(403).json({ success: false, message: `IP ${requestIp} not whitelisted` });
            }
        }

        // Check signature if secret hash is provided
        const secret = org.hr_config?.biometric_secret_hash;
        if (secret && signature) {
            const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", secret)
                .update(payloadString)
                .digest("hex");

            if (expectedSignature !== signature) {
                return res.status(401).json({ success: false, message: "Invalid Signature" });
            }
        }

        // Attach organization to request
        req.organization = org;
        next();
    } catch (error) {
        console.error("Biometric Auth Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
