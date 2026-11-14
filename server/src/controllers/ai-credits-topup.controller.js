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
import crypto from "crypto";
import bcrypt from "bcryptjs";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import PaymentOrder from "../models/PaymentOrder.js";
import PaymentAttempt from "../models/PaymentAttempt.js";
import BillingHandoff from "../models/BillingHandoff.js";
import razorpayService from "../services/razorpay.service.js";
import { sendTemplateEmail } from "../services/aws-ses.service.js";
import {
    HANDOFF_TTL_MS,
    formatPaise,
    hashHandoffToken,
} from "../services/billing-handoff.service.js";
import { PAYMENT_ATTEMPT_STAGE } from "../utils/billing.utils.js";

export const TOPUP_MIN_INR = 299;
export const TOPUP_MAX_INR = 10000;
// Owner's order: this one account can top up from ₹1 (everyone else starts at ₹299).
export const TOPUP_LOW_MIN_EMAILS = ["nikhilsubsun123@gmail.com"];
export const topupMinFor = (email) => TOPUP_LOW_MIN_EMAILS.includes(String(email || "").trim().toLowerCase()) ? 1 : TOPUP_MIN_INR;

/**
 * PHASE 12: Backend AI Top-Up Controller
 * Initiates the payment session for buying AI credits and safely hands it 
 * off to the unified billing.classgrid.in portal.
 */

function checkoutUrl(rawToken) {
    const base = process.env.BILLING_PORTAL_URL || "https://billing.classgrid.in";
    const url = new URL("/checkout", base);
    url.searchParams.set("token", rawToken);
    return url.toString();
}

// One payment through the platform Razorpay account and billing.classgrid.in: a Razorpay order, the billing rows, an
// OTP email, and the checkout link. Used by AI top-ups (payment_type AI_TOPUP) and plan purchases (AI_PLAN).
async function startPlatformPayment(req, res, { amountInr, paymentType, label, notes: extraNotes = {}, otpKeyPrefix, returnUrl = null }) {
    let paymentOrder;
    let paymentAttempt;
    let handoff;
    try {
        let organizationId = req.user.organization_id;

        // Fallback for Super Admins who don't have an organization_id attached directly
        let organization = null;
        if (organizationId) {
            organization = await Organization.findById(organizationId).select("name billing_settings").lean();
        } else if (req.user.role === "super_admin") {
            organization = await Organization.findOne({ name: /Classgrid/i, status: "active" }).sort({ createdAt: 1 }).select("name billing_settings").lean();
            if (organization) {
                organizationId = organization._id;
            }
        }

        if (!organization) {
            return res.status(404).json({ success: false, error: "Organization not found" });
        }

        // Amount in paise
        const amountPaise = Math.round(amountInr * 100);
        const receiptId = `ai_${crypto.randomBytes(12).toString("hex")}`;
        const notes = {
            payment_type: paymentType,
            organization_id: String(organizationId),
            user_id: String(req.user._id),
            ...extraNotes,
        };

        // Create Razorpay Order on Platform Account
        const providerOrder = await razorpayService.createPlatformOrderPaise(amountPaise, receiptId, notes);

        // Track in standard Billing Collections (for Phase 21 Dashboard visibility)
        paymentOrder = await PaymentOrder.create({
            organizationId,
            paymentFlow: "CLASSGRID_SUBSCRIPTION",
            merchantType: "CLASSGRID",
            amountPaise: amountPaise,
            currency: "INR",
            providerOrderId: providerOrder.id,
            receiptId,
            status: "CREATED",
            createdBy: req.user._id,
        });

        paymentAttempt = await PaymentAttempt.create({
            paymentOrderId: paymentOrder._id,
            organizationId,
            stage: PAYMENT_ATTEMPT_STAGE.OTP_PENDING,
            amountPaise: amountPaise,
            ipAddress: req.ip,
            userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
            createdBy: req.user._id,
        });

        const billingEmail = organization.billing_settings?.invoice_email || req.user.email;
        const payerName = req.user.name || "Payer";

        const otp = crypto.randomInt(100000, 1000000).toString();
        const rawToken = crypto.randomBytes(64).toString("base64url");

        handoff = await BillingHandoff.create({
            token: hashHandoffToken(rawToken),
            email: billingEmail,
            otp: await bcrypt.hash(otp, 12),
            organization_id: organizationId,
            paymentOrderId: paymentOrder._id,
            paymentAttemptId: paymentAttempt._id,
            referenceId: paymentOrder._id,
            referenceModel: "SaasInvoice", // Placeholder until success webhook creates the actual AiCreditTransaction
            razorpay_order_id: providerOrder.id,
            amountPaise: amountPaise,
            currency: "INR",
            razorpay_key_id: process.env.RAZORPAY_KEY_ID, // Platform Key
            payment_type: paymentType,
            // From the desktop app (its screens are served at 127.0.0.1:47821): after paying, the browser opens the
            // app again with a classgrid:// link instead of loading the app's screens in a browser tab
            return_url: /^http:\/\/(127\.0\.0\.1|localhost):47821$/.test(String(req.headers.origin || "")) || req.body?.clientApp === "desktop"
                ? "classgrid://payment"
                : (returnUrl || `${req.headers.origin || "https://app.classgrid.in"}?ai_payment=success`),
            clientIp: req.ip,
            userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
            context: { label, payerName: payerName, phone: organization.billing_settings?.phone || "" },
            expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
        });

        await sendTemplateEmail({
            templateName: "PAYMENT_OTP_SENT",
            to: handoff.email,
            userId: req.user._id,
            organizationId: organization._id,
            idempotencyKey: `${otpKeyPrefix}:${handoff._id}`,
            data: {
                payer_name: payerName,
                otp,
                otp_expiry_minutes: 10,
                organization_name: organization.name,
                fee_name: label,
                amount: formatPaise(handoff.amountPaise, handoff.currency),
            },
        });

        return res.status(201).json({
            success: true,
            data: {
                checkout_url: checkoutUrl(rawToken),
                expiresAt: handoff.expiresAt,
            },
        });
    } catch (error) {
        console.error(`${label} payment error:`, error);
        if (handoff) await BillingHandoff.findByIdAndUpdate(handoff._id, { expiresAt: new Date() }).catch(() => {});
        if (paymentAttempt) await PaymentAttempt.findByIdAndUpdate(paymentAttempt._id, { stage: PAYMENT_ATTEMPT_STAGE.FAILED }).catch(() => {});
        if (paymentOrder) await PaymentOrder.findByIdAndUpdate(paymentOrder._id, { status: "CANCELLED" }).catch(() => {});

        return res.status(500).json({ success: false, error: `Failed to start the ${label} payment` });
    }
}

export const createTopupOrder = async (req, res) => {
    const { amount_inr } = req.body;
    const minInr = topupMinFor(req.user.email);
    if (!amount_inr || amount_inr < minInr || amount_inr > TOPUP_MAX_INR) {
        return res.status(400).json({ success: false, error: `Amount must be between ₹${minInr} and ₹10,000` });
    }
    return startPlatformPayment(req, res, { amountInr: amount_inr, paymentType: "AI_TOPUP", label: "AI Credits Top-Up", otpKeyPrefix: "ai-topup-otp" });
};

// A plan bought for one month or one year, paid once (no autopay): the webhook (AI_PLAN) puts the plan on the user.
// Plans must be on, the plan must be public and not "coming soon", and its price for the term must be above zero.
export const buyPlan = async (req, res) => {
    try {
        const { plansEnabled } = await import("../services/plan-limits.service.js");
        const { default: PlanConfig } = await import("../models/PlanConfig.js");
        if (!(await plansEnabled())) return res.status(400).json({ success: false, error: "Plans are not open yet." });
        const key = String(req.body?.plan || "").toLowerCase();
        const term = req.body?.term === "year" ? "year" : "month";
        const student = req.body?.student === true;
        const plan = await PlanConfig.findOne({ key }).lean();
        if (!plan || !plan.is_public || plan.coming_soon || key === "free") return res.status(400).json({ success: false, error: "This plan can't be bought here." });
        const priceField = (student ? "student_" : "") + (term === "year" ? "price_inr_yearly" : "price_inr_monthly");
        const amountInr = Number(plan[priceField]);
        if (!Number.isFinite(amountInr) || amountInr <= 0) return res.status(400).json({ success: false, error: "This plan has no price for that term." });
        const label = `Classgrid ${plan.name} plan (${term === "year" ? "1 year" : "1 month"})`;
        // After paying: back to classgrid.in/pricing when the plan was picked there (returnTo "pricing"), else to the
        // chat that started it, with the plan's key so the chat can say "Subscribed"
        const pricingUrl = String(process.env.PRICING_PAGE_URL || "https://classgrid.in/pricing");
        const origin = String(req.headers.origin || "https://chat.classgrid.in");
        const returnUrl = req.body?.returnTo === "pricing"
            ? `${pricingUrl}?subscribed=${encodeURIComponent(key)}&term=${term}`
            : `${origin}?ai_payment=success&plan=${encodeURIComponent(key)}`;
        return startPlatformPayment(req, res, {
            amountInr, paymentType: "AI_PLAN", label, otpKeyPrefix: "ai-plan-otp", returnUrl,
            notes: { plan_key: key, plan_term: term, plan_student: student ? "1" : "0", amount_inr: String(amountInr) },
        });
    } catch (error) {
        console.error("buyPlan error:", error);
        return res.status(500).json({ success: false, error: "Failed to start the plan payment" });
    }
};
