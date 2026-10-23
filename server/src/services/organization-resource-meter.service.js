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

import OrganizationResourceUsage from "../models/OrganizationResourceUsage.js";

const PROVIDER_CONFIG = [
    {
        provider: "vercel",
        label: "Vercel",
        requiredEnv: ["VERCEL_API_TOKEN", "VERCEL_PROJECT_ID"],
        optionalEnv: ["VERCEL_TEAM_ID"],
        meterStatus: "config_only",
        note: "Domain API credentials exist here; per-organization request, bandwidth, build, and function cost allocation still needs a provider sync job.",
    },
    {
        provider: "cloudflare_r2",
        label: "Cloudflare R2",
        requiredEnv: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"],
        optionalEnv: ["R2_PUBLIC_URL"],
        meterStatus: "partial",
        note: "Uploads use env-backed R2 config. Full org-wide R2 object/request cost still needs object-key tracking or bucket inventory sync.",
    },
    {
        provider: "aws_ec2",
        label: "AWS EC2",
        requiredEnv: ["AWS_REGION"],
        optionalEnv: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_COST_EXPLORER_ROLE_ARN", "EC2_RESOURCE_HOST", "EC2_SSH_USER", "EC2_SSH_KEY_PATH"],
        meterStatus: "config_only",
        note: "Runtime host details must stay in env. Cost allocation needs AWS Cost Explorer credentials or tagged billing export.",
    },
    {
        provider: "mongodb",
        label: "MongoDB",
        requiredEnv: ["MONGO_URI"],
        optionalEnv: ["MONGODB_ATLAS_PUBLIC_KEY", "MONGODB_ATLAS_PRIVATE_KEY", "MONGODB_ATLAS_PROJECT_ID"],
        meterStatus: "partial",
        note: "Application document counts are measurable now; Atlas byte and query-cost allocation needs Atlas billing/API credentials.",
    },
    {
        provider: "redis",
        label: "Redis",
        requiredEnv: ["REDIS_URL"],
        optionalEnv: ["REDIS_PROVIDER_API_KEY", "REDIS_PROVIDER_ACCOUNT_ID"],
        meterStatus: "config_only",
        note: "Redis is env-backed. Per-organization memory and command counts need app-level tenant counters or provider telemetry.",
    },
    {
        provider: "aws_sns",
        label: "AWS SNS",
        requiredEnv: ["AWS_SNS_REGION", "AWS_SNS_ACCESS_KEY_ID", "AWS_SNS_SECRET_ACCESS_KEY"],
        optionalEnv: ["SMS_BUDGET_LIMIT", "SMS_COST_PER_MSG"],
        meterStatus: "config_only",
        note: "SMS sending is env-backed. Per-organization SMS cost needs message logs tagged with organizationId.",
    },
    {
        provider: "ai",
        label: "AI providers",
        requiredEnvAny: ["GROQ_API_KEY", "CLOUDFLARE_WORKERS_AI_TOKEN", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"],
        optionalEnv: ["HUGGINGFACE_API_KEY"],
        meterStatus: "config_only",
        note: "AI keys are env-backed. Per-organization token and model cost needs request logging at each AI call site.",
    },
    {
        provider: "razorpay",
        label: "Razorpay",
        requiredEnv: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
        optionalEnv: ["RAZORPAY_WEBHOOK_SECRET"],
        meterStatus: "partial",
        note: "Payment records exist in MongoDB. Provider fee/tax allocation needs fee fields from Razorpay payments or settlement sync.",
    },
];

function hasEnv(name) {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0;
}

function getCurrentMonthRange(now = new Date()) {
    return {
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: now,
    };
}

function toNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function getProviderStatus(config) {
    const requiredEnv = config.requiredEnv || [];
    const requiredEnvAny = config.requiredEnvAny || [];
    const missingEnv = requiredEnv.filter((name) => !hasEnv(name));
    const hasAnyRequired = requiredEnvAny.length === 0 || requiredEnvAny.some((name) => hasEnv(name));
    const configured = missingEnv.length === 0 && hasAnyRequired;

    return {
        provider: config.provider,
        label: config.label,
        configured,
        requiredEnv,
        requiredEnvAny,
        optionalEnv: config.optionalEnv || [],
        missingEnv: hasAnyRequired ? missingEnv : [...missingEnv, `one of: ${requiredEnvAny.join(", ")}`],
        presentOptionalEnv: (config.optionalEnv || []).filter((name) => hasEnv(name)),
        meterStatus: config.meterStatus,
        note: config.note,
    };
}

export function getProviderConfigurationStatus() {
    return PROVIDER_CONFIG.map(getProviderStatus);
}

function buildMeter(orgId, range, input) {
    const usageAmount = toNumber(input.usageAmount);
    const costAmount = toNumber(input.costAmount);

    if (usageAmount === null && costAmount === null) {
        return null;
    }

    return {
        orgId,
        provider: input.provider,
        providerLabel: input.providerLabel,
        resourceType: input.resourceType,
        metricKey: input.metricKey,
        metricLabel: input.metricLabel,
        usageAmount,
        unit: input.unit || "count",
        costAmount,
        currency: input.currency || "INR",
        quality: input.quality || "actual",
        source: input.source || "internal_usage_endpoint",
        periodStart: range.periodStart,
        periodEnd: range.periodEnd,
        lastSyncedAt: new Date(),
        metadata: input.metadata || {},
    };
}

export async function getOrganizationResourceUsage(orgId) {
    const records = await OrganizationResourceUsage.find({ orgId })
        .sort({ lastSyncedAt: -1 })
        .limit(100)
        .lean();

    const latestByMetric = new Map();
    records.forEach((record) => {
        const key = `${record.provider}:${record.metricKey}`;
        if (!latestByMetric.has(key)) {
            latestByMetric.set(key, record);
        }
    });

    const latestRecords = Array.from(latestByMetric.values());
    const knownCostInr = latestRecords.reduce((sum, record) => {
        if (record.currency === "INR" && typeof record.costAmount === "number") {
            return sum + record.costAmount;
        }
        return sum;
    }, 0);

    const providerConfiguration = getProviderConfigurationStatus();

    return {
        records: latestRecords,
        providerConfiguration,
        totals: {
            knownCostInr: Number(knownCostInr.toFixed(2)),
            totalMeters: latestRecords.length,
            actualMeters: latestRecords.filter((record) => record.quality === "actual").length,
            partialMeters: latestRecords.filter((record) => record.quality === "partial").length,
            configuredProviders: providerConfiguration.filter((provider) => provider.configured).length,
            totalProviders: providerConfiguration.length,
        },
    };
}

export async function recordInternalResourceSnapshot(orgId, snapshot) {
    const range = getCurrentMonthRange();
    const meters = [
        buildMeter(orgId, range, {
            provider: "supabase",
            providerLabel: "Supabase",
            resourceType: "storage",
            metricKey: "legacy_notes_storage_bytes",
            metricLabel: "Legacy notes storage",
            usageAmount: snapshot.storage?.bytes,
            unit: "bytes",
            costAmount: snapshot.storage?.knownChargeInr,
            quality: "partial",
            metadata: {
                fileCount: snapshot.storage?.fileCount,
                includedGb: snapshot.storage?.includedGb,
                billableGb: snapshot.storage?.billableGb,
                scope: snapshot.storage?.scope,
            },
        }),
        buildMeter(orgId, range, {
            provider: "supabase",
            providerLabel: "Supabase",
            resourceType: "database",
            metricKey: "student_note_rows",
            metricLabel: "Student note rows",
            usageAmount: snapshot.db?.notesCount,
            unit: "rows",
            quality: "actual",
        }),
        buildMeter(orgId, range, {
            provider: "mongodb",
            providerLabel: "MongoDB",
            resourceType: "database",
            metricKey: "tracked_organization_records",
            metricLabel: "Tracked organization records",
            usageAmount: snapshot.db?.totalTrackedRecords,
            unit: "records",
            quality: "actual",
        }),
        buildMeter(orgId, range, {
            provider: "email_queue",
            providerLabel: "Email queue",
            resourceType: "email",
            metricKey: "email_jobs_total",
            metricLabel: "Email jobs total",
            usageAmount: snapshot.email?.totalSent,
            unit: "jobs",
            quality: "actual",
            metadata: {
                daily: snapshot.email?.daily,
                monthly: snapshot.email?.monthly,
            },
        }),
        buildMeter(orgId, range, {
            provider: "support",
            providerLabel: "Support",
            resourceType: "operations",
            metricKey: "support_tickets_total",
            metricLabel: "Support tickets total",
            usageAmount: snapshot.support?.totalTickets,
            unit: "tickets",
            quality: "actual",
            metadata: {
                highPriorityTickets: snapshot.support?.highPriorityTickets,
            },
        }),
        buildMeter(orgId, range, {
            provider: "razorpay",
            providerLabel: "Razorpay",
            resourceType: "payment_volume",
            metricKey: "platform_billing_collected_inr",
            metricLabel: "Platform billing collected",
            usageAmount: snapshot.finance?.platformBilling?.successfulAmount,
            unit: "INR",
            quality: "actual",
            metadata: {
                totalTransactions: snapshot.finance?.platformBilling?.totalTransactions,
                refundedAmount: snapshot.finance?.platformBilling?.refundedAmount,
            },
        }),
    ].filter(Boolean);

    await Promise.all(meters.map((meter) => OrganizationResourceUsage.findOneAndUpdate(
        {
            orgId: meter.orgId,
            provider: meter.provider,
            metricKey: meter.metricKey,
            periodStart: meter.periodStart,
        },
        { $set: meter },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )));

    return getOrganizationResourceUsage(orgId);
}
