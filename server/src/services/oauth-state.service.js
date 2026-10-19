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

import crypto from "crypto";
import Organization from "../models/Organization.js";

export const OAUTH_STATE_COOKIE = "classgrid_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;
const LOGIN_TABS = new Set(["student", "teacher", "faculty", "admin", "org_admin", "super_admin"]);
// MCP/OAuth consent page on chat.classgrid.in, the only "come back here after login" target we carry
const CONSENT_RETURN_RE = /^\/oauth\/authorize\?request_id=[a-f0-9]{32,128}$/;

function safeConsentReturn(value) {
    const next = String(value || "");
    return CONSENT_RETURN_RE.test(next) ? next : "";
}

function stateSecret() {
    return process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || "dev_secret";
}

function signatureFor(encodedPayload) {
    return crypto.createHmac("sha256", stateSecret()).update(encodedPayload).digest("base64url");
}

function signaturesMatch(actual, expected) {
    const actualBuffer = Buffer.from(actual || "", "utf8");
    const expectedBuffer = Buffer.from(expected || "", "utf8");
    return actualBuffer.length === expectedBuffer.length
        && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function normalizeHost(value) {
    const host = String(value || "").trim().toLowerCase().replace(/\.$/, "");
    if (!host || host.length > 253 || host.includes("..")) return "";
    if (!/^[a-z0-9.-]+$/.test(host)) return "";
    return host;
}

function isClassgridFrontendHost(host) {
    return host === "classgrid.in" || /^[a-z0-9-]{1,63}\.classgrid\.in$/.test(host);
}

async function resolveAllowedHost(value) {
    const host = normalizeHost(value);
    if (!host) return "";

    if (isClassgridFrontendHost(host)) return host;
    if (process.env.NODE_ENV !== "production" && (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1")) {
        return host;
    }

    const organization = await Organization.findOne({
        $or: [
            {
                "erp_domain.domain": host,
                "erp_domain.status": { $in: ["verified", "active"] },
                "erp_domain.is_enabled": { $ne: false },
            },
            {
                "custom_domain.domain": host,
                "custom_domain.status": { $in: ["verified", "active"] },
                "custom_domain.is_enabled": { $ne: false },
            },
        ],
    }).select("_id").lean();

    return organization ? host : "";
}

export function oauthStateCookieOptions({ clear = false } = {}) {
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        path: "/api/auth",
    };
    if (!clear) options.maxAge = STATE_TTL_MS;
    return options;
}

export async function createOAuthState({ loginTab, host, intent, next }) {
    const safeLoginTab = LOGIN_TABS.has(loginTab) ? loginTab : "student";
    const safeHost = await resolveAllowedHost(host);
    if (host && !safeHost) throw new Error("This login portal host is not registered or active.");

    const nonce = crypto.randomBytes(24).toString("base64url");
    const payload = {
        t: safeLoginTab,
        h: safeHost,
        // chat.classgrid.in: only the Sign up screen may create an account (signed, so it cannot be changed)
        i: intent === "signup" ? "signup" : "signin",
        // Started from the consent page: return there after login (signed, consent path only)
        r: safeConsentReturn(next),
        n: nonce,
        exp: Date.now() + STATE_TTL_MS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return { state: `${encodedPayload}.${signatureFor(encodedPayload)}`, nonce };
}

export async function verifyOAuthState(rawState, expectedNonce) {
    const [encodedPayload, signature, extra] = String(rawState || "").split(".");
    if (!encodedPayload || !signature || extra || !signaturesMatch(signature, signatureFor(encodedPayload))) {
        throw new Error("Invalid OAuth state.");
    }

    let payload;
    try {
        payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    } catch {
        throw new Error("Invalid OAuth state.");
    }

    if (!payload.n || !expectedNonce || payload.n !== expectedNonce || !payload.exp || payload.exp < Date.now()) {
        throw new Error("Expired or mismatched OAuth state.");
    }
    if (!LOGIN_TABS.has(payload.t)) throw new Error("Invalid OAuth login portal.");

    const safeHost = await resolveAllowedHost(payload.h);
    if (payload.h && !safeHost) throw new Error("The OAuth return portal is no longer active.");

    return {
        loginTab: payload.t,
        host: safeHost,
        intent: payload.i === "signup" ? "signup" : "signin",
        consentReturn: safeConsentReturn(payload.r),
    };
}
