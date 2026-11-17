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

import PaymentTransaction from "../../models/PaymentTransaction.js";
import Invoice from "../../models/Invoice.js";
import InvoiceLineItem from "../../models/InvoiceLineItem.js";
import OrganizationSubscriptionItem from "../../models/OrganizationSubscriptionItem.js";
import BillingExportJob from "../../models/BillingExportJob.js";
import ReconciliationRun from "../../models/ReconciliationRun.js";
import ReconciliationMismatch from "../../models/ReconciliationMismatch.js";
import Razorpay from "razorpay";
import { logAdminAction } from "../../services/auditLog.service.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import PlatformTransaction from "../../models/PlatformTransaction.js";
import PlanConfig from "../../models/PlanConfig.js";
import User from "../../models/User.js";
import {
    csvCell,
    escapeRegex,
    fmtIndiaDay,
    fmtIndiaTime,
    indiaDayBounds,
    loadRefundMap,
    paidWithLabel,
    queryText,
    roundInr,
    toPaymentRows,
} from "./billing-transactions.controller.js";
import { buildFailedMatch, loadAiFailures } from "./billing-failures.controller.js";

// Helper to filter for only Classgrid SaaS Revenue
const getBaseRevenueMatch = (filters) => {
    const match = {
        status: "CAPTURED",
        paymentFlow: { $in: ["CLASSGRID_SUBSCRIPTION", "AI_TOPUP"] },
        merchantType: "CLASSGRID",
    };
    if (filters.startDate && filters.endDate) {
        match.capturedAt = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
    }
    return match;
};

export const getRevenueOverview = async (req, res) => {
    try {
        const match = getBaseRevenueMatch(req.query);
        const revenue = await PaymentTransaction.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    grossRevenuePaise: { $sum: "$amountCapturedPaise" },
                    totalGatewayFeesPaise: { $sum: "$feePaise" },
                    netRevenuePaise: { $sum: { $subtract: ["$amountCapturedPaise", "$feePaise"] } },
                    transactionCount: { $sum: 1 }
                }
            }
        ]);
        res.json({ success: true, data: revenue[0] || { grossRevenuePaise: 0, totalGatewayFeesPaise: 0, netRevenuePaise: 0, transactionCount: 0 } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRevenueByOrganization = async (req, res) => {
    try {
        const match = getBaseRevenueMatch(req.query);
        const revenue = await PaymentTransaction.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$organizationId",
                    grossRevenuePaise: { $sum: "$amountCapturedPaise" },
                    transactionCount: { $sum: 1 },
                    latestTransactionDate: { $max: "$capturedAt" }
                }
            },
            {
                $lookup: {
                    from: "organizations",
                    localField: "_id",
                    foreignField: "_id",
                    as: "organization"
                }
            },
            { $unwind: "$organization" },
            { $sort: { grossRevenuePaise: -1 } }
        ]);
        res.json({ success: true, data: revenue });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRevenueByModule = async (req, res) => {
    try {
        const invoiceFilter = {
            status: { $in: ["PAID", "PARTIALLY_PAID"] },
            amountPaidPaise: { $gt: 0 },
        };
        if (req.query.startDate || req.query.endDate) {
            invoiceFilter.issueDate = {};
            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                if (Number.isNaN(startDate.getTime())) {
                    return res.status(400).json({ success: false, message: "startDate must be a valid date" });
                }
                invoiceFilter.issueDate.$gte = startDate;
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                if (Number.isNaN(endDate.getTime())) {
                    return res.status(400).json({ success: false, message: "endDate must be a valid date" });
                }
                invoiceFilter.issueDate.$lte = endDate;
            }
        }

        const invoices = await Invoice.find(invoiceFilter).select("_id totalAmountPaise amountPaidPaise").lean();
        const invoiceById = new Map(invoices.map((invoice) => [invoice._id.toString(), invoice]));
        const [lineItems, activeItems] = await Promise.all([
            InvoiceLineItem.find({
                invoiceId: { $in: invoices.map((invoice) => invoice._id) },
                moduleVersionId: { $ne: null },
            })
                .populate({ path: "moduleVersionId", populate: { path: "moduleId", select: "name code" } })
                .lean(),
            OrganizationSubscriptionItem.find({ status: "ACTIVE" })
                .populate("billingModuleId", "name code")
                .lean(),
        ]);

        const activeCounts = new Map();
        for (const item of activeItems) {
            const moduleId = (item.billingModuleId?._id || item.billingModuleId)?.toString();
            if (moduleId) activeCounts.set(moduleId, (activeCounts.get(moduleId) || 0) + 1);
        }

        const byModule = new Map();
        for (const line of lineItems) {
            const module = line.moduleVersionId?.moduleId;
            const moduleId = (module?._id || module)?.toString();
            if (!moduleId) continue;
            const invoice = invoiceById.get(line.invoiceId.toString());
            const paidRatio = Math.min(
                Number(invoice?.amountPaidPaise || 0) / Math.max(Number(invoice?.totalAmountPaise || 0), 1),
                1,
            );
            const recognizedPaise = Math.round(Number(line.totalAmountPaise || line.subtotalPaise || 0) * paidRatio);
            const current = byModule.get(moduleId) || {
                moduleId,
                module: { _id: moduleId, name: module?.name, code: module?.code },
                activeCount: activeCounts.get(moduleId) || 0,
                recognizedRevenuePaise: 0,
            };
            current.recognizedRevenuePaise += recognizedPaise;
            byModule.set(moduleId, current);
        }
        for (const item of activeItems) {
            const module = item.billingModuleId;
            const moduleId = (module?._id || module)?.toString();
            if (moduleId && !byModule.has(moduleId)) {
                byModule.set(moduleId, {
                    moduleId,
                    module: { _id: moduleId, name: module?.name, code: module?.code },
                    activeCount: activeCounts.get(moduleId) || 0,
                    recognizedRevenuePaise: 0,
                });
            }
        }
        const results = [...byModule.values()].sort((a, b) => b.recognizedRevenuePaise - a.recognizedRevenuePaise);
        const totalRevenuePaise = results.reduce((sum, item) => sum + item.recognizedRevenuePaise, 0);
        for (const item of results) {
            item.percentageOfTotal = totalRevenuePaise
                ? Math.round((item.recognizedRevenuePaise / totalRevenuePaise) * 10000) / 100
                : 0;
        }
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRevenueByInvoice = async (req, res) => {
    try {
        const match = { status: { $in: ["PAID", "PARTIALLY_PAID"] } };
        const invoices = await Invoice.find(match).populate("organizationId").sort({ issueDate: -1 }).limit(100);
        res.json({ success: true, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const exportRevenue = async (req, res) => {
    try {
        const filters = { ...req.query, ...(req.body?.filters || {}) };
        const job = await BillingExportJob.create({
            exportType: "REVENUE_REPORT",
            format: req.body?.format || req.query.format || "CSV",
            filters,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
            requestedBy: req.user?._id
        });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Exported revenue report", 
            { jobId: job._id }
        );

        res.status(202).json({ success: true, data: job, message: "Export job queued" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const reconcileRevenue = async (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        return res.status(503).json({
            success: false,
            code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
            message: "Payment reconciliation is not configured",
        });
    }

    const requestedDate = req.body?.targetDate ? new Date(req.body.targetDate) : new Date();
    if (Number.isNaN(requestedDate.getTime())) {
        return res.status(400).json({ success: false, message: "targetDate must be a valid date" });
    }

    const start = new Date(requestedDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const run = await ReconciliationRun.create({
        targetDate: start,
        provider: "RAZORPAY",
        status: "IN_PROGRESS",
        runBy: req.user?._id || null,
    });

    try {
        const transactions = await PaymentTransaction.find({ capturedAt: { $gte: start, $lt: end } }).limit(500);
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const mismatches = [];

        for (const transaction of transactions) {
            const internalState = {
                status: transaction.status,
                amountCapturedPaise: transaction.amountCapturedPaise,
                currency: transaction.currency,
                providerPaymentId: transaction.providerPaymentId,
            };
            let providerPayment;
            try {
                providerPayment = await razorpay.payments.fetch(transaction.providerPaymentId);
            } catch (providerError) {
                mismatches.push({
                    reconciliationRunId: run._id,
                    providerTransactionId: transaction.providerPaymentId,
                    internalTransactionId: transaction._id,
                    mismatchType: "MISSING_IN_PROVIDER",
                    providerState: { errorCode: providerError?.error?.code || providerError?.statusCode || "FETCH_FAILED" },
                    internalState,
                });
                continue;
            }

            const providerState = {
                id: providerPayment.id,
                status: providerPayment.status,
                amount: providerPayment.amount,
                currency: providerPayment.currency,
            };
            if (providerPayment.amount !== transaction.amountCapturedPaise) {
                mismatches.push({
                    reconciliationRunId: run._id,
                    providerTransactionId: transaction.providerPaymentId,
                    internalTransactionId: transaction._id,
                    mismatchType: "AMOUNT_MISMATCH",
                    providerState,
                    internalState,
                });
            }
            const expectedStatus = providerPayment.status === "captured" ? "CAPTURED" : providerPayment.status?.toUpperCase();
            if (expectedStatus !== transaction.status) {
                mismatches.push({
                    reconciliationRunId: run._id,
                    providerTransactionId: transaction.providerPaymentId,
                    internalTransactionId: transaction._id,
                    mismatchType: "STATUS_MISMATCH",
                    providerState,
                    internalState,
                });
            }
        }

        if (mismatches.length) await ReconciliationMismatch.insertMany(mismatches);
        run.totalTransactionsChecked = transactions.length;
        run.mismatchesFound = mismatches.length;
        run.status = "COMPLETED";
        await run.save();
        await logAdminAction(
            req, "UPDATE_BILLING", "billing", run._id, "Reconciled Razorpay revenue",
            { targetDate: start, checked: transactions.length, mismatches: mismatches.length }
        );
        return res.json({ success: true, data: run });
    } catch (error) {
        run.status = "FAILED";
        run.errorDetails = error.message;
        await run.save();
        return res.status(500).json({ success: false, message: "Revenue reconciliation failed" });
    }
};

/*
 * ─────────────────────────────────────────────────────────
 * REVENUE PAGE: money from Classgrid AI (owner approved, 2026-11-17)
 * GET /plans-summary, GET /payments, GET /payments/export
 *
 * What counts as money, and where it is read:
 * - A payment is an AiCreditTransaction of type "plan" (plan_key, plan_term) or "topup" (credits_added), written by
 *   the Razorpay webhook (routes/razorpay-webhook.routes.js) with status "success". This is the same meaning as the
 *   person page (super-admin.routes.js paymentRow and GET /users/:id/payments). Grants, revokes, pauses, resumes,
 *   extends and adjustments are admin actions with amount 0 and made-up ids: they are never money and never counted.
 * - amount_inr is used as stored. The webhook saves it as Razorpay's payment amount / 100, which is the full amount
 *   the person paid. Plan prices are GST included (PlanConfig: "rupees, GST included"), so every amount here includes
 *   GST; no GST is split out.
 * - "Money in" is every successful payment, including ones later refunded. Refunds are shown on their own.
 * - Refunds come from the refund rows the webhook writes in PlatformTransaction ("Refund of ₹X for payment pay_x"),
 *   read with the Transactions page's loadRefundMap, so both pages agree on what is refunded.
 * - Failed payments come from the same place as the Failed Payments page: PlatformTransaction rows with status
 *   "failed" that were a Classgrid AI checkout (billing-failures.controller.js loadAiFailures). That page looks at the
 *   newest 1,000 failed rows at most; "capped" says when that limit was reached.
 * - Days, today and this month are India days (Asia/Kolkata).
 * Organizations are never read here.
 * ─────────────────────────────────────────────────────────
 */

const REVENUE_TZ = "Asia/Kolkata";
const PAID_TYPES = ["plan", "topup"];
const PAID_STATUS = "success";
const MAIN_PLAN_KEYS = ["pro", "max"];
const REVENUE_KINDS = ["all", "pro", "max", "topup", "refunded", "failed"];
const REVENUE_DEFAULT_DAYS = 30;
const REVENUE_MAX_DAYS = 366;
const REVENUE_LIST_DEFAULT_LIMIT = 20;
const REVENUE_LIST_MAX_LIMIT = 100;
const REVENUE_EXPORT_MAX = 5000;
const REVENUE_SEARCH_MAX_CHARS = 100;
const REVENUE_SEARCH_MAX_USERS = 200;
const REVENUE_QUERY_MAX_MS = 15000;
const DAY_MS = 24 * 60 * 60 * 1000;

const revenueDayKey = new Intl.DateTimeFormat("en-CA", { timeZone: REVENUE_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

// The date a payment happened: Razorpay's payment time, else when the row was saved
const PAYMENT_DATE_EXPR = { $ifNull: ["$paymentTime", "$createdAt"] };

// "2026-11-17" plus n days, as a day key (UTC arithmetic on the calendar date, so no time zone shift)
function shiftDayKey(dayKey, days) {
    const [y, m, d] = dayKey.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(fromKey, toKey) {
    const [fy, fm, fd] = fromKey.split("-").map(Number);
    const [ty, tm, td] = toKey.split("-").map(Number);
    return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
}

// Reads ?from and ?to (India days). Both empty gives the last 30 days; only "from" runs to today (or to that day when
// it is in the future); only "to" starts 29 days before it. The range is one year at most.
function readRevenueRange(query = {}) {
    const fromText = queryText(query.from);
    const toText = queryText(query.to);
    if (fromText === null || toText === null) return { error: "Dates must look like 2026-11-17" };
    if ((fromText && !indiaDayBounds(fromText)) || (toText && !indiaDayBounds(toText))) {
        return { error: "Dates must look like 2026-11-17" };
    }
    const todayKey = revenueDayKey.format(new Date());
    let fromKey = fromText;
    let toKey = toText;
    if (!fromKey && !toKey) {
        toKey = todayKey;
        fromKey = shiftDayKey(todayKey, -(REVENUE_DEFAULT_DAYS - 1));
    } else if (fromKey && !toKey) {
        toKey = fromKey > todayKey ? fromKey : todayKey;
    } else if (!fromKey && toKey) {
        fromKey = shiftDayKey(toKey, -(REVENUE_DEFAULT_DAYS - 1));
    }
    if (fromKey > toKey) return { error: "The start date is after the end date" };
    if (daysBetween(fromKey, toKey) + 1 > REVENUE_MAX_DAYS) return { error: "Pick a range of one year or less" };
    return {
        fromKey,
        toKey,
        isDefault: !fromText && !toText,
        start: indiaDayBounds(fromKey).start,
        end: indiaDayBounds(toKey).end,
    };
}

function planDisplayName(key, plansByKey) {
    if (!key) return "Plan";
    return plansByKey.get(key)?.name || key.charAt(0).toUpperCase() + key.slice(1);
}

// The refunds of plan and top-up payments whose refund date is in [start, end]. A payment marked refunded without a
// refund amount (an older manual refund) counts in full, on its payment date, as the Transactions page shows it.
async function refundTotals(start, end) {
    const { refundMap, refundedPayIds } = await loadRefundMap();
    if (!refundedPayIds.length) return { count: 0, amountInr: 0 };
    const payments = await AiCreditTransaction.find({
        razorpay_payment_id: { $in: refundedPayIds },
        type: { $in: PAID_TYPES },
        status: PAID_STATUS,
    })
        .select("razorpay_payment_id amount_inr paymentTime createdAt")
        .maxTimeMS(REVENUE_QUERY_MAX_MS)
        .lean();

    let count = 0;
    let amountInr = 0;
    for (const payment of payments) {
        const paidInr = Math.abs(Number(payment.amount_inr) || 0);
        const entry = refundMap.get(payment.razorpay_payment_id);
        if (entry && entry.refunds.length) {
            let inRange = 0;
            let any = false;
            for (const refund of entry.refunds) {
                const at = refund.date ? new Date(refund.date) : null;
                if (at && at >= start && at <= end) {
                    inRange += refund.amountInr;
                    any = true;
                }
            }
            if (any) {
                count += 1;
                // Never more than was paid (Razorpay cannot refund more; this guards a doubled row)
                amountInr += paidInr > 0 ? Math.min(inRange, paidInr) : inRange;
            }
        } else {
            const at = new Date(payment.paymentTime || payment.createdAt);
            if (at >= start && at <= end) {
                count += 1;
                amountInr += paidInr;
            }
        }
    }
    return { count, amountInr: roundInr(amountInr) };
}

// GET /plans-summary?from=&to=
// moneyIn: today, this month and all time (never filtered). sources, daily, refunds and failed follow the range.
export const getPlansSummary = async (req, res) => {
    const range = readRevenueRange(req.query);
    if (range.error) return res.status(400).json({ success: false, message: range.error });
    try {
        const todayKey = revenueDayKey.format(new Date());
        const todayStart = indiaDayBounds(todayKey).start;
        const monthStart = indiaDayBounds(`${todayKey.slice(0, 7)}-01`).start;
        const paidMatch = { type: { $in: PAID_TYPES }, status: PAID_STATUS };

        const sumIf = (since, value) => ({ $sum: { $cond: [{ $gte: ["$date", since] }, value, 0] } });

        const [totalsResult, rangeResult, plans, refunds, failures] = await Promise.all([
            AiCreditTransaction.aggregate([
                { $match: paidMatch },
                { $project: { amount: { $ifNull: ["$amount_inr", 0] }, date: PAYMENT_DATE_EXPR } },
                {
                    $group: {
                        _id: null,
                        allAmount: { $sum: "$amount" },
                        allCount: { $sum: 1 },
                        monthAmount: sumIf(monthStart, "$amount"),
                        monthCount: sumIf(monthStart, 1),
                        todayAmount: sumIf(todayStart, "$amount"),
                        todayCount: sumIf(todayStart, 1),
                    },
                },
            ]).option({ maxTimeMS: REVENUE_QUERY_MAX_MS }),
            AiCreditTransaction.aggregate([
                { $match: paidMatch },
                {
                    $project: {
                        type: 1,
                        plan_key: 1,
                        plan_term: 1,
                        amount: { $ifNull: ["$amount_inr", 0] },
                        credits: { $ifNull: ["$credits_added", 0] },
                        date: PAYMENT_DATE_EXPR,
                    },
                },
                { $match: { date: { $gte: range.start, $lte: range.end } } },
                {
                    $facet: {
                        sources: [
                            {
                                $group: {
                                    _id: { type: "$type", plan: "$plan_key", term: "$plan_term" },
                                    amount: { $sum: "$amount" },
                                    count: { $sum: 1 },
                                    credits: { $sum: "$credits" },
                                },
                            },
                        ],
                        daily: [
                            {
                                $group: {
                                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: REVENUE_TZ } },
                                    amount: { $sum: "$amount" },
                                    count: { $sum: 1 },
                                },
                            },
                        ],
                    },
                },
            ]).option({ maxTimeMS: REVENUE_QUERY_MAX_MS }),
            PlanConfig.find({}).select("key name sort").maxTimeMS(REVENUE_QUERY_MAX_MS).lean(),
            refundTotals(range.start, range.end),
            loadAiFailures({ match: buildFailedMatch({ from: range.start, to: range.end }) }),
        ]);

        const totals = totalsResult[0] || {};
        const plansByKey = new Map(plans.map((plan) => [plan.key, plan]));
        const planSort = (key) => {
            const sort = Number(plansByKey.get(key)?.sort);
            return Number.isFinite(sort) ? sort : 1000;
        };

        // Where it came from: Pro and Max (monthly and yearly) always, any other plan that took money, then top-ups.
        // A plan row saved without plan_term gets its own line with no length.
        const groups = rangeResult[0]?.sources || [];
        const planGroups = new Map();
        const topup = { amountInr: 0, count: 0, credits: 0 };
        for (const group of groups) {
            if (group._id.type === "topup") {
                topup.amountInr += group.amount;
                topup.count += group.count;
                topup.credits += group.credits;
                continue;
            }
            const planKey = group._id.plan || "";
            const term = group._id.term === "month" || group._id.term === "year" ? group._id.term : null;
            const key = `${planKey}|${term || ""}`;
            const current = planGroups.get(key) || { planKey, term, amountInr: 0, count: 0 };
            current.amountInr += group.amount;
            current.count += group.count;
            planGroups.set(key, current);
        }
        for (const planKey of MAIN_PLAN_KEYS) {
            for (const term of ["month", "year"]) {
                const key = `${planKey}|${term}`;
                if (!planGroups.has(key)) planGroups.set(key, { planKey, term, amountInr: 0, count: 0 });
            }
        }
        const termOrder = { month: 0, year: 1 };
        const sources = [...planGroups.values()]
            .sort((a, b) =>
                planSort(a.planKey) - planSort(b.planKey)
                || a.planKey.localeCompare(b.planKey)
                || (termOrder[a.term] ?? 2) - (termOrder[b.term] ?? 2))
            .map((group) => ({
                key: `plan:${group.planKey}:${group.term || "none"}`,
                kind: "plan",
                planKey: group.planKey,
                planName: planDisplayName(group.planKey, plansByKey),
                term: group.term,
                amountInr: roundInr(group.amountInr),
                count: group.count,
                credits: null,
            }));
        sources.push({
            key: "topup",
            kind: "topup",
            planKey: null,
            planName: null,
            term: null,
            amountInr: roundInr(topup.amountInr),
            count: topup.count,
            credits: topup.credits,
        });

        // Money per day, with every day of the range present (0 on days without a payment)
        const byDay = new Map((rangeResult[0]?.daily || []).map((day) => [day._id, day]));
        const daily = [];
        for (let key = range.fromKey; key <= range.toKey; key = shiftDayKey(key, 1)) {
            const day = byDay.get(key);
            daily.push({ day: key, amountInr: roundInr(day?.amount || 0), count: day?.count || 0 });
        }

        const failedItems = failures.items || [];
        res.json({
            success: true,
            data: {
                moneyIn: {
                    today: { amountInr: roundInr(totals.todayAmount || 0), count: totals.todayCount || 0 },
                    month: { amountInr: roundInr(totals.monthAmount || 0), count: totals.monthCount || 0 },
                    allTime: { amountInr: roundInr(totals.allAmount || 0), count: totals.allCount || 0 },
                },
                range: { from: range.fromKey, to: range.toKey, isDefault: range.isDefault },
                sources,
                daily,
                refunds,
                failed: {
                    count: failedItems.length,
                    amountInr: roundInr(failedItems.reduce((sum, item) => sum + (Number(item.amountInr) || 0), 0)),
                    capped: Boolean(failures.capped),
                },
            },
        });
    } catch (error) {
        console.error("[Super Admin Revenue] summary failed:", error);
        res.status(500).json({ success: false, message: "Couldn't load revenue." });
    }
};

// Reads the list and CSV filters: search, kind, from, to. Dates are optional here (no dates = every payment).
function readRevenueListQuery(query = {}) {
    const kindText = queryText(query.kind);
    const kind = kindText || "all";
    if (kindText === null || !REVENUE_KINDS.includes(kind)) {
        return { error: "kind must be all, pro, max, topup, refunded or failed" };
    }
    const fromText = queryText(query.from);
    const toText = queryText(query.to);
    if (fromText === null || toText === null) return { error: "Dates must look like 2026-11-17" };
    const fromBounds = fromText ? indiaDayBounds(fromText) : null;
    const toBounds = toText ? indiaDayBounds(toText) : null;
    if ((fromText && !fromBounds) || (toText && !toBounds)) return { error: "Dates must look like 2026-11-17" };
    if (fromBounds && toBounds && fromBounds.start > toBounds.end) return { error: "The start date is after the end date" };
    // The search is cut to 100 characters here and regex-escaped before it is used
    const search = (queryText(query.search) || "").slice(0, REVENUE_SEARCH_MAX_CHARS).trim();
    return { kind, search, from: fromBounds?.start || null, to: toBounds?.end || null };
}

// validateBillingRequest already turns away page < 1 and limit outside 1 to 200; these clamp what is left
function revenueListLimit(value) {
    const limit = Number(value);
    if (value === undefined || !Number.isInteger(limit) || limit < 1) return REVENUE_LIST_DEFAULT_LIMIT;
    return Math.min(limit, REVENUE_LIST_MAX_LIMIT);
}

function revenueListPage(value) {
    const page = Number(value);
    return Number.isInteger(page) && page >= 1 ? Math.min(page, 100000) : 1;
}

// A failed Classgrid AI payment (an item of the Failed Payments page) in the same row shape as a paid one
function failedPaymentRow(item) {
    const purchase = item.purchase || {};
    const kind = purchase.kind === "plan" ? "plan" : purchase.kind === "credits" ? "topup" : "other";
    const linked = Boolean(item.person?.accountExists && item.person?.userId);
    return {
        id: String(item.id),
        source: "platform",
        kind,
        status: "failed",
        amountInr: Number(item.amountInr) || 0,
        refundedInr: 0,
        currency: "INR",
        razorpayPaymentId: item._draft?.row?.razorpayPaymentId || null,
        razorpayOrderId: item._orderId || null,
        date: item.failedAt || null,
        plan: kind === "plan"
            ? {
                key: purchase.planKey || "",
                name: purchase.planName || "Plan",
                term: purchase.term === "month" || purchase.term === "year" ? purchase.term : null,
                studentPrice: null,
                periodStart: null,
                periodEnd: null,
            }
            : null,
        credits: null,
        method: item.method || null,
        person: {
            userId: linked ? String(item.person.userId) : null,
            name: item.person?.name || "",
            email: item.person?.email || "",
            photoUrl: item.person?.profilePicture || null,
            linked,
        },
    };
}

// The paid (and refunded) payments in the Transactions page's common row shape, so toPaymentRows turns them into the
// same PaymentRow the website already reads
function paidRowsPipeline({ kind, from, to, searchOr, refundedPayIds }) {
    const first = { type: { $in: PAID_TYPES }, status: PAID_STATUS };
    if (kind === "pro" || kind === "max") {
        first.type = "plan";
        first.plan_key = kind;
    } else if (kind === "topup") {
        first.type = "topup";
    } else if (kind === "refunded") {
        first.razorpay_payment_id = { $in: refundedPayIds };
    }
    const stages = [
        { $match: first },
        {
            $project: {
                _id: 1,
                source: { $literal: "credits" },
                kind: "$type",
                paymentId: "$razorpay_payment_id",
                orderId: "$razorpay_order_id",
                amountInr: "$amount_inr",
                userId: 1,
                userName: 1,
                userEmail: 1,
                planKey: "$plan_key",
                term: "$plan_term",
                periodStart: "$plan_period_start",
                periodEnd: "$plan_period_end",
                credits: "$credits_added",
                method: "$paymentMethod",
                date: PAYMENT_DATE_EXPR,
            },
        },
    ];
    if (from || to) {
        const date = {};
        if (from) date.$gte = from;
        if (to) date.$lte = to;
        stages.push({ $match: { date } });
    }
    if (searchOr) stages.push({ $match: { $or: searchOr } });
    stages.push({
        $addFields: {
            status: { $cond: [{ $in: ["$paymentId", { $literal: refundedPayIds }] }, "refunded", "paid"] },
        },
    });
    return stages;
}

// One page of the payments list, newest first: paid, refunded and failed payments together
async function loadRevenuePayments(filters, { page, limit }) {
    const { kind, search, from, to } = filters;
    const withFailed = kind === "all" || kind === "failed";
    const withPaid = kind !== "failed";

    const rx = search ? new RegExp(escapeRegex(search), "i") : null;
    const [refundInfo, searchUsers, failures] = await Promise.all([
        withPaid ? loadRefundMap() : Promise.resolve({ refundMap: new Map(), refundedPayIds: [] }),
        withPaid && rx
            ? User.find({ $or: [{ name: rx }, { email: rx }] })
                .select("_id")
                .limit(REVENUE_SEARCH_MAX_USERS)
                .maxTimeMS(REVENUE_QUERY_MAX_MS)
                .lean()
            : Promise.resolve([]),
        withFailed ? loadAiFailures({ match: buildFailedMatch({ search, from, to }) }) : Promise.resolve({ items: [] }),
    ]);
    const failedItems = (failures.items || [])
        .slice()
        .sort((a, b) => new Date(b.failedAt || 0) - new Date(a.failedAt || 0));
    const skip = (page - 1) * limit;

    if (!withPaid) {
        return {
            rows: failedItems.slice(skip, skip + limit).map(failedPaymentRow),
            total: failedItems.length,
            capped: Boolean(failures.capped),
        };
    }

    const searchOr = rx
        ? [
            { userName: rx },
            { userEmail: rx },
            { paymentId: rx },
            { orderId: rx },
            { userId: { $in: searchUsers.map((user) => user._id) } },
        ]
        : null;
    const pipeline = paidRowsPipeline({ kind, from, to, searchOr, refundedPayIds: refundInfo.refundedPayIds });
    if (withFailed && failedItems.length) {
        // The failed rows join the same sort and paging; their details come from the Failed Payments items below
        pipeline.push({
            $unionWith: {
                coll: PlatformTransaction.collection.name,
                pipeline: [
                    { $match: { _id: { $in: failedItems.map((item) => item._draft.row._id) } } },
                    { $project: { _id: 1, source: { $literal: "failed" }, date: PAYMENT_DATE_EXPR } },
                ],
            },
        });
    }
    pipeline.push({
        $facet: {
            rows: [{ $sort: { date: -1, _id: -1 } }, { $skip: skip }, { $limit: limit }],
            total: [{ $count: "n" }],
        },
    });
    const [result] = await AiCreditTransaction.aggregate(pipeline)
        .allowDiskUse(true)
        .option({ maxTimeMS: REVENUE_QUERY_MAX_MS });

    const pageRows = result?.rows || [];
    const paidRows = await toPaymentRows(pageRows.filter((row) => row.source === "credits"), refundInfo.refundMap);
    const paidById = new Map(paidRows.map((row) => [row.id, row]));
    const failedById = new Map(failedItems.map((item) => [String(item.id), item]));
    const rows = pageRows
        .map((row) => {
            const id = String(row._id);
            if (row.source === "failed") {
                const item = failedById.get(id);
                return item ? failedPaymentRow(item) : null;
            }
            return paidById.get(id) || null;
        })
        .filter(Boolean);

    return { rows, total: result?.total?.[0]?.n || 0, capped: Boolean(failures.capped) };
}

// GET /payments?search=&kind=&from=&to=&page=&limit=
export const listRevenuePayments = async (req, res) => {
    const filters = readRevenueListQuery(req.query);
    if (filters.error) return res.status(400).json({ success: false, message: filters.error });
    try {
        const page = revenueListPage(req.query.page);
        const limit = revenueListLimit(req.query.limit);
        const { rows, total, capped } = await loadRevenuePayments(filters, { page, limit });
        res.json({
            success: true,
            data: rows,
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
            capped,
        });
    } catch (error) {
        console.error("[Super Admin Revenue] payments failed:", error);
        res.status(500).json({ success: false, message: "Couldn't load payments." });
    }
};

const REVENUE_CSV_HEADERS = [
    "Date", "Time", "Name", "Email", "What", "Length", "Credits", "Amount (₹)", "Refunded (₹)", "Paid with", "Status",
    "Razorpay payment id",
];

function revenueWhatLabel(row) {
    if (row.kind === "plan") return row.plan?.name || "Plan";
    if (row.kind === "topup") return "Credit top-up";
    return "Payment attempt";
}

function revenueStatusLabel(row) {
    if (row.status === "paid") return "Paid";
    if (row.status === "refunded") {
        return row.refundedInr > 0 && row.refundedInr < row.amountInr ? "Partly refunded" : "Refunded";
    }
    if (row.status === "failed") return "Failed";
    return "Not finished";
}

function revenueCsvLine(row) {
    return [
        fmtIndiaDay(row.date),
        fmtIndiaTime(row.date),
        row.person.name,
        row.person.email,
        revenueWhatLabel(row),
        row.plan?.term === "month" ? "1 month" : row.plan?.term === "year" ? "1 year" : "",
        row.credits === null || row.credits === undefined ? "" : row.credits,
        row.amountInr,
        row.refundedInr,
        paidWithLabel(row.method),
        revenueStatusLabel(row),
        row.razorpayPaymentId || "",
    ].map(csvCell).join(",");
}

// GET /payments/export?search=&kind=&from=&to= : the filtered list as CSV, the newest 5,000 payments at most
export const exportRevenuePayments = async (req, res) => {
    const filters = readRevenueListQuery(req.query);
    if (filters.error) return res.status(400).json({ success: false, message: filters.error });
    try {
        const { rows } = await loadRevenuePayments(filters, { page: 1, limit: REVENUE_EXPORT_MAX });
        // The BOM first so Excel reads the file as UTF-8 (the ₹ in the headers)
        const body = "\uFEFF" + [REVENUE_CSV_HEADERS.map(csvCell).join(","), ...rows.map(revenueCsvLine)].join("\r\n") + "\r\n";
        const fileName = `classgrid-revenue-${revenueDayKey.format(new Date())}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Cache-Control", "no-store");
        res.status(200).send(body);
    } catch (error) {
        console.error("[Super Admin Revenue] CSV failed:", error);
        res.status(500).json({ success: false, message: "Couldn't make the CSV." });
    }
};
