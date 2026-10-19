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

import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Node.js v25+ defaults to IPv6 which triggers ERR_ERL_KEY_GEN_IPV6.
// This shared config suppresses that validation error.
const ipv6Safe = { validate: { ip: false, xForwardedForHeader: false } };

// Global limit for entire API (1,000 req/min/IP) - Day 6
export const generalLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000, // 1 minute
    max: 1000,
    message: { success: false, message: "Too many requests. Please try again later.", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limits for login (5 attempts/min) - Day 6
export const loginLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const resetTime = req.rateLimit?.resetTime;
        const secondsLeft = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
        res.status(429).json({
            success: false,
            message: `Too many login attempts. Please try again after 1 minute.`,
            code: "RATE_LIMIT_EXCEEDED",
            retryAfterSeconds: secondsLeft,
        });
    },
});

// Limit for OTP send (5 req/phone/hr) - Day 6
export const otpSendLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    keyGenerator: (req, res) => {
        return req.body.phone || req.body.email ? String(req.body.phone || req.body.email).toLowerCase().trim() : ipKeyGenerator(req, res);
    },
    message: { success: false, message: "OTP limit exceeded (Max 5 per hour).", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Chat message limit (30 msg/min) - Day 6
export const chatMessageLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: { success: false, message: "You are sending messages too fast (Max 30 per minute).", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// File upload limit (10 uploads/hr) - Day 6
export const fileUploadLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { success: false, message: "File upload limit exceeded (Max 10 per hour).", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Legacy Limit for email check (relaxed)
export const emailCheckLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please wait a minute.", code: "RATE_LIMIT_EXCEEDED" }
});

// Legacy Limit for reset password
export const resetPasswordLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 5 * 60 * 1000,
    max: 4,
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false,
    requestWasSuccessful: (req, res) => res.statusCode !== 422,
    skipSuccessfulRequests: false,
    message: { success: false, message: `Too many attempts.`, code: "RATE_LIMIT_EXCEEDED" }
});

// Admin dashboard limiter (60 req/min per IP)
export const adminLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000,
    max: 60,
    message: { success: false, message: "Admin rate limit exceeded.", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public admission application limiter
export const admissionApplyLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: (req, res) => {
        const orgId = req.body?.organization_id || "unknown-org";
        const identity = req.body?.email || req.body?.phone || req.body?.full_name;
        return identity
            ? `${orgId}:${String(identity).toLowerCase().trim()}`
            : ipKeyGenerator(req, res);
    },
    message: { success: false, message: "Admission application limit exceeded. Please try again later.", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Parent portal login limiter
export const admissionParentLoginLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many parent portal login attempts. Please try again later.", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public live merit board limiter
export const admissionLiveMeritLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000,
    max: 120,
    message: { success: false, message: "Live merit list request limit exceeded.", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Other existing limiters 
export const quizAutosaveLimiter = rateLimit({ ...ipv6Safe, windowMs: 30 * 1000, max: 10, message: { success: false, message: "Autosave limit exceeded", code: "RATE_LIMIT_EXCEEDED" } });
export const quizAntiCheatLimiter = rateLimit({ ...ipv6Safe, windowMs: 60 * 1000, max: 20, message: { success: false, message: "Anti-cheat limit exceeded", code: "RATE_LIMIT_EXCEEDED" } });
export const joinClassroomLimiter = rateLimit({ ...ipv6Safe, windowMs: 60 * 60 * 1000, max: 10, message: { success: false, message: "Too many join attempts", code: "RATE_LIMIT_EXCEEDED" } });
export const aiLimiter = rateLimit({ ...ipv6Safe, windowMs: 24 * 60 * 60 * 1000, max: 100, message: { success: false, message: "Daily AI limit exceeded", code: "RATE_LIMIT_EXCEEDED" } });

// OAuth Dynamic Client Registration needs no login, so cap it per IP (10/hr) to stop client floods
export const oauthRegisterLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { error: "too_many_requests", error_description: "Too many app registrations from this address. Please try again later.", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// OAuth authorization start (30 req/min/IP): every GET /oauth/authorize stores a pending sign-in request
export const oauthAuthorizeLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: { error: "too_many_requests", error_description: "Too many sign-in attempts. Please try again in a minute.", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// OAuth token endpoint (60 req/min/IP): slows down guessing of client secrets, codes and refresh tokens
export const oauthTokenLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: { error: "too_many_requests", error_description: "Too many token requests. Please try again in a minute.", code: "RATE_LIMIT_EXCEEDED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Remote MCP endpoint (300 req/min/IP), in front of the token check; each token also has its own limit
export const mcpIpLimiter = rateLimit({
    ...ipv6Safe,
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    message: { jsonrpc: "2.0", error: { code: -32000, message: "Too many requests. Please try again in a minute." }, id: null },
    standardHeaders: true,
    legacyHeaders: false,
});
