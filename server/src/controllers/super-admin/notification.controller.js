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

import NotificationTemplate from "../../models/NotificationTemplate.js";
import NotificationLog from "../../models/NotificationLog.js";
import { logAdminAction } from "../../services/auditLog.service.js";
import Handlebars from "handlebars";

// ── Templates ──

export const listTemplates = async (req, res) => {
    try {
        const templates = await NotificationTemplate.find().sort({ category: 1, name: 1 });
        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTemplate = async (req, res) => {
    try {
        const template = await NotificationTemplate.findById(req.params.id);
        if (!template) return res.status(404).json({ success: false, message: "Template not found" });
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createTemplate = async (req, res) => {
    try {
        const { name, type, category, subject, htmlBody, textBody, requiredPlaceholders, description } = req.body;
        
        // Validate handlebars syntax
        try {
            if (htmlBody) Handlebars.compile(htmlBody);
            if (textBody) Handlebars.compile(textBody);
            if (subject) Handlebars.compile(subject);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Invalid Handlebars syntax: " + err.message });
        }

        const template = await NotificationTemplate.create({
            name, type, category, subject, htmlBody, textBody, requiredPlaceholders, description, createdBy: req.user?._id
        });

        await logAdminAction(req, "CREATE_NOTIFICATION_TEMPLATE", "SYSTEM", template._id, template.name, { category, type }, null, "SUCCESS");

        res.status(201).json({ success: true, data: template });
    } catch (error) {
        await logAdminAction(req, "CREATE_NOTIFICATION_TEMPLATE", "SYSTEM", null, req.body.name, { error: error.message }, null, "FAILED");
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateTemplate = async (req, res) => {
    try {
        const { subject, htmlBody, textBody, requiredPlaceholders, description, isActive } = req.body;
        
        // Validate handlebars syntax
        try {
            if (htmlBody) Handlebars.compile(htmlBody);
            if (textBody) Handlebars.compile(textBody);
            if (subject) Handlebars.compile(subject);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Invalid Handlebars syntax: " + err.message });
        }

        const template = await NotificationTemplate.findByIdAndUpdate(
            req.params.id,
            { subject, htmlBody, textBody, requiredPlaceholders, description, isActive, updatedBy: req.user?._id },
            { returnDocument: 'after' }
        );

        if (!template) return res.status(404).json({ success: false, message: "Template not found" });

        await logAdminAction(req, "UPDATE_NOTIFICATION_TEMPLATE", "SYSTEM", template._id, template.name, { isActive }, null, "SUCCESS");

        res.json({ success: true, data: template });
    } catch (error) {
        await logAdminAction(req, "UPDATE_NOTIFICATION_TEMPLATE", "SYSTEM", req.params.id, null, { error: error.message }, null, "FAILED");
        res.status(500).json({ success: false, message: error.message });
    }
};

export const previewTemplate = async (req, res) => {
    try {
        const { htmlBody, textBody, subject, data } = req.body;
        
        let compiledSubject = null;
        let compiledHtml = null;
        let compiledText = null;

        try {
            if (subject) compiledSubject = Handlebars.compile(subject)(data || {});
            if (htmlBody) compiledHtml = Handlebars.compile(htmlBody)(data || {});
            if (textBody) compiledText = Handlebars.compile(textBody)(data || {});
        } catch (err) {
            return res.status(400).json({ success: false, message: "Template compilation error: " + err.message });
        }

        res.json({ 
            success: true, 
            data: { 
                subject: compiledSubject, 
                html: compiledHtml, 
                text: compiledText 
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Logs ──

export const listLogs = async (req, res) => {
    try {
        const { orgId, status, type, limit = 50, page = 1 } = req.query;
        
        const filter = {};
        if (orgId) filter.organizationId = orgId;
        if (status) filter.status = status;
        if (type) filter.type = type;

        const skip = (page - 1) * limit;

        const logs = await NotificationLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("organizationId", "name code")
            .populate("templateId", "name category");

        const total = await NotificationLog.countDocuments(filter);

        res.json({ success: true, data: { logs, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getLogDetails = async (req, res) => {
    try {
        const log = await NotificationLog.findById(req.params.id)
            .populate("organizationId", "name code")
            .populate("templateId", "name category");
            
        if (!log) return res.status(404).json({ success: false, message: "Log not found" });
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
