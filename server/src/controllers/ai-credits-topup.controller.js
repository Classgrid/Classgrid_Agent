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

export const createTopupOrder = async (req, res) => {
    let paymentOrder;
    let paymentAttempt;
    let handoff;
    
    try {
        const { amount_inr } = req.body;
        let organizationId = req.user.organization_id;

        if (!amount_inr || amount_inr < 1 || amount_inr > 10000) {
            return res.status(400).json({ success: false, error: "Amount must be between ₹1 and ₹10,000" });
        }

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
        const amountPaise = amount_inr * 100;
        const receiptId = `ai_${crypto.randomBytes(12).toString("hex")}`;
        const notes = {
            payment_type: "AI_TOPUP",
            organization_id: String(organizationId),
            user_id: String(req.user._id)
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
            payment_type: "AI_TOPUP",
            return_url: `${req.headers.origin || "https://app.classgrid.in"}?ai_payment=success`,
            clientIp: req.ip,
            userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
            context: { label: "AI Credits Top-Up", payerName: payerName, phone: organization.billing_settings?.phone || "" },
            expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
        });

        await sendTemplateEmail({
            templateName: "PAYMENT_OTP_SENT",
            to: handoff.email,
            userId: req.user._id,
            organizationId: organization._id,
            idempotencyKey: `ai-topup-otp:${handoff._id}`,
            data: {
                payer_name: payerName,
                otp,
                otp_expiry_minutes: 10,
                organization_name: organization.name,
                fee_name: "AI Credits Top-Up",
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
        console.error("AI Top-Up Error:", error);
        if (handoff) await BillingHandoff.findByIdAndUpdate(handoff._id, { expiresAt: new Date() }).catch(() => {});
        if (paymentAttempt) await PaymentAttempt.findByIdAndUpdate(paymentAttempt._id, { stage: PAYMENT_ATTEMPT_STAGE.FAILED }).catch(() => {});
        if (paymentOrder) await PaymentOrder.findByIdAndUpdate(paymentOrder._id, { status: "CANCELLED" }).catch(() => {});
        
        return res.status(500).json({ success: false, error: "Failed to initiate AI Top-Up" });
    }
};
