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

import express from "express";
import bcrypt from "bcryptjs";
import BillingHandoff from "../models/BillingHandoff.js";
import PaymentAttempt from "../models/PaymentAttempt.js";
import Organization from "../models/Organization.js";
import SaasInvoice from "../models/SaasInvoice.js";
import PaymentCounter from "../models/PaymentCounter.js";
import { detectFraud, parseUserAgent } from "../services/fraud.service.js";
import razorpayService from "../services/razorpay.service.js";
import { finalizeCapturedPayment } from "../services/billing-payment-finalization.service.js";
import { sendEmail, sendTemplateEmail } from "../services/aws-ses.service.js";
import { baseTemplate, getAiCreditUserReceiptHtml, getAiCreditAdminNotificationHtml } from "../services/email-templates.service.js";
import { generateInvoicePdfBuffer, generateAiReceiptPdfBuffer } from "../services/pdf-invoice.service.js";
import { generalLimiter } from "../middleware/rateLimiter.js";
import {
    formatPaise,
    handoffTokenCandidates,
    maskEmail,
} from "../services/billing-handoff.service.js";
import { PAYMENT_ATTEMPT_STAGE } from "../utils/billing.utils.js";

const router = express.Router();
router.use(generalLimiter);

function checkoutError(res, error) {
    const status = Number(error?.statusCode) || 500;
    if (status >= 500) console.error("[Billing Checkout]", error);
    return res.status(status).json({
        success: false,
        code: error?.code || "CHECKOUT_FAILED",
        error: status >= 500 ? "Unable to complete secure checkout" : error.message,
    });
}

function activeTokenQuery(rawToken, req) {
    return {
        token: { $in: handoffTokenCandidates(rawToken) },
        verified: false,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
        
        
    };
}

router.get("/session", async (req, res) => {
    try {
        const rawToken = req.query.token;
        if (!rawToken) return res.status(400).json({ success: false, error: "Token is required" });
        const handoff = await BillingHandoff.findOne(activeTokenQuery(rawToken, req)).lean();
        if (!handoff) return res.status(404).json({ success: false, error: "Invalid or expired session" });
        const organization = await Organization.findById(handoff.organization_id).select("name").lean();

        return res.json({
            success: true,
            data: {
                organizationName: organization?.name || "Organization",
                maskedEmail: maskEmail(handoff.email),
                email: handoff.email,
                amountPaise: handoff.amountPaise,
                currency: handoff.currency,
                paymentType: handoff.payment_type,
                label: handoff.context?.label || "Payment",
                expiresAt: handoff.expiresAt,
                otpVerified: Boolean(handoff.otpVerifiedAt),
            },
        });
    } catch (error) {
        return checkoutError(res, error);
    }
});

router.post("/verify-otp", async (req, res) => {
    try {
        const { token: rawToken, otp, payerName, payerEmail } = req.body;
        if (!rawToken || !/^\d{6}$/.test(String(otp || ""))) {
            return res.status(400).json({ success: false, error: "A valid token and 6-digit OTP are required" });
        }

        const handoff = await BillingHandoff.findOne(activeTokenQuery(rawToken, req)).select("+token +otp");
        if (!handoff) return res.status(404).json({ success: false, error: "Invalid or expired session" });
        if (handoff.otpVerifiedAt) {
            return res.status(409).json({ success: false, error: "OTP was already verified" });
        }
        if (handoff.lockoutUntil && handoff.lockoutUntil > new Date()) {
            return res.status(429).json({ success: false, error: "Too many failed attempts. Try again later." });
        }

        const isMatch = await bcrypt.compare(String(otp), handoff.otp);
        if (!isMatch) {
            const attempts = handoff.attempts + 1;
            await BillingHandoff.findByIdAndUpdate(handoff._id, {
                $set: {
                    attempts,
                    lockoutUntil: attempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null,
                },
            });
            return res.status(400).json({ success: false, error: "Invalid OTP" });
        }

        // Save user-provided name/email into context and email field
        const updateFields = {
            otp: "CONSUMED",
            otpVerifiedAt: new Date(),
            attempts: 0,
            lockoutUntil: null,
        };
        if (payerName) updateFields["context.payerName"] = payerName.trim();
        if (payerEmail) updateFields.email = payerEmail.trim();

        const verified = await BillingHandoff.findOneAndUpdate(
            { _id: handoff._id, otpVerifiedAt: null, consumedAt: null, verified: false },
            { $set: updateFields },
            { returnDocument: 'after' }
        );
        if (!verified) {
            return res.status(409).json({ success: false, error: "OTP was already consumed" });
        }
        await PaymentAttempt.findByIdAndUpdate(verified.paymentAttemptId, {
            stage: PAYMENT_ATTEMPT_STAGE.OTP_VERIFIED,
        });

        return res.json({
            success: true,
            data: {
                razorpay_order_id: verified.razorpay_order_id,
                razorpay_key_id: verified.razorpay_key_id,
                amountPaise: verified.amountPaise,
                currency: verified.currency,
                email: verified.email,
                return_url: verified.return_url,
            },
        });
    } catch (error) {
        return checkoutError(res, error);
    }
});

router.post("/confirm", async (req, res) => {
    try {
        const {
            token: rawToken,
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature,
        } = req.body;
        if (!rawToken || !paymentId || !orderId || !signature) {
            return res.status(400).json({ success: false, error: "Missing payment confirmation details" });
        }

        const handoff = await BillingHandoff.findOne({
            ...activeTokenQuery(rawToken, req),
            otpVerifiedAt: { $ne: null },
        }).select("+token +otp");
        if (!handoff) return res.status(404).json({ success: false, error: "Invalid, expired, or unverified session" });
        if (orderId !== handoff.razorpay_order_id) {
            return res.status(400).json({ success: false, code: "PAYMENT_ORDER_MISMATCH", error: "Payment order does not match this session" });
        }

        let signatureValid = false;
        let providerPayment;
        if (handoff.payment_type === "saas_invoice" || handoff.payment_type === "AI_TOPUP") {
            signatureValid = razorpayService.verifyPlatformSignature(orderId, paymentId, signature);
            if (signatureValid) providerPayment = await razorpayService.fetchPlatformPayment(paymentId);
        } else {
            const providerModule = handoff.payment_type === "canteen_order" ? "canteen" : "fees";
            signatureValid = await razorpayService.verifySignature(
                handoff.organization_id,
                orderId,
                paymentId,
                signature,
                providerModule
            );
            if (signatureValid) {
                providerPayment = await razorpayService.fetchPayment(handoff.organization_id, paymentId, providerModule);
            }
        }
        if (!signatureValid) {
            return res.status(400).json({ success: false, code: "INVALID_PAYMENT_SIGNATURE", error: "Invalid payment signature" });
        }
        if (!providerPayment || providerPayment.id !== paymentId) {
            return res.status(400).json({ success: false, code: "PAYMENT_NOT_FOUND", error: "Provider payment could not be verified" });
        }

        const finalized = await finalizeCapturedPayment({
            handoffId: handoff._id,
            providerPayment,
            requestContext: {
                ip: req.ip,
                requestId: req.headers["x-request-id"] || req.headers["x-correlation-id"] || null,
            },
        });

        const organization = await Organization.findById(handoff.organization_id).lean() || { name: handoff.context?.organizationName || "Organization" };
        const payerName = handoff.context?.payerName || "Payer";
        const orgName = organization?.name || "Organization";
        const amountFormatted = formatPaise(handoff.amountPaise, handoff.currency);
        const paidAt = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

        // Remove PaymentCounter ML stuff
        const txNumber = 1;
        const txTarget = 500;

        // Lookup payer's IP for Attempt Details in admin email
        const payerIp = req.ip || "Unknown";
        const payerDevice = parseUserAgent(req.headers["user-agent"]);
        let payerLocation = "Unknown Location";
        let payerIsp = "Unknown ISP";
        try {
            const ipInfo = await detectFraud(payerIp);
            payerLocation = `${ipInfo.city || "Unknown City"}, ${ipInfo.country || "Unknown Country"}`;
            payerIsp = ipInfo.isp || "Unknown ISP";
        } catch (_) { /* non-critical, ignore */ }
        const attemptTime = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';

        let attachments = [];
        try {
            if (handoff.payment_type === "AI_TOPUP") {
                const creditsAdded = (handoff.amountPaise / 100) * 5000;
                const pdfBuffer = await generateAiReceiptPdfBuffer({
                    amountFormatted,
                    creditsAdded,
                    paymentId: providerPayment.id,
                    paidAt: paidAt + " IST",
                    payerName,
                    payerEmail: handoff.email
                });
                
                attachments.push({
                    filename: `Classgrid_AI_Receipt_${providerPayment.id}.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf"
                });
                console.log(`[Billing Checkout] ✅ AI PDF receipt generated: ${providerPayment.id} (${pdfBuffer.length} bytes)`);
            } else {
                const invoice = await SaasInvoice.findById(handoff.referenceId).lean();
                if (invoice) {
                    const pdfBuffer = await generateInvoicePdfBuffer(invoice, organization);

                    attachments.push({
                        filename: `Classgrid_Invoice_${invoice.invoiceNumber}.pdf`,
                        content: pdfBuffer,
                        contentType: "application/pdf"
                    });
                    console.log(`[Billing Checkout] ✅ PDF receipt generated: ${invoice.invoiceNumber} (${pdfBuffer.length} bytes)`);
                } else {
                    console.warn("[Billing Checkout] No invoice found for referenceId:", handoff.referenceId);
                }
            }
        } catch (err) {
            console.error("[Billing Checkout] Failed to generate PDF for email attachment:", err.message, err.stack);
        }

        const emailTitle = `Payment Successful — ${amountFormatted} | Classgrid`;
        const adminEmailTitle = `New AI Credit Purchase: ${amountFormatted} from ${payerName}`;

        let creditsReceivedStr = "";
        if (handoff.payment_type === "AI_TOPUP") {
            const { calculateCreditsFromAmount } = await import("../services/ai-credits.service.js");
            const creditsAdded = await calculateCreditsFromAmount(handoff.amountPaise / 100);
            creditsReceivedStr = creditsAdded.toLocaleString();
        }
        
        const compiledHtml = getAiCreditUserReceiptHtml(payerName, amountFormatted, creditsReceivedStr, providerPayment.id, paidAt);
        
        const adminCompiledHtml = getAiCreditAdminNotificationHtml(
            payerName, 
            handoff.email, 
            amountFormatted, 
            creditsReceivedStr, 
            providerPayment.id, 
            payerDevice, 
            payerLocation, 
            payerIp, 
            attemptTime
        );

        // Send receipt to user (HTML-based email with beautiful template)
        await sendEmail({
            to: handoff.email,
            subject: emailTitle,
            fromName: "Classgrid Billing",
            fromEmail: "billing@classgrid.in",
            html: compiledHtml,
            attachments,
            userId: finalized.order.createdBy || null,
            organizationId: handoff.organization_id,
        }).catch((emailErr) => {
            console.warn("[Billing Checkout] Payment captured but confirmation email failed:", emailErr.message);
        });

        // Send separate admin notification
        sendEmail({
            to: "team@classgrid.in",
            subject: adminEmailTitle,
            fromName: "Classgrid Billing",
            fromEmail: "billing@classgrid.in",
            html: adminCompiledHtml,
        }).catch((emailErr) => {
            console.warn("[Billing Checkout] Admin notification email failed:", emailErr.message);
        });

        return res.json({
            success: true,
            data: {
                transactionId: finalized.transaction._id,
                providerPaymentId: providerPayment.id,
                return_url: handoff.return_url,
            },
        });
    } catch (error) {
        return checkoutError(res, error);
    }
});

router.post("/failed", async (req, res) => {
    try {
        const { token: rawToken, error_description } = req.body;
        if (!rawToken) {
            return res.status(400).json({ success: false, error: "Missing token" });
        }

        const handoff = await BillingHandoff.findOne({
            ...activeTokenQuery(rawToken, req)
        }).select("+token +otp").lean();
        
        if (!handoff) return res.status(404).json({ success: false, error: "Invalid session" });

        const organization = await Organization.findById(handoff.organization_id).lean() || { name: handoff.context?.organizationName || "Organization" };
        const payerName = handoff.context?.payerName || "Payer";
        const amountFormatted = formatPaise(handoff.amountPaise, handoff.currency);
        const attemptTime = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
        
        const payerIp = req.ip || "Unknown";
        const payerDevice = parseUserAgent(req.headers["user-agent"]);

        const adminEmailTitle = `[FAILED] AI Credit Purchase: ${amountFormatted} from ${payerName}`;
        const adminCompiledHtml = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #d97706;">Payment Failed or Cancelled</h2>
                <p><strong>Name:</strong> ${payerName}</p>
                <p><strong>Email:</strong> ${handoff.email}</p>
                <p><strong>Amount:</strong> ${amountFormatted}</p>
                <p><strong>Error:</strong> ${error_description || "User Cancelled"}</p>
                <p><strong>Time:</strong> ${attemptTime}</p>
                <p><strong>IP:</strong> ${payerIp}</p>
                <p><strong>Device:</strong> ${payerDevice}</p>
            </div>
        `;

        await sendEmail({
            to: "team@classgrid.in",
            subject: adminEmailTitle,
            fromName: "Classgrid Billing",
            fromEmail: "billing@classgrid.in",
            html: adminCompiledHtml,
        }).catch((emailErr) => {
            console.warn("[Billing Checkout] Admin failed notification email failed:", emailErr.message);
        });

        // Also send to the user if email is present
        if (handoff.email) {
            const userEmailTitle = `Payment Failed — ${amountFormatted} | Classgrid`;
            const userCompiledHtml = `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #d97706;">Payment Failed</h2>
                    <p>Hi ${payerName},</p>
                    <p>Your attempt to purchase ${amountFormatted} in AI credits was not successful.</p>
                    <p><strong>Reason:</strong> ${error_description || "Transaction cancelled."}</p>
                    <p>If you have any questions, please contact our support.</p>
                    <br/>
                    <p>Thanks,<br/>Classgrid Team</p>
                </div>
            `;
            await sendEmail({
                to: handoff.email,
                subject: userEmailTitle,
                fromName: "Classgrid Billing",
                fromEmail: "billing@classgrid.in",
                html: userCompiledHtml,
                organizationId: handoff.organization_id,
            }).catch((emailErr) => {
                console.warn("[Billing Checkout] User failed notification email failed:", emailErr.message);
            });
        }

        return res.json({ success: true });
    } catch (error) {
        return checkoutError(res, error);
    }
});

export default router;

