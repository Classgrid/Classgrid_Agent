import { getJwtSecret } from "../utils/jwt-secret.js";
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

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import SystemSettings from "../models/SystemSettings.js";
import Organization from "../models/Organization.js";
import connectDB from "../../config/db.js";
import { needsChatOnboarding } from "../utils/chat-onboarding.js";

const JWT_SECRET = getJwtSecret();

/**
 * Shared account checks for an already-loaded user (used by isAuthenticated and by the OAuth
 * access-token check). Returns null when the user may continue, otherwise { status, body } to send.
 *
 * options.issuedAtMs        — when the credential was issued; rejected if older than passwordChangedAt
 * options.settings          — SystemSettings doc (undefined → loaded here)
 * options.allowStatusBypass — keep the two support accounts usable while inactive (false for OAuth apps)
 */
export async function getUserAccessBlock(user, { issuedAtMs, settings, allowStatusBypass = true } = {}) {
    // JWT Invalidation check after password change
    if (user.passwordChangedAt && typeof issuedAtMs === "number") {
        if (issuedAtMs < user.passwordChangedAt.getTime()) {
            return {
                status: 401,
                body: { message: "Token expired due to password change. Please log in again." },
            };
        }
    }

    if (settings === undefined) {
        settings = await SystemSettings.findOne();
    }

    // Check enforced system settings
    if (settings && user.role !== "super_admin") {
        if (settings.globalLock) {
            return { status: 403, body: { success: false, message: "Platform is under a global security lock. All access is temporarily suspended.", code: "GLOBAL_LOCK" } };
        }
        if (settings.maintenanceMode) {
            return { status: 503, body: { success: false, message: "Platform is currently under maintenance. Please try again later.", code: "MAINTENANCE_MODE" } };
        }
    }

    // Status check — block suspended/blocked users
    const bypassesStatus = allowStatusBypass && ["nikhil.shinde@classgrid.in", "support@classgrid.in"].includes(user.email);
    if (user.status !== "active" && !bypassesStatus) {
        return {
            status: 403,
            body: {
                success: false,
                message: "Your account is not active. Please contact support.",
                code: "USER_INACTIVE",
            },
        };
    }

    // Organization status check (kept in memory for a few seconds, see keptOrgStatus)
    if (user.organization_id && user.role !== "super_admin") {
        const orgStatus = await keptOrgStatus(user.organization_id);
        if (orgStatus && ["suspended", "blocked"].includes(orgStatus)) {
            return {
                status: 403,
                body: {
                    success: false,
                    message: "Your organization has been suspended or blocked. Contact support.",
                    code: "ORG_INACTIVE",
                },
            };
        }
    }

    return null;
}

/**
 * Core authentication middleware.
 * Handles both normal and impersonation tokens.
 *
 * Normal token:        { id, role, organizationId }
 * Impersonation token: { id (realUser), actingAs, role (realUser role), organizationId, impersonation: true }
 *
 * Sets on req:
 *   req.user                   — the acting user (from DB for data access)
 *   req.realUser               — { _id, role, organizationId } from token (no DB fetch) when impersonating; null otherwise
 *   req.isImpersonating        — boolean
 *   req.effectiveOrganizationId — always from JWT (authoritative)
 */
// The database is about 150 ms away per read (measured from the server, 2026-11-10), and every API request read the
// system settings, the user's row and the organization's status before anything else: 300-450 ms in front of every
// answer, every poll, every click. They are kept in this process for a few seconds instead (a blocked user or a
// maintenance switch takes effect within that time).
const SETTINGS_KEEP_MS = 15000;
const USER_KEEP_MS = 15000;
const ORG_KEEP_MS = 30000;
let settingsKept = null; // { at, promise }
const usersKept = new Map(); // userId -> { at, promise of the lean row }
const orgStatusKept = new Map(); // orgId -> { at, promise of the status }
export function forgetAuthUser(userId) { usersKept.delete(String(userId)); }
async function keptSettings() {
    if (settingsKept && Date.now() - settingsKept.at < SETTINGS_KEEP_MS) return settingsKept.promise;
    const promise = SystemSettings.findOne().lean().exec().catch(() => null);
    settingsKept = { at: Date.now(), promise };
    return promise;
}
async function keptUser(userId) {
    const key = String(userId);
    const have = usersKept.get(key);
    if (have && Date.now() - have.at < USER_KEEP_MS) return have.promise;
    // .exec() so a real Promise is kept: a mongoose Query can only be awaited once ("Query was already executed").
    const promise = User.findById(userId).select("-password -verificationToken").maxTimeMS(5000).lean().exec();
    usersKept.set(key, { at: Date.now(), promise });
    promise.then((u) => { if (!u) usersKept.delete(key); }, () => usersKept.delete(key));
    if (usersKept.size > 20000) usersKept.clear();
    return promise;
}
export async function keptOrgStatus(orgId) {
    const key = String(orgId);
    const have = orgStatusKept.get(key);
    if (have && Date.now() - have.at < ORG_KEEP_MS) return have.promise;
    const promise = Organization.findById(orgId).select("status").lean().exec().then((o) => o?.status ?? null).catch(() => null);
    orgStatusKept.set(key, { at: Date.now(), promise });
    if (orgStatusKept.size > 20000) orgStatusKept.clear();
    return promise;
}

export const isAuthenticated = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && (req.cookies.token || req.cookies.jwt)) {
        token = req.cookies.token || req.cookies.jwt;
    }

    if (!token || token === "null" || token === "undefined") {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Ensure DB is connected (critical for serverless cold starts)
        await connectDB();

        // The settings, the user's row and the organization's status are each 150 ms away: on a miss they are read
        // together, not one after another (the token names the organization, so its status is warmed here and found
        // ready in getUserAccessBlock)
        const settingsP = keptSettings();
        const normalMode = !decoded.isProvisional && !decoded.impersonation;
        const userRowP = normalMode ? keptUser(decoded.id) : null;
        const orgHint = decoded.organization_id || decoded.orgId;
        if (normalMode && orgHint && decoded.role !== "super_admin") keptOrgStatus(orgHint).catch(() => {});
        // Dynamically check system settings for emergency locks (kept in memory for a few seconds, see keptSettings)
        const settings = await settingsP;

        if (decoded.isProvisional) {
            // Strictly limit what endpoints a provisional token can access.
            // Basically just /api/auth/me 
            if (req.originalUrl !== "/api/auth/me") {
                return res.status(403).json({ message: "Provisional tokens cannot access this endpoint." });
            }
            req.user = {
                _id: decoded.id,
                role: decoded.role,
                organization_id: decoded.orgId,
                email: decoded.email,
                isProvisional: true
            };
            req.effectiveOrganizationId = decoded.orgId;
            return next();
        }

        if (decoded.impersonation) {
            // ── IMPERSONATION MODE ──
            // Single DB fetch: only load the user being acted as
            const actingUser = await User.findById(decoded.actingAs).select("-password -verificationToken").maxTimeMS(5000);
            if (!actingUser) {
                return res.status(401).json({ message: "Impersonated user no longer exists" });
            }

            req.user = actingUser;
            req.realUser = {
                _id: decoded.id,
                role: decoded.role,
                organizationId: decoded.organizationId,
            };
            req.isImpersonating = true;

            // Set impersonation response header for frontend detection
            res.setHeader("X-Impersonation", "true");
        } else {
            // ── NORMAL MODE ──
            // (the row is kept in memory for a few seconds and hydrated into a fresh document per request, so handlers
            // that change and save req.user keep working)
            const userRow = await userRowP;
            if (!userRow) {
                return res.status(401).json({ message: "User no longer exists" });
            }
            const user = User.hydrate(userRow);

            // Password change, global lock / maintenance, user status and organization status checks
            const block = await getUserAccessBlock(user, { issuedAtMs: decoded.iat * 1000, settings });
            if (block) {
                return res.status(block.status).json(block.body);
            }

            const isAuthOrOnboardingRoute = req.originalUrl.startsWith('/api/auth');
            // (a Classgrid extension login, client: "editor", needs no WhatsApp number: the extension has no WhatsApp or
            // schedules; the website and the desktop app still ask for it)
            if (user.role === 'user' && decoded.client !== 'editor' && (!user.metadata || !user.metadata.whatsappPhone) && !isAuthOrOnboardingRoute) {
                return res.status(403).json({
                    success: false,
                    message: 'Account onboarding incomplete. You must verify your WhatsApp number.',
                    code: 'INCOMPLETE_ONBOARDING',
                });
            }

            req.user = user;
            req.realUser = null;
            req.isImpersonating = false;
        }

        // Organization ID always sourced from JWT (authoritative)
        req.effectiveOrganizationId = decoded.organizationId || null;
        req.authRememberMe = decoded.rememberMe === true;
        // Signed in from the Classgrid extension (Classgrid Code, VS Code, Cursor): auth.controller.js generateEditorToken
        req.editorClient = decoded.client === "editor";

        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err.message);
        return res.status(401).json({ message: "Token invalid" });
    }
};

/**
 * Returns the effective role for permission checks.
 * During impersonation → admin's real role.
 * Normal mode → user's own role.
 *
 * Usage:  if (getEffectiveRole(req) === "org_admin") { ... }
 */
export const getEffectiveRole = (req) => {
    return req.realUser?.role || req.user.role;
};

/**
 * Role-based access control middleware.
 * Always uses effective role (admin's role during impersonation).
 * Usage: router.post("/admin-action", isAuthenticated, requireRole("org_admin"), handler)
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        const effectiveRole = getEffectiveRole(req);
        
        // Always allow super_admins to bypass this check.
        // Also allow the god user emails.
        const isGodUser = req.user.email && ["nikhil.shinde@classgrid.in", "support@classgrid.in"].includes(req.user.email);
        const isSuperAdmin = req.realUser?.role === "super_admin" || req.user.role === "super_admin";

        if (!effectiveRole || (!roles.includes(effectiveRole) && !isGodUser && !isSuperAdmin)) {
            return res.status(403).json({
                message: `Access denied. Required role: ${roles.join(" or ")}`,
            });
        }
        next();
    };
};

/**
 * Organization access middleware.
 * Blocks requests from users not linked to any organization.
 * Uses effectiveOrganizationId from JWT.
 */
export const requireOrganization = (req, res, next) => {
    const effectiveRole = getEffectiveRole(req);

    // Admins bypass org requirement
    if (effectiveRole === "super_admin" || effectiveRole === "org_admin") {
        return next();
    }
    if (!req.effectiveOrganizationId && !req.user.organization_id) {
        return res.status(403).json({
            message: "Organization access required. Please connect to an organization first.",
            code: "NO_ORG",
        });
    }
    next();
};

/**
 * Blocks dashboard API access for org_admin users who haven't set their password yet.
 * Apply this to all sensitive org admin routes.
 */
export const requirePasswordSet = (req, res, next) => {
    // Only enforce for org_admin role
    if (req.user && req.user.role === 'org_admin' && req.user.mustResetPassword) {
        return res.status(403).json({
            message: "You must set your password before accessing the dashboard.",
            code: "MUST_RESET_PASSWORD",
        });
    }
    next();
};

/**
 * Blocks the AI for public chat accounts that haven't finished sign-up (verified WhatsApp number + age).
 */
export const requireChatOnboarding = (req, res, next) => {
    // The Classgrid extension needs no WhatsApp number or age (no WhatsApp or schedules there)
    if (!req.isImpersonating && !req.editorClient && needsChatOnboarding(req.user)) {
        return res.status(403).json({
            message: "Please finish signing up by verifying your WhatsApp number.",
            code: "CHAT_ONBOARDING_REQUIRED",
        });
    }
    next();
};


