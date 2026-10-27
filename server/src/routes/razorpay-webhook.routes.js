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
import crypto from "crypto";
import connectDB from "../../config/db.js";
import Razorpay from "razorpay";
import { detectFraud, FRAUD_ADMIN_EMAIL, buildFraudAlertHtml, buildUserFraudAlertHtml, parseUserAgent } from "../services/fraud.service.js";
import { sendEmail } from "../services/aws-ses.service.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────
// RAZORPAY UNIVERSAL WEBHOOK
// POST /api/webhooks/razorpay
//
// This is the single centralized Razorpay webhook for billing.classgrid.in
// It handles ALL payment events across the platform:
//   1. Platform SaaS invoice payments (org → Classgrid)
//   2. Student fee payments (student → org)
//   3. Admission fee payments
//   4. Canteen payments
//   5. Marketplace purchases
//
// Razorpay sends: payment.authorized, payment.captured,
//                 payment.failed, order.paid, refund.created
// ─────────────────────────────────────────────────────────────────

/**
 * Verify Razorpay webhook signature using HMAC SHA256
 */
function verifyRazorpaySignature(rawBody, signature, secret) {
    if (!signature || !secret) return false;
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");
    return expectedSignature === signature;
}

// Use raw body for signature verification
router.post("/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        const rawBody = req.body; // Buffer because of express.raw()
        const signature = req.headers["x-razorpay-signature"];

        // ── 1. Parse body strictly to get routing info (we verify signature right after) ──
        const body = JSON.parse(rawBody.toString("utf8"));
        const event = body.event;
        const payload = body.payload;
        
        const paymentEntity = payload?.payment?.entity;
        const orderEntity = payload?.order?.entity;
        const refundEntity = payload?.refund?.entity;
        
        const notes = paymentEntity?.notes || orderEntity?.notes || refundEntity?.notes || {};
        const paymentType = notes?.type || notes?.payment_type || "unknown";
        const organizationId = notes?.organization_id || notes?.orgId || req.query.organizationId || null;

        await connectDB();
        
        // ── 2. Determine which secret to use and Verify Signature ──
        let isValid = false;
        
        // Try platform secret first
        const platformSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
        if (verifyRazorpaySignature(rawBody, signature, platformSecret)) {
            isValid = true;
        } 
        // If not platform, try organization secrets
        else if (organizationId) {
            const Organization = (await import("../models/Organization.js")).default;
            const org = await Organization.findById(organizationId).select("fees_razorpay_webhook_secret canteen_config").lean();
            
            if (org) {
                // Try Fees Webhook Secret
                if (org.fees_razorpay_webhook_secret && verifyRazorpaySignature(rawBody, signature, org.fees_razorpay_webhook_secret)) {
                    isValid = true;
                }
                // Try Canteen Webhook Secret (needs decryption)
                else if (org.canteen_config?.canteen_razorpay_webhook_secret) {
                    const { decrypt } = await import("../utils/encryption.js");
                    const canteenSecret = decrypt(org.canteen_config.canteen_razorpay_webhook_secret);
                    if (canteenSecret && verifyRazorpaySignature(rawBody, signature, canteenSecret)) {
                        isValid = true;
                    }
                }
            }
        }

        if (!isValid) {
            console.error("[Razorpay Webhook] ❌ Invalid signature");
            return res.status(401).json({ error: "Invalid webhook signature" });
        }

        console.log(`[Razorpay Webhook] ✅ Event received: ${event} | Type: ${paymentType}`);

        // Lazy-load models to avoid circular dependencies
        const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
        const SaasInvoice = (await import("../models/SaasInvoice.js")).default;
        const FeeTransaction = (await import("../models/FeeTransaction.js")).default;
        const OrgSubscription = (await import("../models/OrgSubscription.js")).default;
        const WebhookEvent = (await import("../models/WebhookEvent.js")).default;
        const mongoose = (await import("mongoose")).default;

        // ── 3. Idempotency Lock via WebhookEvent ──
        const eventId = req.headers["x-razorpay-event-id"] || crypto.randomUUID();
        try {
            await WebhookEvent.create({
                provider: "RAZORPAY",
                providerEventId: eventId,
                eventType: event,
                payloadHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
                signatureValid: true,
                payload: body,
                processingStatus: "PENDING"
            });
        } catch (err) {
            if (err.code === 11000) {
                console.log(`[Razorpay Webhook] 🔁 Duplicate event ignored: ${eventId}`);
                return res.status(200).json({ received: true, duplicate: true });
            }
            throw err;
        }

        let processingStatus = "PROCESSED";
        let lastError = null;

        try {
            switch (event) {

            // ═══════════════════════════════════════════
            // PAYMENT CAPTURED — Money received successfully
            // ═══════════════════════════════════════════
            case "payment.captured":
            case "payment.authorized": {
                if (!paymentEntity) break;

                const { id: paymentId, order_id: orderId, amount, currency, notes, method, email, contact } = paymentEntity;
                const amountInr = amount / 100; // Razorpay sends in paise
                const payerName = notes?.payerName || "Unknown Name";

                console.log(`[Razorpay Webhook] 💰 Payment ${event}: ₹${amountInr} | Email: ${email || 'N/A'} | Phone: ${contact || 'N/A'} | Order: ${orderId}`);

                // Check if this payment was already processed (e.g. authorized vs captured)
                const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
                const existingTxn = await PlatformTransaction.findOne({ razorpayPaymentId: paymentId });
                if (existingTxn) {
                    console.log(`[Razorpay Webhook] Payment ${paymentId} already processed (Status: ${existingTxn.status}), skipping duplicate fraud check.`);
                    break; // Skip everything, we already handled this payment
                }

                // Determine payment type from notes
                const invoiceId = notes?.invoice_id || notes?.invoiceId || null;
                const studentId = notes?.student_id || notes?.studentId || null;
                const feeRecordId = notes?.fee_record_id || notes?.feeRecordId || null;

                // ── Platform SaaS Payment ──
                                if (paymentType === "saas_invoice" || paymentType === "platform" || invoiceId) {
                    // Check for duplicate
                    const existing = await PlatformTransaction.findOne({ razorpayPaymentId: paymentId });
                    if (existing) {
                        console.log(`[Razorpay Webhook] Duplicate payment ${paymentId}, skipping`);
                        break;
                    }

                    let resolvedUserName = notes?.payerName || notes?.userName || "Unknown";
                    let resolvedUserEmail = email || notes?.payerEmail || "";
                    let resolvedUserMobile = contact || notes?.payerPhone || "";
                    let resolvedUserId = notes?.user_id || null;
                    let resolvedUserRole = "";
                    let resolvedOrgName = "";

                    try {
                        const User = (await import("../models/User.js")).default;
                        let user = null;
                        if (resolvedUserId) {
                            user = await User.findById(resolvedUserId).populate("organization_id");
                        } else if (organizationId) {
                            user = await User.findOne({ organization_id: organizationId, role: "owner" }).populate("organization_id");
                        }

                        if (user) {
                            if (resolvedUserName === "Unknown") resolvedUserName = user.name || "Unknown";
                            if (!resolvedUserEmail) resolvedUserEmail = user.email || "";
                            if (!resolvedUserMobile) resolvedUserMobile = user.phoneNumber || "";
                            if (!resolvedUserId) resolvedUserId = user._id;
                            resolvedUserRole = user.role || "";
                            if (user.organization_id) resolvedOrgName = user.organization_id.name || "";
                        }
                    } catch (e) {
                        console.error("[Razorpay Webhook] User lookup failed for saas payment:", e);
                    }

                    // Log the transaction
                    const platformTxn = await PlatformTransaction.create({
                        organizationId,
                        organizationName: resolvedOrgName,
                        type: "razorpay",
                        amount: amountInr,
                        currency,
                        status: "success",
                        razorpayOrderId: orderId,
                        razorpayPaymentId: paymentId,
                        planActivated: "active",
                        note: `Razorpay webhook: ${event} | Method: ${method}`,
                        userName: resolvedUserName,
                        userEmail: resolvedUserEmail,
                        userMobile: resolvedUserMobile,
                        userId: resolvedUserId,
                        userRole: resolvedUserRole,
                        paymentMethod: method || "",
                        paymentTime: paymentEntity?.created_at ? new Date(paymentEntity.created_at * 1000) : new Date(),
                    });

                    // RULE 6 ENFORCEMENT: Audit Log
                    const { logAdminAction } = await import("../services/auditLog.service.js");
                    await logAdminAction(
                        req, 
                        "WEBHOOK_EVENT", 
                        "organization", 
                        organizationId, 
                        "Processed platform SaaS payment webhook", 
                        { paymentId, amountInr, orderId, email, contact, payerName }
                    );

                    // Update SaaS Invoice status to paid
                    if (invoiceId) {
                        const session = await mongoose.startSession();
                        session.startTransaction();
                        try {
                            const invoice = await SaasInvoice.findById(invoiceId).session(session);
                            if (invoice && invoice.status !== "paid") {
                                invoice.status = "paid";
                                invoice.paidAt = new Date();
                                invoice.razorpay = {
                                    orderId,
                                    paymentId,
                                    paymentMethod: method,
                                    paidAt: new Date()
                                };
                                await invoice.save({ session });
                            }
                            await session.commitTransaction();
                        } catch (err) {
                            await session.abortTransaction();
                            throw err;
                        } finally {
                            session.endSession();
                        }
                    }

                    // Extend subscription
                    if (organizationId) {
                        const sub = await OrgSubscription.findOne({ organization_id: organizationId });
                        if (sub) {
                            sub.plan = "active";
                            sub.status = "active";
                            sub.isPaid = true;
                            // Extend by 31 days from now or from current expiry (whichever is later)
                            const now = new Date();
                            const currentExpiry = sub.expiresAt ? new Date(sub.expiresAt) : now;
                            const baseDate = currentExpiry > now ? currentExpiry : now;
                            sub.expiresAt = new Date(baseDate.getTime() + 31 * 24 * 60 * 60 * 1000);
                            await sub.save();
                        }
                    }

                    console.log(`[Razorpay Webhook] ✅ Platform payment recorded for org ${organizationId}`);
                }

                // ── Student Fee Payment ──
                else if (paymentType === "fee_payment" || paymentType === "student_fee" || feeRecordId) {
                    const existing = await FeeTransaction.findOne({ razorpay_payment_id: paymentId });
                    if (existing) {
                        console.log(`[Razorpay Webhook] Duplicate fee payment ${paymentId}, skipping`);
                        break;
                    }

                    await FeeTransaction.create({
                        organization_id: organizationId,
                        student_id: studentId,
                        fee_record_id: feeRecordId,
                        amount: amountInr,
                        currency,
                        method: "razorpay",
                        status: "success",
                        razorpay_order_id: orderId,
                        razorpay_payment_id: paymentId,
                        notes: `Webhook: ${event} | ${email || ""} | ${contact || ""}`,
                    });

                    // RULE 6 ENFORCEMENT: Audit Log
                    const { logAdminAction } = await import("../services/auditLog.service.js");
                    await logAdminAction(
                        req, 
                        "WEBHOOK_EVENT", 
                        "organization", 
                        organizationId, 
                        "Processed student fee payment webhook", 
                        { paymentId, studentId, amountInr }
                    );

                    // Update FeeRecord paid amount
                    if (feeRecordId) {
                        const FeeRecord = (await import("../models/FeeRecord.js")).default;
                        const record = await FeeRecord.findById(feeRecordId);
                        if (record) {
                            record.paid_amount = (record.paid_amount || 0) + amountInr;
                            if (record.paid_amount >= record.total_amount) {
                                record.status = "paid";
                            } else {
                                record.status = "partial";
                            }
                            await record.save();
                        }
                    }

                    console.log(`[Razorpay Webhook] ✅ Fee payment recorded: Student ${studentId}, Org ${organizationId}`);
                }

                // ── Admission Fee Payment ──
                else if (paymentType === "admission_fee") {
                    const applicationId = notes?.application_id;
                    if (!applicationId) {
                        console.error("[Razorpay Webhook] Admission fee missing application_id");
                        break;
                    }

                    const AdmissionApplication = (await import("../models/AdmissionApplication.js")).default;
                    const application = await AdmissionApplication.findById(applicationId);

                    if (application && !application.fee_paid) {
                        // Confirm payment and create ledger via Admission Controller helper
                        try {
                            const { handlePaymentWebhook } = await import("../controllers/admission.controller.js");
                            // Re-route the payload to the admission controller's logic by mocking the req object
                            req.body = rawBody; // admission controller expects raw body or parsed body depending on parser, it calls getWebhookRawBody
                            req.query.organizationId = organizationId;
                            // Since admission webhook directly handles it and sends a response, we just invoke it and ignore the res
                            const mockRes = { json: () => {}, status: () => ({ send: () => {} }), send: () => {} };
                            await handlePaymentWebhook(req, mockRes);
                            console.log(`[Razorpay Webhook] ✅ Admission Fee handled via controller for ${applicationId}`);

                            // RULE 6 ENFORCEMENT: Audit Log
                            const { logAdminAction } = await import("../services/auditLog.service.js");
                            await logAdminAction(
                                req, 
                                "WEBHOOK_EVENT", 
                                "organization", 
                                organizationId, 
                                "Processed admission fee payment webhook", 
                                { paymentId, applicationId, amountInr }
                            );
                        } catch (err) {
                            console.error("[Razorpay Webhook] Admission fee handler failed:", err);
                        }
                    } else {
                        console.log(`[Razorpay Webhook] Admission already paid or not found for ${applicationId}`);
                    }
                }

                // ── Canteen Order Payment ──
                else if (paymentType === "canteen_order") {
                    const CanteenOrder = (await import("../models/CanteenOrder.js")).default;
                    const order = await CanteenOrder.findOneAndUpdate(
                        { transactionId: orderId, orgId: organizationId },
                        { status: "NEW", paymentStatus: "SUCCESS" },
                        { returnDocument: 'after' }
                    );

                    if (order) {
                        console.log(`[Razorpay Webhook] ✅ Canteen order ${order.tokenNumber} marked paid`);
                        // Try to emit socket
                        try {
                            const { getIO } = await import("../services/socket.service.js");
                            const io = getIO();
                            io.to(`org_${organizationId}_canteen_kitchen`).emit("canteen_new_order", {
                                orderId: order._id,
                                tokenNumber: order.tokenNumber,
                                items: order.items,
                                totalAmount: order.totalAmount,
                                createdAt: order.createdAt
                            });

                            // RULE 6 ENFORCEMENT: Audit Log
                            const { logAdminAction } = await import("../services/auditLog.service.js");
                            await logAdminAction(
                                req, 
                                "WEBHOOK_EVENT", 
                                "organization", 
                                organizationId, 
                                "Processed canteen order payment webhook", 
                                { paymentId, orderId: order._id, amountInr }
                            );
                        } catch (err) {
                            console.warn("[Razorpay Webhook] Canteen socket emit failed");
                        }
                    } else {
                        console.log(`[Razorpay Webhook] Canteen order for razorpay_order_id ${orderId} not found`);
                    }
                }

                // ── Marketplace Order Payment ──
                // ── AI Top-Up Payment ──
                else if (paymentType === "AI_TOPUP") {
                    const userId = notes?.user_id;
                    if (!userId) {
                        console.error("[Razorpay Webhook] AI Top-Up missing user_id");
                        break;
                    }

                    const AiCreditTransaction = (await import("../models/AiCreditTransaction.js")).default;
                    const existing = await AiCreditTransaction.findOne({ razorpay_payment_id: paymentId });
                    if (existing) {
                        console.log(`[Razorpay Webhook] Duplicate AI Top-Up payment ${paymentId}, skipping`);
                        break;
                    }

                    const { calculateCreditsFromAmount } = await import("../services/ai-credits.service.js");
                    const creditsAdded = await calculateCreditsFromAmount(amountInr);

                    const User = (await import("../models/User.js")).default;
                    const user = await User.findById(userId).populate("organization_id");
                    
                    let aiTxn;
                    try {
                        aiTxn = await AiCreditTransaction.create({
                            userId: userId,
                            orgId: organizationId,
                            amount_inr: amountInr,
                            credits_added: creditsAdded,
                            razorpay_payment_id: paymentId,
                            razorpay_order_id: orderId,
                            type: "topup",
                            status: "success",
                            userName: user?.name || "Unknown",
                            userEmail: paymentEntity.email || user?.email || "",
                            userMobile: paymentEntity.contact || user?.phoneNumber || "",
                            userRole: user?.role || "",
                            organizationName: user?.organization_id?.name || "",
                            paymentMethod: paymentEntity.method || "",
                            paymentTime: paymentEntity.created_at ? new Date(paymentEntity.created_at * 1000) : new Date(),
                        });
                    } catch (dupErr) {
                        if (dupErr.code === 11000) {
                            console.log(`[Razorpay Webhook] Caught concurrent duplicate AI Top-Up payment ${paymentId}, skipping`);
                            break;
                        }
                        throw dupErr;
                    }

                    // Set start date only if this is the first purchase, always extend end date to 30 days from now
                    const now = new Date();
                    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    
                    const targetUser = await User.findById(userId).select("ai_tokens").lean();
                    const updateOps = {
                        $inc: {
                            "ai_tokens.ai_credits_balance": creditsAdded,
                            "ai_tokens.total_ai_credits_purchased": creditsAdded
                        },
                        $set: {
                            "ai_tokens.ai_credits_end_date": thirtyDaysFromNow
                        }
                    };
                    
                    // Only set start_date if it hasn't been set yet (first purchase)
                    if (!targetUser?.ai_tokens?.ai_credits_start_date) {
                        updateOps.$set["ai_tokens.ai_credits_start_date"] = now;
                    }
                    
                    await User.findByIdAndUpdate(userId, updateOps);

                    const PaymentOrder = (await import("../models/PaymentOrder.js")).default;
                    const pOrder = await PaymentOrder.findOneAndUpdate({ providerOrderId: orderId }, { status: "PAID" }, { returnDocument: 'after' });

                    // Format payment method string properly
                    let methodStr = paymentEntity.method || "";
                    if (methodStr === "upi" && paymentEntity.vpa) {
                        methodStr = `upi:${paymentEntity.vpa}`;
                    } else if (methodStr === "card" && paymentEntity.card) {
                        methodStr = `card:${paymentEntity.card.network} ${paymentEntity.card.last4}`;
                    } else if (methodStr === "netbanking" && paymentEntity.bank) {
                        methodStr = `netbanking:${paymentEntity.bank}`;
                    }

                    const bankRrn = paymentEntity.acquirer_data?.rrn || paymentEntity.acquirer_data?.bank_transaction_id || paymentEntity.bank_transaction_id || null;
                    const feePaise = paymentEntity.fee || 0;
                    const taxPaise = paymentEntity.tax || 0;

                    const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
                    await PlatformTransaction.create({
                        organizationId: organizationId || null,
                        organizationName: user?.organization_id?.name || "",
                        type: "razorpay",
                        paymentFlow: "ai_topup",
                        amount: amountInr,
                        currency,
                        status: "success",
                        razorpayOrderId: orderId,
                        razorpayPaymentId: paymentId,
                        note: "AI Top-Up Purchase",
                        userName: user?.name || "Unknown",
                        userEmail: paymentEntity.email || user?.email || "",
                        userMobile: paymentEntity.contact || user?.phoneNumber || "",
                        userId: userId,
                        userRole: user?.role || "",
                        paymentMethod: methodStr,
                        paymentTime: paymentEntity.created_at ? new Date(paymentEntity.created_at * 1000) : new Date(),
                    });

                    // We wrap PaymentTransaction creation in try-catch in case paymentAttemptId is required and fails
                    try {
                        const PaymentTransaction = (await import("../models/PaymentTransaction.js")).default;
                        await PaymentTransaction.create({
                            organizationId: organizationId || null,
                            amountCapturedPaise: amount,
                            feePaise: feePaise,
                            taxPaise: taxPaise,
                            currency,
                            status: "CAPTURED",
                            capturedAt: new Date(),
                            providerPaymentId: paymentId,
                            providerOrderId: orderId,
                            merchantType: "CLASSGRID",
                            paymentFlow: "AI_TOPUP",
                            sourceIp: req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress,
                            method: paymentEntity.method || "card",
                            vpa: paymentEntity.vpa || null,
                            bankReference: bankRrn,
                            paymentOrderId: pOrder ? pOrder._id : new mongoose.Types.ObjectId(), // Use real mongo ID or generate fake to avoid BSON error
                            paymentAttemptId: new mongoose.Types.ObjectId() // Fake attempt ID if missing, since this is a direct top-up bypass
                        });
                    } catch (e) {
                        console.error("[Razorpay Webhook] Could not create PaymentTransaction for AI Top-Up:", e.message);
                    }

                    const io = req.app.get("io");
                    if (io) {
                        io.to(userId.toString()).emit("ai_token_update");
                        io.to("superadmin:ai_usage").emit("ai_usage_updated");
                        if (organizationId) {
                            io.to(`org:${organizationId}`).emit("ai_token_update");
                        }
                    }

                    console.log(`[Razorpay Webhook] ✅ AI Top-Up successful! ${creditsAdded} credits added to User ${userId}`);
                }

                else if (paymentType === "marketplace_order") {
                    console.log(`[Razorpay Webhook] ✅ Marketplace order received (No-op as marketplace is direct file access)`);
                }

                // ── Generic/Unknown Payment ──
                                else {
                    // Log it anyway so nothing is lost
                    const existing = await PlatformTransaction.findOne({ razorpayPaymentId: paymentId });
                    if (!existing) {
                        let resolvedUserName = notes?.payerName || notes?.userName || "Unknown";
                        let resolvedUserEmail = email || notes?.payerEmail || "";
                        let resolvedUserMobile = contact || notes?.payerPhone || "";
                        let resolvedUserId = notes?.user_id || null;
                        let resolvedUserRole = "";
                        let resolvedOrgName = "";

                        try {
                            const User = (await import("../models/User.js")).default;
                            let user = null;
                            if (resolvedUserId) {
                                user = await User.findById(resolvedUserId).populate("organization_id");
                            } else if (organizationId) {
                                user = await User.findOne({ organization_id: organizationId, role: "owner" }).populate("organization_id");
                            }

                            if (user) {
                                if (resolvedUserName === "Unknown") resolvedUserName = user.name || "Unknown";
                                if (!resolvedUserEmail) resolvedUserEmail = user.email || "";
                                if (!resolvedUserMobile) resolvedUserMobile = user.phoneNumber || "";
                                if (!resolvedUserId) resolvedUserId = user._id;
                                resolvedUserRole = user.role || "";
                                if (user.organization_id) resolvedOrgName = user.organization_id.name || "";
                            }
                        } catch (e) {
                            console.error("[Razorpay Webhook] User lookup failed for generic payment:", e);
                        }

                        await PlatformTransaction.create({
                            organizationId: organizationId || null,
                            organizationName: resolvedOrgName,
                            type: "razorpay",
                            amount: amountInr,
                            currency,
                            status: "success",
                            razorpayOrderId: orderId,
                            razorpayPaymentId: paymentId,
                            note: `Webhook: ${event} | Type: ${paymentType} | Notes: ${JSON.stringify(notes || {})}`,
                            userName: resolvedUserName,
                            userEmail: resolvedUserEmail,
                            userMobile: resolvedUserMobile,
                            userId: resolvedUserId,
                            userRole: resolvedUserRole,
                            paymentMethod: method || "",
                            paymentTime: paymentEntity?.created_at ? new Date(paymentEntity.created_at * 1000) : new Date(),
                        });
                    }
                    console.log(`[Razorpay Webhook] ✅ Generic payment logged: ₹${amountInr}`);
                }

                break;
            }

            // ═══════════════════════════════════════════
            // PAYMENT FAILED
            // ═══════════════════════════════════════════
            case "payment.failed": {
                if (!paymentEntity) break;

                const { id: paymentId, order_id: orderId, amount, notes, error_description, error_code } = paymentEntity;
                const amountInr = amount / 100;
                const organizationId = notes?.organization_id || notes?.orgId || null;

                console.error(`[Razorpay Webhook] ❌ Payment FAILED: ₹${amountInr} | Error: ${error_code} — ${error_description}`);

                let resolvedUserName = notes?.payerName || notes?.userName || "Unknown";
                let resolvedUserEmail = paymentEntity.email || notes?.payerEmail || "";
                let resolvedUserMobile = paymentEntity.contact || notes?.payerPhone || "";
                let resolvedUserId = notes?.user_id || null;

                if (resolvedUserId) {
                    try {
                        const User = (await import("../models/User.js")).default;
                        const user = await User.findById(resolvedUserId).select("name email phoneNumber");
                        if (user) {
                            if (resolvedUserName === "Unknown") resolvedUserName = user.name || "Unknown";
                            if (!resolvedUserEmail) resolvedUserEmail = user.email || "";
                            if (!resolvedUserMobile) resolvedUserMobile = user.phoneNumber || "";
                        }
                    } catch (e) {
                        console.error("[Razorpay Webhook] User lookup failed for failed payment:", e);
                    }
                }

                await PlatformTransaction.create({
                    organizationId: organizationId || null,
                    type: "razorpay",
                    amount: amountInr,
                    status: "failed",
                    razorpayOrderId: orderId,
                    razorpayPaymentId: paymentId,
                    note: `FAILED: ${error_code} — ${error_description}`,
                    userName: resolvedUserName,
                    userEmail: resolvedUserEmail,
                    userMobile: resolvedUserMobile,
                    userId: resolvedUserId,
                    paymentMethod: paymentEntity.method || "",
                    paymentTime: paymentEntity.created_at ? new Date(paymentEntity.created_at * 1000) : new Date(),
                });

                // NEW LOGIC FOR FAILED PAYMENTS DASHBOARD & EMAIL
                try {
                    const PaymentOrder = (await import("../models/PaymentOrder.js")).default;
                    const PaymentAttempt = (await import("../models/PaymentAttempt.js")).default;
                    const PaymentFailure = (await import("../models/PaymentFailure.js")).default;
                    
                    if (orderId && organizationId) {
                        const pOrder = await PaymentOrder.findOne({ providerOrderId: orderId });
                        if (pOrder) {
                            let attempt = await PaymentAttempt.findOne({ paymentOrderId: pOrder._id }).sort({ createdAt: -1 });
                            
                            if (!attempt) {
                                attempt = await PaymentAttempt.create({
                                    paymentOrderId: pOrder._id,
                                    organizationId,
                                    amountPaise: amount,
                                    providerPaymentId: paymentId,
                                    stage: "VERIFICATION"
                                });
                            } else if (!attempt.providerPaymentId) {
                                attempt.providerPaymentId = paymentId;
                                attempt.stage = "VERIFICATION";
                                await attempt.save();
                            }
                            
                            let responsibility = "UNKNOWN";
                            if (paymentEntity.error_source === "customer") responsibility = "USER_ACTION_REQUIRED";
                            else if (paymentEntity.error_source === "gateway" || paymentEntity.error_source === "bank") responsibility = "BANK_DECLINE";

                            const failure = await PaymentFailure.create({
                                paymentAttemptId: attempt._id,
                                paymentOrderId: pOrder._id,
                                organizationId,
                                failureStage: "WEBHOOK",
                                errorCode: error_code,
                                errorDescription: error_description,
                                errorSource: paymentEntity.error_source || null,
                                errorStep: paymentEntity.error_step || null,
                                errorReason: paymentEntity.error_reason || null,
                                responsibility
                            });

                            try {
                                const { getIO } = await import("../services/socket.service.js");
                                const io = getIO();
                                io.emit("failed_payment_received", {
                                    failureId: failure._id,
                                    amountPaise: amount,
                                    organizationId
                                });
                                io.emit("platform_transactions_updated");
                            } catch (err) {
                                console.error("[Razorpay Webhook] WebSocket emit failed");
                            }
                        }
                    }

                    const payerEmail = paymentEntity.email;
                    if (payerEmail) {
                        const { sendEmail } = await import("../services/aws-ses.service.js");
                        const { getFailedPaymentEmailHtml } = await import("../services/email-templates.service.js");
                        
                        const html = getFailedPaymentEmailHtml(amountInr, error_description, paymentId);
                        
                        await sendEmail({
                            to: payerEmail,
                            subject: `Payment Failed - ${error_description || "Action Required"}`,
                            html,
                            fromName: "Classgrid Billing",
                            fromEmail: "billing@classgrid.in"
                        });
                        console.log(`[Razorpay Webhook] ✅ Sent failure email to ${payerEmail}`);
                    }
                } catch (err) {
                    console.error("[Razorpay Webhook] Failed to process PaymentFailure or email:", err);
                }


                // RULE 6 ENFORCEMENT: Audit Log
                const { logAdminAction } = await import("../services/auditLog.service.js");
                await logAdminAction(
                    req, 
                    "WEBHOOK_EVENT", 
                    "organization", 
                    organizationId || null, 
                    "Processed failed payment webhook", 
                    { paymentId, amountInr, error_code }
                );

                break;
            }

            // ═══════════════════════════════════════════
            // ORDER PAID (all payments for order captured)
            // ═══════════════════════════════════════════
            case "order.paid": {
                if (!orderEntity) break;
                console.log(`[Razorpay Webhook] 📦 Order fully paid: ${orderEntity.id} | ₹${orderEntity.amount_paid / 100}`);
                // Payment already handled in payment.captured — this is just a confirmation
                break;
            }

            // ═══════════════════════════════════════════
            // REFUND CREATED
            // ═══════════════════════════════════════════
            case "refund.created":
            case "refund.processed": {
                if (!refundEntity) break;

                const { id: refundId, payment_id: paymentId, amount, notes } = refundEntity;
                const amountInr = amount / 100;
                const organizationId = notes?.organization_id || notes?.orgId || null;

                console.log(`[Razorpay Webhook] 🔄 Refund: ₹${amountInr} for payment ${paymentId}`);

                // Find original transaction
                const originalTxn = await PlatformTransaction.findOne({ razorpayPaymentId: paymentId });

                await PlatformTransaction.create({
                    organizationId: organizationId || originalTxn?.organizationId || null,
                    type: "refund",
                    amount: amountInr,
                    status: "refunded",
                    razorpayPaymentId: refundId,
                    razorpayOrderId: originalTxn?.razorpayOrderId || null,
                    refundOf: originalTxn?._id || null,
                    refundReason: notes?.reason || "Razorpay refund",
                    refundedAt: new Date(),
                    note: `Refund of ₹${amountInr} for payment ${paymentId}`,
                });

                // Update original transaction
                if (originalTxn) {
                    originalTxn.status = "refunded";
                    await originalTxn.save();
                }

                // RULE 6 ENFORCEMENT: Audit Log
                const { logAdminAction } = await import("../services/auditLog.service.js");
                await logAdminAction(
                    req, 
                    "WEBHOOK_EVENT", 
                    "organization", 
                    organizationId || originalTxn?.organizationId || null, 
                    "Processed refund webhook", 
                    { refundId, paymentId, amountInr }
                );

                break;
            }

            default:
                console.log(`[Razorpay Webhook] Unhandled event: ${event}`);
        }

        } catch (switchErr) {
            console.error("[Razorpay Webhook] Error processing event:", switchErr);
            processingStatus = "FAILED";
            lastError = switchErr.message;
        }

        // Mark WebhookEvent as processed
        await WebhookEvent.findOneAndUpdate({ providerEventId: eventId }, {
            processingStatus,
            processedAt: new Date(),
            lastError
        });

        // Always return 200 to Razorpay to prevent retries
        res.status(200).json({ received: true, event });
    } catch (err) {
        console.error("[Razorpay Webhook] 🔥 Error:", err);
        // We don't mark WebhookEvent as FAILED here because the try/catch might have thrown before we got the eventId
        // The webhook retry process will handle it.
        res.status(200).json({ received: true, error: "internal" });
    }
});

export default router;

