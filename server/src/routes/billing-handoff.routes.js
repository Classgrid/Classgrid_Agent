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

import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import BillingHandoff from "../models/BillingHandoff.js";
import PaymentOrder from "../models/PaymentOrder.js";
import PaymentAttempt from "../models/PaymentAttempt.js";
import Organization from "../models/Organization.js";
import { sendTemplateEmail } from "../services/aws-ses.service.js";
import razorpayService from "../services/razorpay.service.js";
import { generalLimiter } from "../middleware/rateLimiter.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import {
    HANDOFF_TTL_MS,
    MAX_OTP_RESENDS,
    OTP_RESEND_COOLDOWN_MS,
    formatPaise,
    handoffTokenCandidates,
    hashHandoffToken,
    resolvePayable,
    validateReturnUrl,
} from "../services/billing-handoff.service.js";
import { PAYMENT_ATTEMPT_STAGE } from "../utils/billing.utils.js";

const router = express.Router();

function publicError(res, error) {
    const status = Number(error?.statusCode) || 500;
    if (status >= 500) console.error("[Billing Handoff]", error);
    return res.status(status).json({
        success: false,
        code: error?.code || "BILLING_HANDOFF_FAILED",
        error: status >= 500 ? "Unable to start secure checkout" : error.message,
    });
}

function referenceFromBody(body) {
    return body.reference_id
        || body.referenceId
        || body.context?.invoiceId
        || body.context?.feeRecordId
        || body.context?.orderId;
}

function checkoutUrl(rawToken) {
    const base = process.env.BILLING_PORTAL_URL || "https://billing.classgrid.in";
    const url = new URL("/checkout", base);
    url.searchParams.set("token", rawToken);
    return url.toString();
}

function frontendKeyId(organization, providerModule) {
    if (providerModule === "platform") return process.env.RAZORPAY_KEY_ID;
    if (providerModule === "canteen") return organization.canteen_config?.canteen_razorpay_key_id;
    return organization.fees_razorpay_key_id;
}

async function sendOtp({ handoff, otp, organization, user, label, idempotencyKey }) {
    return sendTemplateEmail({
        templateName: "PAYMENT_OTP_SENT",
        to: handoff.email,
        userId: user?._id || null,
        organizationId: organization._id,
        idempotencyKey,
        data: {
            payer_name: user?.name || "Payer",
            otp,
            otp_expiry_minutes: 10,
            organization_name: organization.name,
            fee_name: label,
            amount: formatPaise(handoff.amountPaise, handoff.currency),
        },
    });
}

/**
 * Creates a checkout only from a server-resolved payable. Client-provided
 * amount, recipient email, merchant account, and arbitrary context are ignored.
 */
router.post("/initiate", generalLimiter, isAuthenticated, async (req, res) => {
    let paymentOrder;
    let paymentAttempt;
    let handoff;
    try {
        const organizationId = req.body.organization_id || req.body.organizationId;
        const paymentType = req.body.payment_type || req.body.paymentType;
        const referenceId = referenceFromBody(req.body);

        const organization = await Organization.findById(organizationId)
            .select("name subdomain custom_domain erp_domain fees_razorpay_key_id canteen_config.canteen_razorpay_key_id billing_settings address org_type")
            .lean();
        if (!organization) {
            return res.status(404).json({ success: false, code: "ORGANIZATION_NOT_FOUND", error: "Organization not found" });
        }

        const payable = await resolvePayable({
            organizationId,
            paymentType,
            referenceId,
            user: req.user,
        });
        const safeReturnUrl = validateReturnUrl(req.body.return_url || req.body.returnUrl, organization);

        const existingOrder = await PaymentOrder.findOne({
            organizationId,
            referenceId: payable.referenceId,
            status: { $in: ["CREATED", "ATTEMPTED"] },
        }).select("_id").lean();
        if (existingOrder) {
            return res.status(409).json({
                success: false,
                code: "PAYMENT_ALREADY_IN_PROGRESS",
                error: "A payment session for this item is already active",
            });
        }

        const receiptId = `cg_${crypto.randomBytes(12).toString("hex")}`;
        const notes = {
            payment_type: paymentType,
            organization_id: String(organizationId),
            reference_id: String(payable.referenceId),
        };
        const providerOrder = payable.providerModule === "platform"
            ? await razorpayService.createPlatformOrderPaise(payable.amountPaise, receiptId, notes)
            : await razorpayService.createOrderPaise(
                organizationId,
                payable.amountPaise,
                payable.currency,
                receiptId,
                payable.providerModule,
                notes
            );

        paymentOrder = await PaymentOrder.create({
            organizationId,
            invoiceId: payable.invoiceId,
            referenceId: payable.referenceId,
            paymentFlow: payable.paymentFlow,
            merchantType: payable.merchantType,
            merchantOrganizationId: payable.merchantOrganizationId,
            amountPaise: payable.amountPaise,
            currency: payable.currency,
            providerOrderId: providerOrder.id,
            receiptId,
            status: "CREATED",
            createdBy: req.user._id,
        });
        paymentAttempt = await PaymentAttempt.create({
            paymentOrderId: paymentOrder._id,
            organizationId,
            stage: PAYMENT_ATTEMPT_STAGE.OTP_PENDING,
            amountPaise: payable.amountPaise,
            ipAddress: req.ip,
            
            createdBy: req.user._id,
        });

        const billingEmail = organization.billing_settings?.invoice_email || req.user.email;
        const payerName = organization.billing_settings?.billing_contact_name || req.user.name || "Payer";

        const otp = crypto.randomInt(100000, 1000000).toString();
        // Generating a highly secure 512-bit (64-byte) cryptographic token. This is NOT a MongoDB ID.
        const rawToken = crypto.randomBytes(64).toString("base64url");
        handoff = await BillingHandoff.create({
            token: hashHandoffToken(rawToken),
            email: billingEmail,
            otp: await bcrypt.hash(otp, 12),
            organization_id: organizationId,
            paymentOrderId: paymentOrder._id,
            paymentAttemptId: paymentAttempt._id,
            referenceId: payable.referenceId,
            referenceModel: payable.referenceModel,
            razorpay_order_id: providerOrder.id,
            amountPaise: payable.amountPaise,
            currency: payable.currency,
            razorpay_key_id: frontendKeyId(organization, payable.providerModule),
            payment_type: paymentType,
            return_url: safeReturnUrl,
            
            
            context: { label: payable.label, payerName: payerName, phone: organization.billing_settings?.phone || "" },
            expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
        });

        await sendOtp({
            handoff,
            otp,
            organization,
            user: req.user,
            label: payable.label,
            idempotencyKey: `payment-otp:${handoff._id}:initial`,
        });

        return res.status(201).json({
            success: true,
            data: {
                checkout_url: checkoutUrl(rawToken),
                expiresAt: handoff.expiresAt,
            },
        });
    } catch (error) {
        if (handoff) {
            await BillingHandoff.findByIdAndUpdate(handoff._id, { expiresAt: new Date(), consumedAt: new Date() }).catch(() => { });
        }
        if (paymentAttempt) {
            await PaymentAttempt.findByIdAndUpdate(paymentAttempt._id, { stage: PAYMENT_ATTEMPT_STAGE.FAILED }).catch(() => { });
        }
        if (paymentOrder) {
            await PaymentOrder.findByIdAndUpdate(paymentOrder._id, { status: "CANCELLED" }).catch(() => { });
        }
        return publicError(res, error);
    }
});

router.post("/resend-otp", generalLimiter, async (req, res) => {
    try {
        const rawToken = req.body.token;
        if (!rawToken) return res.status(400).json({ success: false, error: "Token is required" });

        const handoff = await BillingHandoff.findOne({
            token: { $in: handoffTokenCandidates(rawToken) },
            verified: false,
            consumedAt: null,
            expiresAt: { $gt: new Date() },
            
            
        }).select("+token +otp");
        if (!handoff) return res.status(404).json({ success: false, error: "Invalid or expired session" });
        if (handoff.resendCount >= MAX_OTP_RESENDS) {
            return res.status(429).json({ success: false, error: "OTP resend limit reached" });
        }
        if (handoff.lastOtpSentAt && Date.now() - handoff.lastOtpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
            return res.status(429).json({ success: false, error: "Wait before requesting another code" });
        }

        const organization = await Organization.findById(handoff.organization_id).select("name").lean();
        if (!organization) return res.status(404).json({ success: false, error: "Organization not found" });

        const otp = crypto.randomInt(100000, 1000000).toString();
        handoff.otp = await bcrypt.hash(otp, 12);
        handoff.attempts = 0;
        handoff.lockoutUntil = null;
        handoff.resendCount += 1;
        handoff.lastOtpSentAt = new Date();
        await handoff.save();

        await sendOtp({
            handoff,
            otp,
            organization,
            user: { _id: null, name: handoff.context?.payerName },
            label: handoff.context?.label || "Payment",
            idempotencyKey: `payment-otp:${handoff._id}:resend:${handoff.resendCount}`,
        });

        return res.json({ success: true, message: "OTP resent successfully" });
    } catch (error) {
        return publicError(res, error);
    }
});

export default router;
