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

import mongoose from "mongoose";
import FeatureFlag from "../models/FeatureFlag.js";

const PLATFORM_RECOVERY_PREFIXES = [
    "/api/auth",
    "/api/config",
    "/api/health",
    "/api/super-admin",
    "/api/cron",
    "/api/webhooks",
    "/api/admission/payments/webhook",
    "/api/payments/webhook",
];

export const FEATURE_FLAG_CATALOG = Object.freeze([
    {
        key: "platform_access",
        name: "Platform access",
        module: "platform",
        description: "Emergency switch that blocks tenant API traffic while keeping recovery routes available to Super Admin.",
        routePrefixes: ["/api"],
        exemptRoutePrefixes: PLATFORM_RECOVERY_PREFIXES,
    },
    {
        key: "ai_assistant",
        name: "AI assistant",
        module: "ai",
        description: "Controls AI assistant API access for every tenant.",
        routePrefixes: ["/api/ai"],
        exemptRoutePrefixes: [],
    },
    {
        key: "live_learning",
        name: "Live learning",
        module: "live",
        description: "Controls live classes, video, calls, meetings, and voice features.",
        routePrefixes: ["/api/live", "/api/video", "/api/call", "/api/meet", "/api/zoom", "/api/voice"],
        exemptRoutePrefixes: [],
    },
    {
        key: "assessments",
        name: "Assessments",
        module: "academic",
        description: "Controls quizzes, exams, marks, results, and internal tests.",
        routePrefixes: ["/api/quiz", "/api/advanced-quiz", "/api/online-exam", "/api/viva", "/api/exams", "/api/examinations", "/api/internal-tests", "/api/marks", "/api/results"],
        exemptRoutePrefixes: [],
    },
    {
        key: "admissions",
        name: "Admissions",
        module: "admissions",
        description: "Controls admission and CRM API access for every tenant.",
        routePrefixes: ["/api/admission", "/api/crm"],
        exemptRoutePrefixes: ["/api/admission/payments/webhook"],
    },
    {
        key: "finance",
        name: "Finance",
        module: "finance",
        description: "Controls fee, fee-record, and payroll API access for every tenant.",
        routePrefixes: ["/api/fees", "/api/fee-records", "/api/payroll"],
        exemptRoutePrefixes: [],
    },
    {
        key: "communications",
        name: "Communications",
        module: "communications",
        description: "Controls chat, messaging, notifications, forums, and support APIs.",
        routePrefixes: ["/api/chat", "/api/messages", "/api/classroom-chat", "/api/org-chat", "/api/group-chat", "/api/threads", "/api/notifications", "/api/forum", "/api/support"],
        exemptRoutePrefixes: [],
    },
    {
        key: "library",
        name: "Library",
        module: "library",
        description: "Controls library, course-library, and past-paper API access.",
        routePrefixes: ["/api/library", "/api/course-library", "/api/past-papers"],
        exemptRoutePrefixes: [],
    },
    {
        key: "canteen",
        name: "Canteen",
        module: "canteen",
        description: "Controls canteen API access for every tenant.",
        routePrefixes: ["/api/canteen"],
        exemptRoutePrefixes: [],
    },
]);

function normalizePath(value) {
    return String(value || "").split("?")[0].replace(/\/+$/, "") || "/";
}

function matchesPrefix(path, prefix) {
    const normalizedPrefix = normalizePath(prefix);
    return normalizedPrefix === "/"
        || path === normalizedPrefix
        || path.startsWith(`${normalizedPrefix}/`);
}

function hasId(values, organizationId) {
    if (!organizationId) return false;
    return (values || []).some((value) => String(value) === String(organizationId));
}

export function getFeatureFlagDefinition(key) {
    const normalizedKey = String(key || "").trim().toLowerCase();
    return FEATURE_FLAG_CATALOG.find((definition) => definition.key === normalizedKey) || null;
}

export async function ensureFeatureFlagCatalog() {
    const operations = FEATURE_FLAG_CATALOG.map((definition) => ({
        updateOne: {
            filter: { key: definition.key },
            update: {
                $setOnInsert: {
                    ...definition,
                    isEnabled: true,
                    disabledForOrgs: [],
                    enabledForOrgs: [],
                    allowedOrgTypes: [],
                },
                $set: {
                    module: definition.module,
                    routePrefixes: definition.routePrefixes,
                    exemptRoutePrefixes: definition.exemptRoutePrefixes,
                },
            },
            upsert: true,
        },
    }));

    if (operations.length > 0) {
        await FeatureFlag.bulkWrite(operations, { ordered: false });
    }
}

export function isFeatureEnabledForOrganization(flag, { organizationId, organizationType } = {}) {
    if (hasId(flag.enabledForOrgs, organizationId)) return true;
    if (!flag.isEnabled) return false;
    if (hasId(flag.disabledForOrgs, organizationId)) return false;

    const allowedOrgTypes = flag.allowedOrgTypes || [];
    return allowedOrgTypes.length === 0 || allowedOrgTypes.includes(organizationType);
}

export async function findBlockingFeatureFlag({ requestPath, organizationId, organizationType } = {}) {
    const path = normalizePath(requestPath);
    if (!path.startsWith("/api/")) return null;

    const flags = await FeatureFlag.find({})
        .select("key name description isEnabled disabledForOrgs enabledForOrgs allowedOrgTypes routePrefixes exemptRoutePrefixes")
        .lean()
        .maxTimeMS(1500);

    return flags.find((flag) => {
        const appliesToPath = (flag.routePrefixes || []).some((prefix) => matchesPrefix(path, prefix));
        const isExempt = (flag.exemptRoutePrefixes || []).some((prefix) => matchesPrefix(path, prefix));
        return appliesToPath
            && !isExempt
            && !isFeatureEnabledForOrganization(flag, { organizationId, organizationType });
    }) || null;
}

export async function platformAccessGate(req, res, next) {
    const path = normalizePath(req.originalUrl || req.path);
    if (!path.startsWith("/api/")) return next();

    try {
        if (mongoose.connection.readyState !== 1) return next();
        const platformFlag = await FeatureFlag.findOne({ key: "platform_access" })
            .select("key name description isEnabled exemptRoutePrefixes")
            .lean()
            .maxTimeMS(1500);

        if (!platformFlag || platformFlag.isEnabled) return next();

        const isExempt = (platformFlag.exemptRoutePrefixes || []).some((prefix) => matchesPrefix(path, prefix));
        if (isExempt) return next();

        res.set("Retry-After", "60");
        return res.status(503).json({
            success: false,
            code: "FEATURE_DISABLED",
            feature: platformFlag.key,
            message: "Platform access is temporarily disabled by Super Admin.",
        });
    } catch (error) {
        console.error("[FeatureFlags] Platform access check failed:", error.message);
        return next();
    }
}
