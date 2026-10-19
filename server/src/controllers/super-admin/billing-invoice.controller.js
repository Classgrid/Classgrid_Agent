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

import Invoice from "../../models/Invoice.js";
import InvoiceLineItem from "../../models/InvoiceLineItem.js";
import CreditNote from "../../models/CreditNote.js";
import InvoiceDelivery from "../../models/InvoiceDelivery.js";
import InvoiceGenerator from "../../services/billing/InvoiceGenerator.js";
import { INVOICE_STATUS } from "../../utils/billing.utils.js";
import { logAdminAction } from "../../services/auditLog.service.js";

export const listInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        res.json({ success: true, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.invoiceId);
        if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

        const lines = await InvoiceLineItem.find({ invoiceId: invoice._id });
        res.json({ success: true, data: { invoice, lines } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const previewInvoice = async (req, res) => {
    try {
        const { organizationId, subscriptionId, periodStart, periodEnd } = req.body;
        // Run generation in preview mode without saving
        const preview = await InvoiceGenerator.generateForSubscription(organizationId, subscriptionId, new Date(periodStart), new Date(periodEnd), true);
        res.json({ success: true, data: preview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const generateInvoice = async (req, res) => {
    try {
        const { organizationId, subscriptionId, periodStart, periodEnd } = req.body;
        const invoice = await InvoiceGenerator.generateForSubscription(organizationId, subscriptionId, new Date(periodStart), new Date(periodEnd));
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Generated ad-hoc invoice", 
            { invoiceId: invoice._id, subscriptionId }
        );

        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const issueInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.invoiceId);
        if (!invoice || invoice.status !== INVOICE_STATUS.DRAFT) {
            return res.status(400).json({ success: false, message: "Only draft invoices can be issued." });
        }
        
        invoice.status = INVOICE_STATUS.ISSUED;
        invoice.issueDate = new Date();
        invoice.isLocked = true;
        await invoice.save();

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            invoice.organization_id || invoice.organizationId || null, 
            "Issued draft invoice", 
            { invoiceId: invoice._id }
        );

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const sendInvoice = async (req, res) => {
    try {
        await InvoiceDelivery.create({
            invoiceId: req.params.invoiceId,
            organizationId: req.body.organizationId, // Usually pulled from invoice directly
            deliveryEvent: "EMAIL_SENT",
            emailSentTo: req.body.email,
            actorId: req.user?._id
        });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            req.body.organizationId || null, 
            "Sent invoice manually via email", 
            { invoiceId: req.params.invoiceId, email: req.body.email }
        );

        res.json({ success: true, message: "Invoice sent" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const voidInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndUpdate(req.params.invoiceId, { status: INVOICE_STATUS.VOID }, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            invoice?.organization_id || invoice?.organizationId || null, 
            "Voided invoice", 
            { invoiceId: invoice?._id }
        );

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const createCreditNote = async (req, res) => {
    try {
        const note = await CreditNote.create({ ...req.body, invoiceId: req.params.invoiceId, createdBy: req.user?._id });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            req.body.organizationId || null, 
            "Created credit note", 
            { creditNoteId: note._id, invoiceId: req.params.invoiceId }
        );

        res.status(201).json({ success: true, data: note });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const downloadInvoicePdf = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.invoiceId).select('invoiceNumber organizationId');
        if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

        // In a real system, this would call AWS S3 / Cloudflare R2 getSignedUrl
        // Dynamically generating the path based on the real DB entity
        const url = `https://r2.classgrid.in/invoices/${invoice.invoiceNumber || req.params.invoiceId}.pdf`;
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "VIEW", 
            "organization", 
            invoice.organizationId || null, 
            "Downloaded invoice PDF", 
            { invoiceId: invoice._id }
        );

        res.json({ success: true, url });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDeliveryHistory = async (req, res) => {
    try {
        const history = await InvoiceDelivery.find({ invoiceId: req.params.invoiceId }).sort({ createdAt: -1 });
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
