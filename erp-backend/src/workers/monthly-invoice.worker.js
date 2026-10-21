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

/**
 * Classgrid — Monthly Invoice Generator Worker
 *
 * Runs on the 1st of every month at 06:00 AM IST.
 * Aggregates all OrganizationUsageDaily records from the previous month,
 * generates a SaasInvoice for each active organization, and queues
 * an email notification to the Org Admin.
 *
 * Pay-As-You-Go: No free tier. They pay for exactly what they used.
 */

import nodeCron from "node-cron";
import mongoose from "mongoose";
import connectDB from "../../config/db.js";
import OrganizationUsageDaily from "../models/OrganizationUsageDaily.js";
import SaasInvoice from "../models/SaasInvoice.js";
import Organization from "../models/Organization.js";
import OrgSubscription from "../models/OrgSubscription.js";
import User from "../models/User.js";
import EmailJob from "../models/EmailJob.js";

const DEPT_ADMIN_ROLES = [
    "hod", "exam_controller", "fee_manager", "admission_head",
    "admission_verifier", "admission_counselor", "admission_clerk",
    "library_manager", "tpo_officer", "transport_manager", "counselor",
    "coordinator", "principal", "vice_principal",
];


function money(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function generateInvoiceNumber(orgName, month, year) {
    const orgSlug = String(orgName || "ORG")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 6);
    const monthStr = String(month).padStart(2, "0");
    return `CG-${orgSlug}-${year}${monthStr}`;
}

async function generateMonthlyInvoices({ month, year } = {}) {
    const now = new Date();
    // Default to last month
    const targetMonth = month || (now.getMonth() === 0 ? 12 : now.getMonth());
    const targetYear = year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

    const periodStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(targetYear, targetMonth, 1));

    console.log(`[MonthlyInvoice] Generating invoices for ${targetYear}-${String(targetMonth).padStart(2, "0")}`);

    // 1. Get all daily usage records for the billing period
    const dailyRecords = await OrganizationUsageDaily.find({
        day: { $gte: periodStart, $lt: periodEnd },
    }).lean();

    if (dailyRecords.length === 0) {
        console.log("[MonthlyInvoice] No usage records found for the billing period.");
        return { generated: 0, skipped: 0, errors: [] };
    }

    // 2. Group by organization
    const usageByOrg = new Map();
    dailyRecords.forEach((record) => {
        const orgId = record.organizationId.toString();
        if (!usageByOrg.has(orgId)) usageByOrg.set(orgId, []);
        usageByOrg.get(orgId).push(record);
    });

    // 3. Fetch org details
    const orgIds = [...usageByOrg.keys()].map((id) => new mongoose.Types.ObjectId(id));
    const [organizations, subscriptions] = await Promise.all([
        Organization.find({ _id: { $in: orgIds } }).select("_id name sidebar_name feature_flags").lean(),
        OrgSubscription.find({ organization_id: { $in: orgIds } }).select("_id organization_id billing").lean(),
    ]);

    const orgMap = new Map(organizations.map((o) => [o._id.toString(), o]));
    const subMap = new Map(
        subscriptions
            .filter((s) => s.organization_id)
            .map((s) => [s.organization_id.toString(), s])
    );

    const stats = { generated: 0, skipped: 0, emailed: 0, errors: [] };

    for (const [orgId, records] of usageByOrg.entries()) {
        try {
            const org = orgMap.get(orgId);
            const orgName = org?.sidebar_name || org?.name || "Unknown";

            // Check if invoice already exists for this period
            const existing = await SaasInvoice.findOne({
                organizationId: new mongoose.Types.ObjectId(orgId),
                "billingPeriod.year": targetYear,
                "billingPeriod.month": targetMonth,
            });
            if (existing) {
                stats.skipped += 1;
                continue;
            }

            // 4. Aggregate line items across all daily records
            const aggregated = new Map(); // resourceKey → { provider, label, quantity, unit, rate, amount }

            records.forEach((record) => {
                (record.lineItems || []).forEach((item) => {
                    const key = item.resourceKey;
                    const existing = aggregated.get(key) || {
                        provider: item.provider,
                        resourceLabel: item.resourceLabel,
                        totalQuantity: 0,
                        unit: item.unit,
                        unitRateInr: item.unitRateInr,
                        amountInr: 0,
                    };
                    existing.totalQuantity += item.quantity || 0;
                    existing.amountInr += item.amountInr || 0;
                    aggregated.set(key, existing);
                });
            });

            const lineItems = [...aggregated.values()].map((item) => ({
                provider: item.provider,
                resourceLabel: item.resourceLabel,
                totalQuantity: Number(item.totalQuantity.toFixed(4)),
                unit: item.unit,
                unitRatePaise: Math.round((item.unitRateInr || 0) * 100),
                amountPaise: Math.round(money(item.amountInr) * 100),
            }));

            const subtotalInr = money(lineItems.reduce((sum, item) => sum + (item.amountPaise / 100), 0));

            // Add base platform fee if configured
            const sub = subMap.get(orgId);
            const baseFee = Number(sub?.billing?.basePricePerMonth || 0);
            if (baseFee > 0) {
                lineItems.unshift({
                    provider: "classgrid",
                    resourceLabel: "Base platform fee",
                    totalQuantity: 1,
                    unit: "month",
                    unitRatePaise: Math.round(baseFee * 100),
                    amountPaise: Math.round(baseFee * 100),
                });
            }

            // Add enabled module fees
            const customPrices = sub?.billing?.modulePrices || {};
            const activeFlags = org?.feature_flags || {};
            Object.entries(activeFlags).forEach(([flagKey, isEnabled]) => {
                if (isEnabled && flagKey !== "erp_core" && !["dashboard_student", "dashboard_faculty", "dashboard_organization"].includes(flagKey)) {
                    const overridePrice = typeof customPrices.get === 'function' ? customPrices.get(flagKey) : customPrices[flagKey];
                    const price = Number(overridePrice !== undefined ? overridePrice : 0);
                    if (price > 0) {
                        lineItems.push({
                            provider: "classgrid",
                            resourceLabel: `Module: ${flagKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                            totalQuantity: 1,
                            unit: "month",
                            unitRatePaise: Math.round(price * 100),
                            amountPaise: Math.round(price * 100),
                        });
                    }
                }
            });

            const finalSubtotal = money(lineItems.reduce((sum, item) => sum + (item.amountPaise / 100), 0));
            const taxPercent = 18; // GST
            const taxAmountInr = money(finalSubtotal * (taxPercent / 100));
            const totalAmountInr = money(finalSubtotal + taxAmountInr);

            // Skip if total is ₹0 (no actual usage)
            if (totalAmountInr <= 0) {
                stats.skipped += 1;
                continue;
            }

            // 5. Create the invoice
            const dueDate = new Date(Date.UTC(targetYear, targetMonth, 5)); // Due on 5th of next month
            const invoiceNumber = generateInvoiceNumber(orgName, targetMonth, targetYear);

            await SaasInvoice.create({
                organizationId: new mongoose.Types.ObjectId(orgId),
                invoiceNumber,
                billingPeriod: {
                    month: targetMonth,
                    year: targetYear,
                    startDate: periodStart,
                    endDate: periodEnd,
                },
                lineItems,
                subtotalPaise: Math.round(finalSubtotal * 100),
                taxPercent,
                taxAmountPaise: Math.round(taxAmountInr * 100),
                totalAmountPaise: Math.round(totalAmountInr * 100),
                currency: "INR",
                status: "sent",
                dueDate,
            });

            stats.generated += 1;

            // 6. Queue email to Org Admin
            try {
                const orgAdmin = await User.findOne({
                    organization_id: new mongoose.Types.ObjectId(orgId),
                    role: { $in: ["org_admin", "admin"] },
                    status: "active",
                }).select("email name").lean();

                if (orgAdmin?.email) {
                    const monthName = new Date(targetYear, targetMonth - 1).toLocaleString("en-IN", { month: "long" });
                    await EmailJob.create({
                        to: orgAdmin.email,
                        subject: `Classgrid Invoice for ${monthName} ${targetYear} — ₹${totalAmountInr.toLocaleString("en-IN")}`,
                        html: `
                            <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #111827;">Your Classgrid Invoice is Ready</h2>
                                <p>Hi ${orgAdmin.name || "Admin"},</p>
                                <p>Your Classgrid usage invoice for <strong>${monthName} ${targetYear}</strong> has been generated.</p>
                                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                    <tr style="background: #f3f4f6;">
                                        <td style="padding: 12px; font-weight: 600;">Subtotal</td>
                                        <td style="padding: 12px; text-align: right;">₹${finalSubtotal.toLocaleString("en-IN")}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px;">GST (${taxPercent}%)</td>
                                        <td style="padding: 12px; text-align: right;">₹${taxAmountInr.toLocaleString("en-IN")}</td>
                                    </tr>
                                    <tr style="background: #34d399; color: white; font-weight: bold;">
                                        <td style="padding: 12px;">Total Due</td>
                                        <td style="padding: 12px; text-align: right;">₹${totalAmountInr.toLocaleString("en-IN")}</td>
                                    </tr>
                                </table>
                                <p>Please log in to your Classgrid dashboard and click <strong>"Pay Now"</strong> to complete the payment via Razorpay.</p>
                                <p style="color: #6b7280;">Due Date: ${dueDate.toLocaleDateString("en-IN")}</p>
                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                                <p style="color: #9ca3af; font-size: 12px;">This is an automated invoice from Classgrid. If you have questions, contact support@classgrid.in</p>
                            </div>
                        `,
                        text: `Your Classgrid invoice for ${monthName} ${targetYear} is ₹${totalAmountInr}. Please pay via your dashboard.`,
                        type: "other",
                        organizationId: new mongoose.Types.ObjectId(orgId),
                        userId: orgAdmin._id,
                    });
                    stats.emailed += 1;
                }
            } catch (emailErr) {
                console.error(`[MonthlyInvoice] Email queue error for org ${orgId}:`, emailErr.message);
            }
        } catch (err) {
            stats.errors.push({ orgId, error: err.message });
            console.error(`[MonthlyInvoice] Error for org ${orgId}:`, err.message);
        }
    }

    console.log(`[MonthlyInvoice] Done: generated=${stats.generated} skipped=${stats.skipped} emailed=${stats.emailed} errors=${stats.errors.length}`);
    return stats;
}

export function initMonthlyInvoiceWorker() {
    let isRunning = false;

    // Runs on the 1st of every month at 06:00 AM IST
    nodeCron.schedule("0 6 1 * *", async () => {
        if (isRunning) return;
        isRunning = true;

        try {
            await connectDB();
            const result = await generateMonthlyInvoices();
            console.log(
                `[MonthlyInvoice] worker complete: generated=${result.generated} skipped=${result.skipped} emailed=${result.emailed}`
            );
        } catch (err) {
            console.error("[MonthlyInvoice] worker error:", err.message);
        } finally {
            isRunning = false;
        }
    }, { timezone: "Asia/Kolkata" });

    console.log("📧 Monthly invoice generator worker initialized.");
}

export { generateMonthlyInvoices };
