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
import Organization from "../../models/Organization.js";
import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import AiUsageLog from "../../models/AiUsageLog.js";
import { primarySupabaseClient as supabase } from "../../config/supabaseClient.js";
import mongoose from "mongoose";

// In-memory cache for the dynamic exchange rate (updates every 12 hours)
let cachedUsdToInr = 96.32;
let lastExchangeFetchTime = 0;

async function getLiveUsdToInrRate() {
    const now = Date.now();
    // Use cached rate if it was fetched within the last 12 hours
    if (now - lastExchangeFetchTime < 12 * 60 * 60 * 1000) {
        return cachedUsdToInr;
    }
    try {
        // Free API to get live exchange rates (no API key required)
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        const data = await res.json();
        if (data && data.rates && data.rates.INR) {
            cachedUsdToInr = data.rates.INR;
            lastExchangeFetchTime = now;
            console.log(`[AI Usage] Updated live USD to INR rate: ₹${cachedUsdToInr}`);
        }
    } catch (error) {
        console.error("[AI Usage] Failed to fetch live exchange rate, using cached/fallback rate.", error);
    }
    return cachedUsdToInr;
}

// Official per-million-token rates (USD) for every model logged in AiUsageLog.
const MODEL_PRICING_USD_PER_M = {
    // Official Cloudflare published rates (USD per million tokens)
    "@cf/deepseek-ai/deepseek-v4-pro-0813": { prompt: 1.32,  completion: 3.96  },
    "@cf/meta/llama-3.2-11b-vision-instruct": { prompt: 0.049, completion: 0.676 },
    "@cf/meta/llama-3.2-1b-instruct":           { prompt: 0.027, completion: 0.201 },
    "@cf/meta/llama-3.1-8b-instruct-fp8-fast":  { prompt: 0.045, completion: 0.384 },
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast": { prompt: 0.293, completion: 2.253 },
    // Models selectable in the AI chat model picker (Cloudflare catalog rates, 2026-10-08)
    "@cf/deepseek-ai/deepseek-v4-flash-0731":   { prompt: 0.44,  completion: 1.32  },
    "@cf/deepseek-ai/deepseek-v4.1-flash-1017": { prompt: 0.3,   completion: 1.2   },
    "@cf/openai/gpt-oss-120b":                  { prompt: 0.35,  completion: 0.75  },
    "@cf/openai/gpt-oss-20b":                   { prompt: 0.2,   completion: 0.3   },
    "@cf/moonshotai/kimi-k2.6":                 { prompt: 0.95,  completion: 4     },
    "@cf/moonshotai/kimi-k2.7-code":            { prompt: 0.95,  completion: 4     },
    "@cf/zai-org/glm-5.3":                      { prompt: 1.4,   completion: 4.4   },
    "@cf/zai-org/glm-5.3-flash":                { prompt: 0.15,  completion: 0.5   },
    "@cf/zai-org/glm-5.2":                      { prompt: 1.4,   completion: 4.4   },
    "@cf/zai-org/glm-4.7-flash":                { prompt: 0.0605, completion: 0.4  },
    "@cf/qwen/qwen3.8-27b":                     { prompt: 0.45,  completion: 3.2   },
    "@cf/google/gemma-4-26b-a4b-it":            { prompt: 0.1,   completion: 0.3   },
    "@cf/nvidia/nemotron-3-120b-a12b":          { prompt: 0.5,   completion: 1.5   },
    "@cf/meta/llama-4-scout-17b-16e-instruct":  { prompt: 0.27,  completion: 0.85  },
    "@cf/mistralai/mistral-small-3.1-24b-instruct": { prompt: 0.351, completion: 0.555 },
    // Claude API first-party rates (Anthropic models overview, 2026-10-08). cacheRead / cacheWrite
    // are per million cached tokens; Haiku 5.5 rates are for prompts up to 100k tokens.
    "claude-haiku-5-5":  { prompt: 0.1, completion: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
    "claude-sonnet-5-5": { prompt: 2,   completion: 10,  cacheRead: 0.1,  cacheWrite: 2.5 },
    "claude-opus-5-5":   { prompt: 4,   completion: 20,  cacheRead: 0.2,  cacheWrite: 5 },
    "claude-fable-5-1":  { prompt: 10,  completion: 50,  cacheRead: 0.25, cacheWrite: 12.5 },
    // Targets of the server-side refusal fallback; logged when one of them actually answered
    "claude-opus-5":     { prompt: 5,   completion: 25,  cacheRead: 0.5,  cacheWrite: 6.25 },
    "claude-opus-4-8":   { prompt: 5,   completion: 25,  cacheRead: 0.5,  cacheWrite: 6.25 },
    // Fallback: use the cheapest text model rates if model is unrecognised
    "default": { prompt: 0.027, completion: 0.201 }
};

// PHASE 6: Super Admin Global AI Usage Controller

export const getGlobalStats = async (req, res) => {
    try {
        const { month, year, orgId } = req.query;

        const currentDate = new Date();
        let targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        let targetYear = year ? parseInt(year) : currentDate.getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

        let userMatch = {};
        let topupMatch = { status: "success", type: "topup", createdAt: { $gte: startDate, $lte: endDate } };
        let chatQuery = supabase.from('ai_chat_sessions').select('*', { count: 'exact', head: true });
        let logMatch = { createdAt: { $gte: startDate, $lte: endDate } };

        if (orgId && orgId !== "all") {
            if (orgId === "classgrid") {
                userMatch = { $or: [{ role: 'super_admin' }, { organization_id: null }, { organization_id: { $exists: false } }] };
                topupMatch.orgId = null; // Assuming no topups for classgrid
                logMatch.organization_id = null;
                // For supabase, we would need to get these specific user emails to filter, simplifying for now
            } else {
                if (mongoose.Types.ObjectId.isValid(orgId)) {
                    userMatch.organization_id = new mongoose.Types.ObjectId(orgId);
                    topupMatch.orgId = new mongoose.Types.ObjectId(orgId);
                    logMatch.organization_id = new mongoose.Types.ObjectId(orgId);
                }
            }
        }

        // Fetch total tokens (credits) used
        const userStats = await User.aggregate([
            { $match: userMatch },
            {
                $group: {
                    _id: null,
                    total_tokens_used: { $sum: "$ai_tokens.total_ai_tokens_used" }
                }
            }
        ]);
        const totalCreditsSpent = userStats[0]?.total_tokens_used || 0;

        // Fetch total top-ups
        const topups = await AiCreditTransaction.aggregate([
            { $match: topupMatch },
            {
                $group: {
                    _id: null,
                    total_amount_inr: { $sum: "$amount_inr" },
                    total_credits_added: { $sum: "$credits_added" }
                }
            }
        ]);
        const totalRevenue = topups[0]?.total_amount_inr || 0;
        const creditsPurchasedThisMonth = topups[0]?.total_credits_added || 0;

        // Total Chats globally or by org (Approximated if orgId is passed to avoid heavy Supabase filtering)
        // If orgId is passed, we fetch users first
        let totalChats = 0;
        if (orgId && orgId !== "all" && orgId !== "classgrid") {
            const users = await User.find(userMatch).select("email").lean();
            const emails = users.map(u => u.email).filter(e => e);
            if (emails.length > 0) {
                const { count, error } = await supabase
                    .from('ai_chat_sessions')
                    .select('*', { count: 'exact', head: true })
                    .in('user_email', emails);
                if (!error) totalChats = count || 0;
            }
        } else {
            const { count, error } = await chatQuery;
            if (!error) totalChats = count || 0;
        }

        const totalModels = 6;
        const textTokens = Math.floor(totalCreditsSpent * 0.75); // 75% for text
        const imageTokens = Math.floor(totalCreditsSpent * 0.15); // 15% for image
        const audioTokens = totalCreditsSpent - textTokens - imageTokens; // 10% for audio

        const mockModels = [
            { name: "@cf/deepseek-ai/deepseek-v4-pro-0813", type: "Text (Primary)", usage: "Primary Chat", value: textTokens },
            { name: "@cf/black-forest-labs/flux-1-schnell", type: "Image Gen", usage: "Image Generation", value: Math.floor(imageTokens * 0.7) },
            { name: "@cf/meta/llama-3.2-11b-vision-instruct", type: "Image Understanding", usage: "Vision/Analysis", value: Math.floor(imageTokens * 0.3) },
            { name: "@cf/openai/whisper-large-v3-turbo", type: "STT", usage: "Speech to Text", value: Math.floor(audioTokens * 0.8) },
            { name: "@cf/deepgram/aura-2-en", type: "TTS", usage: "Text to Speech", value: Math.floor(audioTokens * 0.15) },
            { name: "@cf/runwayml/stable-diffusion-v1-5-img2img", type: "Img2Img", usage: "Image Editing", value: Math.floor(audioTokens * 0.05) }
        ];

        const Organization = (await import('../../models/Organization.js')).default;
        const mainOrg = await Organization.findOne({ name: /Classgrid/i, status: "active" }).sort({ createdAt: 1 });
        const mainOrgId = mainOrg ? mainOrg._id : null;

        // Daily Trend: Fetch Tokens, Requests, Active Users, Active Orgs from AiUsageLog
        const dailyUsage = await AiUsageLog.aggregate([
            { $match: logMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                    totalTokens: { $sum: "$totalTokens" },
                    promptTokens: { $sum: "$promptTokens" },
                    completionTokens: { $sum: "$completionTokens" },
                    requests: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$userId" },
                    uniqueOrgs: { $addToSet: { $cond: [{ $eq: ["$organization_id", null] }, mainOrgId, "$organization_id"] } }
                }
            }
        ]);

        const trendMap = {};
        dailyUsage.forEach(d => {
            trendMap[d._id] = {
                totalTokens: d.totalTokens,
                promptTokens: d.promptTokens,
                completionTokens: d.completionTokens,
                requests: d.requests,
                activeUsers: d.uniqueUsers.length,
                activeOrgs: d.uniqueOrgs.length,
                activeUsersList: d.uniqueUsers,
                activeOrgsList: d.uniqueOrgs
            };
        });

        // Revenue Trend: Fetch Top-ups per day
        const dailyRevenue = await AiCreditTransaction.aggregate([
            { $match: topupMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                    totalRevenue: { $sum: "$amount_inr" }
                }
            }
        ]);

        const revenueMap = {};
        dailyRevenue.forEach(d => {
            revenueMap[d._id] = d.totalRevenue;
        });
        
        // Calculate Cloudflare cost per day using OFFICIAL published $/million token rates.
        // Source: https://developers.cloudflare.com/workers-ai/models/
        // These are the ONLY models actually used in the codebase.
        // promptTokens + completionTokens are REAL values saved by gpt-tokenizer on each request.
        const CF_PRICING_USD_PER_M = MODEL_PRICING_USD_PER_M;
        // USD to INR exchange rate fetched dynamically from a live API
        const USD_TO_INR = await getLiveUsdToInrRate();

        const dailyUsageByModel = await AiUsageLog.aggregate([
            { $match: logMatch },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                        model: "$model"
                    },
                    promptTokens:     { $sum: "$promptTokens" },
                    completionTokens: { $sum: "$completionTokens" },
                    // Claude rows store their cached part of promptTokens in metadata
                    cacheReadTokens:  { $sum: { $ifNull: ["$metadata.cacheReadTokens", 0] } },
                    cacheWriteTokens: { $sum: { $ifNull: ["$metadata.cacheWriteTokens", 0] } }
                }
            }
        ]);

        const costMap = {};
        dailyUsageByModel.forEach(d => {
            const date  = d._id.date;
            const model = d._id.model;
            // Exact id first; otherwise the longest known id the logged one starts with (e.g. a dated snapshot).
            const prefixKey = Object.keys(CF_PRICING_USD_PER_M)
                .filter((k) => k !== "default" && typeof model === "string" && model.startsWith(k))
                .sort((a, b) => b.length - a.length)[0];
            const rates = CF_PRICING_USD_PER_M[model] || CF_PRICING_USD_PER_M[prefixKey] || CF_PRICING_USD_PER_M["default"];

            // Cost = (real_tokens / 1,000,000) * price_per_million.
            // Models with cache rates bill cached prompt tokens at those rates and the rest at the prompt rate.
            const cacheRead  = rates.cacheRead  !== undefined ? (d.cacheReadTokens  || 0) : 0;
            const cacheWrite = rates.cacheWrite !== undefined ? (d.cacheWriteTokens || 0) : 0;
            const uncachedPrompt = Math.max(0, (d.promptTokens || 0) - cacheRead - cacheWrite);
            const promptCostUSD     = (uncachedPrompt / 1_000_000) * rates.prompt
                                    + (cacheRead  / 1_000_000) * (rates.cacheRead  || 0)
                                    + (cacheWrite / 1_000_000) * (rates.cacheWrite || 0);
            const completionCostUSD = ((d.completionTokens || 0) / 1_000_000) * rates.completion;
            const totalCostUSD = promptCostUSD + completionCostUSD;
            const totalCostINR = totalCostUSD * USD_TO_INR;

            if (!costMap[date]) costMap[date] = { costUSD: 0, costINR: 0 };
            costMap[date].costUSD += totalCostUSD;
            costMap[date].costINR += totalCostINR;
        });

        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        const usageTrend = Array.from({ length: daysInMonth }, (_, i) => {
            const d = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            const t = trendMap[d] || {};
            const c = costMap[d] || { costUSD: 0, costINR: 0 };
            return {
                date: d,
                credits: t.totalTokens || 0,
                promptTokens: t.promptTokens || 0,
                completionTokens: t.completionTokens || 0,
                requests: t.requests || 0,
                activeUsers: t.activeUsers || 0,
                activeOrgs: t.activeOrgs || 0,
                activeUsersList: t.activeUsersList || [],
                activeOrgsList: t.activeOrgsList || [],
                revenue: revenueMap[d] || 0,
                costUSD: parseFloat(c.costUSD.toFixed(6)),
                costINR: parseFloat(c.costINR.toFixed(4))
            };
        });

        // Feature Breakdown
        const featureData = await AiUsageLog.aggregate([
            { $match: logMatch },
            { $group: { _id: "$feature", requests: { $sum: 1 }, tokens: { $sum: "$totalTokens" } } }
        ]);
        const featuresBreakdown = featureData.map(f => ({ name: f._id || "unknown", requests: f.requests, value: f.tokens }));

        // Model Breakdown
        const modelData = await AiUsageLog.aggregate([
            { $match: logMatch },
            { $group: { _id: "$model", requests: { $sum: 1 }, tokens: { $sum: "$totalTokens" } } }
        ]);
        let modelsBreakdown = modelData.map(m => ({ name: m._id || "unknown", requests: m.requests, value: m.requests }));

        if (modelsBreakdown.length === 0) {
            const totalTokensFallback = Math.floor(totalCreditsSpent * 100);
            const textTokens = Math.floor(totalTokensFallback * 0.7);
            const imageTokens = Math.floor(totalTokensFallback * 0.2);
            const audioTokens = Math.floor(totalTokensFallback * 0.1);

            modelsBreakdown = [
                { name: "@cf/deepseek-ai/deepseek-v4-pro-0813", type: "Text (Primary)", requests: 0, value: textTokens },
                { name: "@cf/black-forest-labs/flux-1-schnell", type: "Image Gen", requests: 0, value: Math.floor(imageTokens * 0.7) },
                { name: "@cf/meta/llama-3.2-11b-vision-instruct", type: "Image Understanding", requests: 0, value: Math.floor(imageTokens * 0.3) },
                { name: "@cf/openai/whisper-large-v3-turbo", type: "STT", requests: 0, value: Math.floor(audioTokens * 0.8) },
                { name: "@cf/deepgram/aura-2-en", type: "TTS", requests: 0, value: Math.floor(audioTokens * 0.15) },
                { name: "@cf/runwayml/stable-diffusion-v1-5-img2img", type: "Img2Img", requests: 0, value: Math.floor(audioTokens * 0.05) }
            ];
        }

        // Org Breakdown
        const orgData = await AiUsageLog.aggregate([
            { $match: logMatch },
            // Group by organization_id, mapping null to mainOrgId
            { $group: { _id: { $cond: [{ $eq: ["$organization_id", null] }, mainOrgId, "$organization_id"] }, requests: { $sum: 1 } } },
            { $lookup: { from: "organizations", localField: "_id", foreignField: "_id", as: "org" } },
            { $unwind: { path: "$org", preserveNullAndEmptyArrays: true } },
            { $project: { name: { $ifNull: ["$org.name", "Unknown Org"] }, orgId: "$_id", logo: "$org.logo_url", requests: 1, _id: 0 } }
        ]);
        const orgsBreakdown = orgData.map(o => ({ name: o.name, orgId: o.orgId, logo: o.logo, value: o.requests, requests: o.requests }));

        // Status Breakdown
        const statusData = await AiUsageLog.aggregate([
            { $match: logMatch },
            { $group: { _id: "$success", requests: { $sum: 1 } } }
        ]);
        const statusBreakdown = statusData.map(s => ({ name: s._id ? "Success (200)" : "Error (4xx/5xx)", value: s.requests, requests: s.requests }));

        // Role Breakdown
        const roleData = await AiUsageLog.aggregate([
            { $match: logMatch },
            { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $group: { _id: "$user.role", requests: { $sum: 1 } } }
        ]);
        const rolesBreakdown = roleData.map(r => ({ name: r._id || "unknown", value: r.requests, requests: r.requests }));

        // Users Breakdown
        const userData = await AiUsageLog.aggregate([
            { $match: logMatch },
            { $group: { _id: { userId: "$userId", orgId: "$organization_id" }, requests: { $sum: 1 } } },
            { $lookup: { from: "users", localField: "_id.userId", foreignField: "_id", as: "user" } },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "organizations", localField: "_id.orgId", foreignField: "_id", as: "org" } },
            { $unwind: { path: "$org", preserveNullAndEmptyArrays: true } },
            { $project: { name: { $ifNull: ["$user.name", "$user.email"] }, email: "$user.email", role: "$user.role", profilePicture: "$user.profilePicture", fallbackName: "Unknown User", orgName: { $cond: [{ $eq: ["$_id.orgId", null] }, "Classgrid Platform", { $ifNull: ["$org.name", "Unknown Org"] }] }, userId: "$_id.userId", requests: 1, _id: 0 } }
        ]);
        const usersBreakdown = userData.map(u => ({ name: u.name || u.fallbackName, email: u.email, role: u.role, profilePicture: u.profilePicture, orgName: u.orgName, userId: u.userId, value: u.requests, requests: u.requests }));

        res.status(200).json({
            success: true,
            data: {
                totalCreditsSpent,
                totalRevenue,
                creditsPurchasedThisMonth,
                totalChats: totalChats,
                usageTrend,
                models: modelsBreakdown,
                features: featuresBreakdown,
                orgsBreakdown,
                usersBreakdown,

                statusBreakdown,
                rolesBreakdown,
                notes: "Analytics data pulled from AiUsageLog for full granularity."
            }
        });
    } catch (error) {
        console.error("Global AI stats error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch global AI stats" });
    }
};

// Exact id first; otherwise the longest known id the logged one starts with (e.g. a dated snapshot).
function ratesFor(model) {
    if (MODEL_PRICING_USD_PER_M[model]) return MODEL_PRICING_USD_PER_M[model];
    const prefixKey = Object.keys(MODEL_PRICING_USD_PER_M)
        .filter((k) => k !== "default" && typeof model === "string" && model.startsWith(k))
        .sort((a, b) => b.length - a.length)[0];
    return MODEL_PRICING_USD_PER_M[prefixKey] || MODEL_PRICING_USD_PER_M["default"];
}

function costUsdFor(model, t) {
    const rates = ratesFor(model);
    const cacheRead = rates.cacheRead !== undefined ? (t.cacheReadTokens || 0) : 0;
    const cacheWrite = rates.cacheWrite !== undefined ? (t.cacheWriteTokens || 0) : 0;
    const uncachedPrompt = Math.max(0, (t.promptTokens || 0) - cacheRead - cacheWrite);
    return (uncachedPrompt / 1_000_000) * rates.prompt
        + (cacheRead / 1_000_000) * (rates.cacheRead || 0)
        + (cacheWrite / 1_000_000) * (rates.cacheWrite || 0)
        + ((t.completionTokens || 0) / 1_000_000) * rates.completion;
}

const MAX_MODEL_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

// Per-model usage for a chosen time range (from/to as ISO date-times, default last 7 days) and org:
// totals per model plus a timeline split by model (hourly for ranges up to 2 days, daily otherwise).
export const getModelBreakdown = async (req, res) => {
    try {
        const { from, to, orgId } = req.query;
        const end = to ? new Date(to) : new Date();
        const start = from ? new Date(from) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
            return res.status(400).json({ success: false, error: "Invalid date range" });
        }
        if (end - start > MAX_MODEL_RANGE_MS) {
            return res.status(400).json({ success: false, error: "Date range can be at most 1 year" });
        }

        const logMatch = { createdAt: { $gte: start, $lte: end } };
        if (orgId && orgId !== "all") {
            if (orgId === "classgrid") logMatch.organization_id = null;
            else if (mongoose.Types.ObjectId.isValid(orgId)) logMatch.organization_id = new mongoose.Types.ObjectId(orgId);
            else return res.status(400).json({ success: false, error: "Invalid orgId" });
        }

        const bucket = end - start <= 2 * 24 * 60 * 60 * 1000 ? "hour" : "day";
        const bucketFormat = bucket === "hour" ? "%Y-%m-%d %H:00" : "%Y-%m-%d";
        const tokenSums = {
            requests: { $sum: 1 },
            tokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
            promptTokens: { $sum: { $ifNull: ["$promptTokens", 0] } },
            completionTokens: { $sum: { $ifNull: ["$completionTokens", 0] } },
            cacheReadTokens: { $sum: { $ifNull: ["$metadata.cacheReadTokens", 0] } },
            cacheWriteTokens: { $sum: { $ifNull: ["$metadata.cacheWriteTokens", 0] } },
        };

        const [totals, timeline] = await Promise.all([
            AiUsageLog.aggregate([
                { $match: logMatch },
                { $group: { _id: "$model", ...tokenSums, failed: { $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] } } } }
            ]),
            AiUsageLog.aggregate([
                { $match: logMatch },
                {
                    $group: {
                        _id: {
                            bucket: { $dateToString: { format: bucketFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },
                            model: "$model"
                        },
                        ...tokenSums
                    }
                },
                { $sort: { "_id.bucket": 1 } }
            ])
        ]);

        const models = totals
            .map((m) => ({
                model: m._id || "unknown",
                requests: m.requests,
                tokens: m.tokens,
                costUSD: parseFloat(costUsdFor(m._id, m).toFixed(6)),
                success: m.requests - m.failed,
                failed: m.failed
            }))
            .sort((a, b) => b.requests - a.requests);

        const byBucket = new Map();
        for (const row of timeline) {
            const key = row._id.bucket;
            if (!byBucket.has(key)) byBucket.set(key, { bucket: key, models: {} });
            byBucket.get(key).models[row._id.model || "unknown"] = {
                requests: row.requests,
                tokens: row.tokens,
                costUSD: parseFloat(costUsdFor(row._id.model, row).toFixed(6))
            };
        }

        res.status(200).json({
            success: true,
            data: { from: start.toISOString(), to: end.toISOString(), bucket, models, timeline: [...byBucket.values()] }
        });
    } catch (error) {
        console.error("Model breakdown error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch model breakdown" });
    }
};

export const listActiveGrantedCredits = async (req, res) => {
    try {
        const User = (await import("../../models/User.js")).default;
        // Find users who have ever been granted promotional credits or currently have a balance
        const users = await User.find({
            $or: [
                { "ai_tokens.total_promotion_credits_granted": { $gt: 0 } },
                { "ai_tokens.promotion_credits_balance": { $gt: 0 } }
            ]
        }).select("name email profile_image ai_tokens organization_id").lean();

        const formatted = users.map(u => {
            const tokens = u.ai_tokens || {};
            const granted = tokens.total_promotion_credits_granted || 0;
            const remaining = tokens.promotion_credits_balance || 0;            const paused = tokens.promotion_credits_paused || false;
            const revoked = tokens.promotion_credits_revoked || false;
            
            return {
                id: u._id.toString(),
                name: u.name || "N/A",
                email: u.email,
                avatar: u.profile_image,
                orgId: u.organization_id?.toString() || null,
                granted: granted,
                remaining: remaining,
                used: Math.max(0, granted - remaining),
                isPaused: paused,
                isRevoked: revoked,
                startDate: tokens.promotion_credits_start_date || null,
                expirationDate: tokens.promotion_credits_end_date || null
            };
        });

        // Sort by most credits granted
        formatted.sort((a, b) => b.granted - a.granted);

        res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        console.error("List Active Granted Credits Error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};
