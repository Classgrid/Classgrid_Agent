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

import crypto from "crypto";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import SaasInvoice from "../models/SaasInvoice.js";
import FeeRecord from "../models/FeeRecord.js";
import CanteenOrder from "../models/CanteenOrder.js";
import { PAYMENT_FLOW, MERCHANT_TYPE, toPaise } from "../utils/billing.utils.js";

export const HANDOFF_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_OTP_RESENDS = 3;

function httpError(statusCode, message, code) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

export function hashHandoffToken(rawToken) {
    return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

export function handoffTokenCandidates(rawToken) {
    // The raw candidate supports already-issued, short-lived legacy handoffs.
    return [hashHandoffToken(rawToken), String(rawToken)];
}

export function maskEmail(email) {
    const [local = "", domain = ""] = String(email || "").split("@");
    if (!domain) return "";
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function userOrganizationId(user) {
    return user?.organization_id?._id?.toString?.()
        || user?.organization_id?.toString?.()
        || user?.organizationId?._id?.toString?.()
        || user?.organizationId?.toString?.()
        || null;
}

function assertTenantAccess(user, organizationId) {
    if (!user) throw httpError(401, "Authentication is required", "AUTH_REQUIRED");
    if (user.role === "super_admin") return;
    if (userOrganizationId(user) !== String(organizationId)) {
        throw httpError(403, "The payable does not belong to your organization", "TENANT_SCOPE_VIOLATION");
    }
}

function positivePaise(value, label) {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw httpError(409, `${label} has no payable balance`, "NOT_PAYABLE");
    }
    return value;
}

export async function resolvePayable({ organizationId, paymentType, referenceId, user }) {
    if (!mongoose.isValidObjectId(organizationId) || !mongoose.isValidObjectId(referenceId)) {
        throw httpError(400, "A valid organization and payable reference are required", "INVALID_REFERENCE");
    }
    assertTenantAccess(user, organizationId);

    if (paymentType === "saas_invoice") {
        if (!["org_admin", "super_admin"].includes(user.role)) {
            throw httpError(403, "Only an organization administrator can pay the Classgrid invoice", "ROLE_FORBIDDEN");
        }

        const invoice = await Invoice.findOne({
            _id: referenceId,
            organizationId,
            status: { $nin: ["PAID", "VOID", "REFUNDED"] },
        }).lean();
        if (invoice) {
            const amountPaise = positivePaise(
                invoice.amountDuePaise ?? (invoice.totalAmountPaise - (invoice.amountPaidPaise || 0)),
                "Invoice"
            );
            return {
                referenceModel: "Invoice",
                referenceId: invoice._id,
                invoiceId: invoice._id,
                amountPaise,
                currency: invoice.currency || "INR",
                label: invoice.invoiceNumber,
                paymentFlow: PAYMENT_FLOW.CLASSGRID_SUBSCRIPTION,
                merchantType: MERCHANT_TYPE.CLASSGRID,
                merchantOrganizationId: null,
                providerModule: "platform",
            };
        }

        const legacyInvoice = await SaasInvoice.findOne({
            _id: referenceId,
            organizationId,
            status: { $in: ["sent", "overdue"] },
        }).lean();
        if (!legacyInvoice) throw httpError(404, "Payable Classgrid invoice not found", "PAYABLE_NOT_FOUND");
        return {
            referenceModel: "SaasInvoice",
            referenceId: legacyInvoice._id,
            invoiceId: null,
            amountPaise: positivePaise(legacyInvoice.totalAmountPaise, "Invoice"),
            currency: legacyInvoice.currency || "INR",
            label: legacyInvoice.invoiceNumber,
            paymentFlow: PAYMENT_FLOW.CLASSGRID_SUBSCRIPTION,
            merchantType: MERCHANT_TYPE.CLASSGRID,
            merchantOrganizationId: null,
            providerModule: "platform",
        };
    }

    if (paymentType === "fee_payment" || paymentType === "admission_fee") {
        const fee = await FeeRecord.findOne({
            _id: referenceId,
            organizationId,
            status: { $ne: "paid" },
        }).lean();
        if (!fee) throw httpError(404, "Payable fee record not found", "PAYABLE_NOT_FOUND");
        if (user.role === "student" && String(fee.student) !== String(user._id)) {
            throw httpError(403, "This fee record does not belong to you", "PAYER_SCOPE_VIOLATION");
        }
        return {
            referenceModel: "FeeRecord",
            referenceId: fee._id,
            invoiceId: null,
            amountPaise: positivePaise(fee.amountPaise - (fee.paidAmountPaise || 0), "Fee record"),
            currency: "INR",
            label: fee.title,
            paymentFlow: PAYMENT_FLOW.INSTITUTION_FEE,
            merchantType: MERCHANT_TYPE.INSTITUTION,
            merchantOrganizationId: fee.organizationId,
            providerModule: "fees",
        };
    }

    if (paymentType === "canteen_order") {
        const order = await CanteenOrder.findOne({
            _id: referenceId,
            orgId: organizationId,
            paymentStatus: "PENDING",
        }).lean();
        if (!order) throw httpError(404, "Payable canteen order not found", "PAYABLE_NOT_FOUND");
        if (user.role === "student" && String(order.studentId) !== String(user._id)) {
            throw httpError(403, "This canteen order does not belong to you", "PAYER_SCOPE_VIOLATION");
        }
        const amountPaise = order.totalAmountPaise ?? toPaise(order.totalAmount);
        return {
            referenceModel: "CanteenOrder",
            referenceId: order._id,
            invoiceId: null,
            amountPaise: positivePaise(amountPaise, "Canteen order"),
            currency: "INR",
            label: `Canteen order ${order.tokenNumber}`,
            paymentFlow: PAYMENT_FLOW.INSTITUTION_FEE,
            merchantType: MERCHANT_TYPE.INSTITUTION,
            merchantOrganizationId: order.orgId,
            providerModule: "canteen",
        };
    }

    throw httpError(400, "Unsupported payment type", "UNSUPPORTED_PAYMENT_TYPE");
}

function addConfiguredHost(hosts, value) {
    if (!value) return;
    try {
        hosts.add(new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase());
    } catch {
        // Invalid stored/configured hosts are ignored, never trusted.
    }
}

export function validateReturnUrl(rawReturnUrl, organization) {
    if (!rawReturnUrl) throw httpError(400, "return_url is required", "RETURN_URL_REQUIRED");
    let url;
    try {
        url = new URL(rawReturnUrl);
    } catch {
        throw httpError(400, "return_url must be an absolute URL", "INVALID_RETURN_URL");
    }

    const hosts = new Set(["classgrid.in", "www.classgrid.in", "app.classgrid.in"]);
    addConfiguredHost(hosts, process.env.CLIENT_URL);
    addConfiguredHost(hosts, process.env.APP_URL);
    addConfiguredHost(hosts, organization?.custom_domain?.domain);
    addConfiguredHost(hosts, organization?.erp_domain?.domain);
    if (organization?.subdomain) hosts.add(`${organization.subdomain}.classgrid.in`.toLowerCase());

    const hostname = url.hostname.toLowerCase();
    const isClassgridHost = hostname === "classgrid.in" || hostname.endsWith(".classgrid.in");
    const isLocalDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(hostname);
    if (!hosts.has(hostname) && !isClassgridHost && !isLocalDevelopment) {
        throw httpError(400, "return_url host is not allowed", "RETURN_URL_NOT_ALLOWED");
    }
    if (url.protocol !== "https:" && !isLocalDevelopment) {
        throw httpError(400, "return_url must use HTTPS", "RETURN_URL_NOT_SECURE");
    }
    return url.toString();
}

export function formatPaise(amountPaise, currency = "INR") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amountPaise / 100);
}
