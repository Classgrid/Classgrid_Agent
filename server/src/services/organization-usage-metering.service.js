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

import { createHash } from "crypto";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import Classroom from "../models/Classroom.js";
import EmailJob from "../models/EmailJob.js";
import SmsLog from "../models/SmsLog.js";
import OrgSubscription from "../models/OrgSubscription.js";
import OrganizationUsageDaily from "../models/OrganizationUsageDaily.js";
import GoLive from "../models/GoLive.js";
import { ApiMetricBucket } from "../middleware/api-request-meter.middleware.js";
import { r2Client } from "../config/r2Client.js";
import AiUsageLog from "../models/AiUsageLog.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const BYTES_PER_GB = 1024 * 1024 * 1024;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "classgrid";

function startOfUtcDay(input = new Date()) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function daysInUtcMonth(input) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth() + 1, 0)).getUTCDate();
}

function toObjectId(value) {
    if (!value) return null;
    const stringValue = value.toString();
    return mongoose.Types.ObjectId.isValid(stringValue) ? new mongoose.Types.ObjectId(stringValue) : null;
}

function toStorageSlug(value, fallback = "unknown") {
    const raw = String(value || fallback).trim().toLowerCase();
    const ascii = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return ascii
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || fallback;
}

function shortStorageId(value) {
    return String(value || "unknown").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "unknown";
}

function money(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function quantity(value) {
    return Number((Number(value) || 0).toFixed(6));
}

function buildHash(payload) {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function buildOrgLookup(organizations) {
    const byId = new Map();
    const byShortId = new Map();
    const slugShortToId = new Map();

    organizations.forEach((org) => {
        const id = org._id.toString();
        const shortId = shortStorageId(id);
        const labels = [org.subdomain, org.sidebar_name, org.name].filter(Boolean);

        byId.set(id, id);
        byShortId.set(shortId, id);
        labels.forEach((label) => {
            slugShortToId.set(`${toStorageSlug(label)}-${shortId}`, id);
        });
    });

    return { byId, byShortId, slugShortToId };
}

function resolveR2OrganizationId(key, lookup, classroomOrgMap) {
    const parts = String(key || "").split("/").filter(Boolean);
    const keyText = String(key || "");

    for (const part of parts) {
        if (lookup.byId.has(part)) return lookup.byId.get(part);
        if (lookup.slugShortToId.has(part)) return lookup.slugShortToId.get(part);
    }

    const orgsIndex = parts.indexOf("orgs");
    if (orgsIndex >= 0 && parts[orgsIndex + 1]) {
        const orgFolder = parts[orgsIndex + 1];
        const suffix = orgFolder.split("-").pop();
        if (lookup.slugShortToId.has(orgFolder)) return lookup.slugShortToId.get(orgFolder);
        if (lookup.byShortId.has(suffix)) return lookup.byShortId.get(suffix);
    }

    const classroomIndex = parts.indexOf("classroom");
    if (classroomIndex >= 0 && parts[classroomIndex + 1]) {
        const orgId = classroomOrgMap.get(parts[classroomIndex + 1]);
        if (orgId) return orgId;
    }

    if (parts[0]) {
        const orgId = classroomOrgMap.get(parts[0]);
        if (orgId) return orgId;
    }

    for (const [shortId, orgId] of lookup.byShortId.entries()) {
        if (keyText.includes(`-${shortId}/`) || keyText.includes(`-${shortId}-`)) return orgId;
    }

    return null;
}

async function listR2Objects() {
    const objects = [];
    let continuationToken;

    do {
        const result = await r2Client.send(new ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            ContinuationToken: continuationToken,
            MaxKeys: 1000,
        }));

        objects.push(...(result.Contents || []));
        continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    return objects;
}

async function calculateR2UsageByOrg(organizations) {
    const [classrooms, objects] = await Promise.all([
        Classroom.find({ organization_id: { $exists: true, $ne: null } }).select("_id organization_id").lean(),
        listR2Objects(),
    ]);

    const lookup = buildOrgLookup(organizations);
    const classroomOrgMap = new Map(
        classrooms
            .filter((classroom) => classroom.organization_id)
            .map((classroom) => [classroom._id.toString(), classroom.organization_id.toString()])
    );
    const usageByOrg = new Map();
    let unmappedObjects = 0;
    let unmappedBytes = 0;

    objects.forEach((object) => {
        const key = object.Key || "";
        const size = Number(object.Size || 0);
        const orgId = resolveR2OrganizationId(key, lookup, classroomOrgMap);

        if (!orgId) {
            unmappedObjects += 1;
            unmappedBytes += size;
            return;
        }

        const current = usageByOrg.get(orgId) || { bytes: 0, objectCount: 0 };
        current.bytes += size;
        current.objectCount += 1;
        usageByOrg.set(orgId, current);
    });

    return {
        usageByOrg,
        scannedObjects: objects.length,
        unmappedObjects,
        unmappedBytes,
    };
}

async function calculateEmailUsageByOrg(periodStart, periodEnd) {
    const rows = await EmailJob.aggregate([
        {
            $match: {
                organizationId: { $ne: null },
                status: "sent",
                processedAt: { $gte: periodStart, $lt: periodEnd },
            },
        },
        { $group: { _id: "$organizationId", count: { $sum: 1 } } },
    ]);

    return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

async function calculateSmsUsageByOrg(periodStart, periodEnd) {
    const rows = await SmsLog.aggregate([
        {
            $match: {
                organizationId: { $ne: null },
                status: { $in: ["sent", "delivered"] },
                sentAt: { $gte: periodStart, $lt: periodEnd },
            },
        },
        {
            $group: {
                _id: "$organizationId",
                messages: { $sum: 1 },
                segments: { $sum: { $ifNull: ["$segmentCount", 1] } },
            },
        },
    ]);

    return new Map(rows.map((row) => [row._id.toString(), {
        messages: row.messages || 0,
        segments: row.segments || 0,
    }]));
}

// ── API Request Usage ─────────────────────────────────────────────
async function calculateApiRequestsByOrg(periodStart, periodEnd) {
    const rows = await ApiMetricBucket.aggregate([
        {
            $match: {
                day: { $gte: periodStart, $lt: periodEnd },
            },
        },
        {
            $group: {
                _id: "$organization_id",
                requests: { $sum: "$requests" },
                bytesIn: { $sum: "$bytesIn" },
                bytesOut: { $sum: "$bytesOut" },
            },
        },
    ]);

    return new Map(rows.map((row) => [row._id.toString(), {
        requests: row.requests || 0,
        bytesIn: row.bytesIn || 0,
        bytesOut: row.bytesOut || 0,
    }]));
}

// ── AI Token Usage (OpenAI / Groq / Cloudflare) ───────────────────────
async function calculateAiTokensByOrg(periodStart, periodEnd) {
    try {
        const rows = await AiUsageLog.aggregate([
            {
                $match: {
                    organization_id: { $ne: null },
                    createdAt: { $gte: periodStart, $lt: periodEnd },
                },
            },
            {
                $group: {
                    _id: { org: "$organization_id", provider: "$provider" },
                    totalTokens: { $sum: "$totalTokens" },
                    requests: { $sum: 1 },
                },
            },
        ]);

        const result = new Map();
        rows.forEach((row) => {
            const orgId = row._id.org.toString();
            const existing = result.get(orgId) || { openai: 0, groq: 0, cloudflare: 0, anthropic: 0, totalRequests: 0 };
            const provider = (row._id.provider || "").toLowerCase();
            if (provider.includes("openai")) existing.openai += row.totalTokens;
            else if (provider.includes("groq")) existing.groq += row.totalTokens;
            else if (provider.includes("cloudflare")) existing.cloudflare += row.totalTokens;
            else if (provider.includes("anthropic")) existing.anthropic += row.totalTokens;
            existing.totalRequests += row.requests;
            result.set(orgId, existing);
        });
        return result;
    } catch {
        // AiUsageLog model may not exist yet — return empty
        return new Map();
    }
}

// ── Agora Video Minutes ───────────────────────────────────────────
async function calculateAgoraMinutesByOrg(periodStart, periodEnd) {
    try {
        const rows = await GoLive.aggregate([
            {
                $match: {
                    orgId: { $ne: null },
                    startTime: { $gte: periodStart, $lt: periodEnd },
                    status: "ended",
                },
            },
            { $unwind: { path: "$participants", preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: "$orgId",
                    totalMinutes: { $sum: { $ifNull: ["$participants.watchTimeMinutes", 0] } },
                    sessions: { $addToSet: "$_id" },
                },
            },
            {
                $project: {
                    _id: 1,
                    totalMinutes: 1,
                    sessionCount: { $size: "$sessions" },
                },
            },
        ]);

        return new Map(rows.map((row) => [row._id.toString(), {
            minutes: row.totalMinutes || 0,
            sessions: row.sessionCount || 0,
        }]));
    } catch {
        return new Map();
    }
}

function getRateSnapshot(subscription) {
    const billing = subscription?.billing || {};
    return {
        pricePerGB: Number(billing.pricePerGB || 0),
        pricePerEmail: Number(billing.pricePerEmail || 0),
        pricePerSms: Number(billing.pricePerSms || 0),
        pricePerApiRequest: Number(billing.pricePerApiRequest || 0),
        pricePerAiToken: Number(billing.pricePerAiToken || 0),
        pricePerAgoraMinute: Number(billing.pricePerAgoraMinute || 0),
    };
}

function buildLineItems({ r2, emailCount, sms, apiRequests, aiTokens, agoraMinutes, rateSnapshot, monthDays, r2Meta }) {
    const storageGbDays = quantity((r2.bytes || 0) / BYTES_PER_GB);
    const dailyStorageRate = rateSnapshot.pricePerGB / monthDays;
    const emailQuantity = Number(emailCount || 0);
    const smsQuantity = Number(sms.segments || 0);
    const apiRequestCount = Number(apiRequests.requests || 0);
    const aiTokenCount = Number((aiTokens.openai || 0) + (aiTokens.groq || 0) + (aiTokens.cloudflare || 0) + (aiTokens.anthropic || 0));
    const agoraMinuteCount = Number(agoraMinutes.minutes || 0);

    return [
        {
            provider: "cloudflare_r2",
            resourceKey: "storage_gb_day",
            resourceLabel: "Cloudflare R2 storage GB-day",
            quantity: storageGbDays,
            unit: "gb_day",
            unitRateInr: dailyStorageRate,
            amountInr: money(storageGbDays * dailyStorageRate),
            rawQuantity: r2.bytes || 0,
            rawUnit: "bytes",
            source: "cloudflare_r2_list_objects_v2",
            sourceQuality: r2Meta.unmappedObjects > 0 ? "partial" : "actual",
            metadata: {
                bucket: R2_BUCKET_NAME,
                objectCount: r2.objectCount || 0,
                scannedObjects: r2Meta.scannedObjects,
                unmappedObjects: r2Meta.unmappedObjects,
                unmappedBytes: r2Meta.unmappedBytes,
                pricingBasis: "pricePerGB / daysInMonth",
            },
        },
        {
            provider: "aws_ses",
            resourceKey: "emails_sent",
            resourceLabel: "AWS SES emails sent",
            quantity: emailQuantity,
            unit: "email",
            unitRateInr: rateSnapshot.pricePerEmail,
            amountInr: money(emailQuantity * rateSnapshot.pricePerEmail),
            rawQuantity: emailQuantity,
            rawUnit: "messages",
            source: "email_jobs",
            sourceQuality: "actual",
        },
        {
            provider: "aws_sns",
            resourceKey: "sms_segments_sent",
            resourceLabel: "AWS SNS segments sent",
            quantity: smsQuantity,
            unit: "sms",
            unitRateInr: rateSnapshot.pricePerSms,
            amountInr: money(smsQuantity * rateSnapshot.pricePerSms),
            rawQuantity: sms.messages || 0,
            rawUnit: "messages",
            source: "aws_sns_logs",
            sourceQuality: "actual",
            metadata: {
                messages: sms.messages || 0,
                billableSegments: smsQuantity,
            },
        },
        {
            provider: "ec2",
            resourceKey: "api_requests",
            resourceLabel: "EC2/Vercel API requests",
            quantity: apiRequestCount,
            unit: "request",
            unitRateInr: rateSnapshot.pricePerApiRequest,
            amountInr: money(apiRequestCount * rateSnapshot.pricePerApiRequest),
            rawQuantity: apiRequestCount,
            rawUnit: "requests",
            source: "api_metric_bucket",
            sourceQuality: "actual",
            metadata: {
                bytesIn: apiRequests.bytesIn || 0,
                bytesOut: apiRequests.bytesOut || 0,
            },
        },
        {
            provider: "openai",
            resourceKey: "ai_tokens_used",
            resourceLabel: "AI tokens (OpenAI + Groq + Cloudflare)",
            quantity: aiTokenCount,
            unit: "token",
            unitRateInr: rateSnapshot.pricePerAiToken,
            amountInr: money(aiTokenCount * rateSnapshot.pricePerAiToken),
            rawQuantity: aiTokenCount,
            rawUnit: "tokens",
            source: "ai_usage_logs",
            sourceQuality: aiTokenCount > 0 ? "actual" : "estimated",
            metadata: {
                openai: aiTokens.openai || 0,
                groq: aiTokens.groq || 0,
                cloudflare: aiTokens.cloudflare || 0,
                anthropic: aiTokens.anthropic || 0,
                totalRequests: aiTokens.totalRequests || 0,
            },
        },
        {
            provider: "agora",
            resourceKey: "video_minutes",
            resourceLabel: "Agora live video participant-minutes",
            quantity: agoraMinuteCount,
            unit: "minute",
            unitRateInr: rateSnapshot.pricePerAgoraMinute,
            amountInr: money(agoraMinuteCount * rateSnapshot.pricePerAgoraMinute),
            rawQuantity: agoraMinuteCount,
            rawUnit: "minutes",
            source: "go_live_sessions",
            sourceQuality: "actual",
            metadata: {
                sessions: agoraMinutes.sessions || 0,
            },
        },
    ];
}

async function insertLedgerRecord(record) {
    try {
        await OrganizationUsageDaily.create(record);
        return "inserted";
    } catch (err) {
        if (err?.code === 11000) return "duplicate_skipped";
        throw err;
    }
}

export async function calculateOrganizationUsageDaily({ date = new Date() } = {}) {
    const day = startOfUtcDay(date);
    const periodStart = day;
    const periodEnd = new Date(day.getTime() + DAY_MS);
    const monthDays = daysInUtcMonth(day);

    const [organizations, subscriptions, emailUsage, smsUsage, apiRequestUsage, aiTokenUsage, agoraUsage] = await Promise.all([
        Organization.find({}).select("_id name sidebar_name subdomain").lean(),
        OrgSubscription.find({}).select("_id organization_id billing status plan").lean(),
        calculateEmailUsageByOrg(periodStart, periodEnd),
        calculateSmsUsageByOrg(periodStart, periodEnd),
        calculateApiRequestsByOrg(periodStart, periodEnd),
        calculateAiTokensByOrg(periodStart, periodEnd),
        calculateAgoraMinutesByOrg(periodStart, periodEnd),
    ]);
    const r2Usage = await calculateR2UsageByOrg(organizations);

    const subscriptionByOrg = new Map(
        subscriptions
            .filter((subscription) => subscription.organization_id)
            .map((subscription) => [subscription.organization_id.toString(), subscription])
    );
    const orgIds = new Set([
        ...organizations.map((org) => org._id.toString()),
        ...subscriptionByOrg.keys(),
        ...r2Usage.usageByOrg.keys(),
        ...emailUsage.keys(),
        ...smsUsage.keys(),
        ...apiRequestUsage.keys(),
        ...aiTokenUsage.keys(),
        ...agoraUsage.keys(),
    ]);

    const stats = {
        day: day.toISOString().slice(0, 10),
        inserted: 0,
        duplicateSkipped: 0,
        failed: 0,
        scannedR2Objects: r2Usage.scannedObjects,
        unmappedR2Objects: r2Usage.unmappedObjects,
        unmappedR2Bytes: r2Usage.unmappedBytes,
        errors: [],
    };

    for (const orgId of orgIds) {
        const objectId = toObjectId(orgId);
        if (!objectId) continue;

        const subscription = subscriptionByOrg.get(orgId) || null;
        const rateSnapshot = getRateSnapshot(subscription);
        const r2 = r2Usage.usageByOrg.get(orgId) || { bytes: 0, objectCount: 0 };
        const emailCount = emailUsage.get(orgId) || 0;
        const sms = smsUsage.get(orgId) || { messages: 0, segments: 0 };
        const apiRequests = apiRequestUsage.get(orgId) || { requests: 0, bytesIn: 0, bytesOut: 0 };
        const aiTokens = aiTokenUsage.get(orgId) || { openai: 0, groq: 0, cloudflare: 0, anthropic: 0, totalRequests: 0 };
        const agoraMinutes = agoraUsage.get(orgId) || { minutes: 0, sessions: 0 };
        const calculationErrors = [];

        if (!subscription) {
            calculationErrors.push("No OrgSubscription found; unit rates defaulted to 0.");
        }
        if (r2Usage.unmappedObjects > 0) {
            calculationErrors.push(`${r2Usage.unmappedObjects} R2 object(s) could not be mapped to an organization.`);
        }

        const lineItems = buildLineItems({
            r2,
            emailCount,
            sms,
            apiRequests,
            aiTokens,
            agoraMinutes,
            rateSnapshot,
            monthDays,
            r2Meta: r2Usage,
        });
        const totals = {
            storageGbDays: lineItems.find((item) => item.resourceKey === "storage_gb_day")?.quantity || 0,
            emails: emailCount,
            sms: sms.segments || 0,
            apiRequests: apiRequests.requests || 0,
            aiTokens: (aiTokens.openai || 0) + (aiTokens.groq || 0) + (aiTokens.cloudflare || 0) + (aiTokens.anthropic || 0),
            agoraMinutes: agoraMinutes.minutes || 0,
            amountInr: money(lineItems.reduce((sum, item) => sum + item.amountInr, 0)),
        };
        const calculationHash = buildHash({ orgId, day: stats.day, lineItems, totals, rateSnapshot });

        try {
            const result = await insertLedgerRecord({
                organizationId: objectId,
                orgSubscriptionId: subscription?._id || null,
                day,
                periodStart,
                periodEnd,
                timezone: "Asia/Kolkata",
                currency: "INR",
                lineItems,
                totals,
                rateSnapshot,
                calculationStatus: calculationErrors.length > 0 ? "partial" : "complete",
                calculationErrors,
                calculationHash,
                calculatedAt: new Date(),
            });

            if (result === "inserted") stats.inserted += 1;
            if (result === "duplicate_skipped") stats.duplicateSkipped += 1;
        } catch (err) {
            stats.failed += 1;
            stats.errors.push({ orgId, error: err.message });
        }
    }

    return stats;
}
