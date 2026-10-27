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

import Discount from "../../models/Discount.js";
import OrganizationCreditAccount from "../../models/OrganizationCreditAccount.js";
import OrganizationCreditEntry from "../../models/OrganizationCreditEntry.js";
import TaxRule from "../../models/TaxRule.js";
import TaxRuleVersion from "../../models/TaxRuleVersion.js";
import { logAdminAction } from "../../services/auditLog.service.js";

// ── Discounts ──

export const listDiscounts = async (req, res) => {
    try {
        const discounts = await Discount.find().sort({ createdAt: -1 });
        res.json({ success: true, data: discounts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createDiscount = async (req, res) => {
    try {
        const discount = await Discount.create({ ...req.body, createdBy: req.user?._id });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Created new discount code", 
            { discountId: discount._id, code: discount.code }
        );

        res.status(201).json({ success: true, data: discount });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateDiscount = async (req, res) => {
    try {
        const discount = await Discount.findByIdAndUpdate(req.params.discountId, req.body, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Updated discount code", 
            { discountId: discount?._id }
        );

        res.json({ success: true, data: discount });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const archiveDiscount = async (req, res) => {
    try {
        const discount = await Discount.findByIdAndUpdate(req.params.discountId, { status: "ARCHIVED" }, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Archived discount code", 
            { discountId: req.params.discountId }
        );

        res.json({ success: true, data: discount });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ── Credits ──

export const getCreditAccount = async (req, res) => {
    try {
        const account = await OrganizationCreditAccount.findOne({ organizationId: req.params.organizationId });
        if (!account) return res.status(404).json({ success: false, message: "Account not found" });

        const history = await OrganizationCreditEntry.find({ organizationCreditAccountId: account._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: { account, history } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const grantCredits = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { amountPaise, reason } = req.body;

        let account = await OrganizationCreditAccount.findOne({ organizationId });
        if (!account) {
            account = await OrganizationCreditAccount.create({ organizationId });
        }

        const balanceAfterPaise = account.currentBalancePaise + amountPaise;

        await OrganizationCreditEntry.create({
            organizationCreditAccountId: account._id,
            entryType: "CREDIT_GRANTED",
            amountPaise,
            balanceAfterPaise,
            reason,
            createdBy: req.user?._id
        });

        account.currentBalancePaise = balanceAfterPaise;
        await account.save();

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Granted credits to organization", 
            { amountPaise, reason }
        );

        res.status(201).json({ success: true, data: account });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const reverseCredits = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { amountPaise, reason } = req.body;

        const account = await OrganizationCreditAccount.findOne({ organizationId });
        if (!account || account.currentBalancePaise < amountPaise) {
            return res.status(400).json({ success: false, message: "Insufficient balance" });
        }

        const balanceAfterPaise = account.currentBalancePaise - amountPaise;

        await OrganizationCreditEntry.create({
            organizationCreditAccountId: account._id,
            entryType: "CREDIT_REVERSED",
            amountPaise: -amountPaise,
            balanceAfterPaise,
            reason,
            createdBy: req.user?._id
        });

        account.currentBalancePaise = balanceAfterPaise;
        await account.save();

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Reversed credits from organization", 
            { amountPaise, reason }
        );

        res.status(201).json({ success: true, data: account });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ── Taxes ──

export const listTaxRules = async (req, res) => {
    try {
        const rules = await TaxRule.find().populate("activeVersionId").sort({ createdAt: -1 });
        res.json({ success: true, data: rules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createTaxRule = async (req, res) => {
    try {
        const rule = await TaxRule.create({ ...req.body, createdBy: req.user?._id });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Created tax rule", 
            { taxRuleId: rule._id }
        );

        res.status(201).json({ success: true, data: rule });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const createTaxRuleVersion = async (req, res) => {
    try {
        const { taxRuleId } = req.params;
        
        const lastVersion = await TaxRuleVersion.findOne({ taxRuleId }).sort({ versionNumber: -1 });
        const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        const version = await TaxRuleVersion.create({
            ...req.body,
            taxRuleId,
            versionNumber,
            createdBy: req.user?._id
        });

        await TaxRule.findByIdAndUpdate(taxRuleId, { activeVersionId: version._id });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Created tax rule version", 
            { taxRuleId, versionId: version._id }
        );

        res.status(201).json({ success: true, data: version });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listTaxRuleVersions = async (req, res) => {
    try {
        const rule = await TaxRule.findById(req.params.taxRuleId).select("_id").lean();
        if (!rule) return res.status(404).json({ success: false, message: "Tax rule not found" });
        const versions = await TaxRuleVersion.find({ taxRuleId: req.params.taxRuleId })
            .sort({ versionNumber: -1 })
            .lean();
        return res.json({ success: true, data: versions });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
