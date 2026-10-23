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

import BillingEligibilityRule from "../../models/BillingEligibilityRule.js";
import BillingMetricDefinition from "../../models/BillingMetricDefinition.js";
import OrganizationBillingUsageSnapshot from "../../models/OrganizationBillingUsageSnapshot.js";
import OrganizationPriceOverride from "../../models/OrganizationPriceOverride.js";
import { logAdminAction } from "../../services/auditLog.service.js";

// ── Eligibility Rules ──

export const listEligibilityRules = async (req, res) => {
    try {
        const rules = await BillingEligibilityRule.find().sort({ createdAt: -1 });
        res.json({ success: true, data: rules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createEligibilityRule = async (req, res) => {
    try {
        const rule = await BillingEligibilityRule.create(req.body);
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Created eligibility rule", 
            { ruleId: rule._id }
        );

        res.status(201).json({ success: true, data: rule });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateEligibilityRule = async (req, res) => {
    try {
        const rule = await BillingEligibilityRule.findByIdAndUpdate(req.params.ruleId, req.body, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Updated eligibility rule", 
            { ruleId: req.params.ruleId }
        );

        res.json({ success: true, data: rule });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ── Metrics & Usage ──

export const listMetrics = async (req, res) => {
    try {
        const metrics = await BillingMetricDefinition.find().sort({ code: 1 });
        res.json({ success: true, data: metrics });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUsage = async (req, res) => {
    try {
        const usage = await OrganizationBillingUsageSnapshot.find({ organizationId: req.params.organizationId }).sort({ billingPeriodStart: -1 });
        res.json({ success: true, data: usage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const recalculateUsage = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const OrganizationSubscription = (await import("../../models/OrganizationSubscription.js")).default;
        const subscription = await OrganizationSubscription.findOne({ organizationId });
        
        if (subscription) {
            const UsageAggregator = (await import("../../services/billing/UsageAggregator.js")).default;
            if (UsageAggregator && UsageAggregator.aggregateUsage) {
                await UsageAggregator.aggregateUsage(organizationId, subscription.currentPeriodStart, subscription.currentPeriodEnd);
            }
        }
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Triggered real usage recalculation via UsageAggregator", 
            {}
        );

        res.json({ success: true, message: "Usage recalculation completed for the organization." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Price Overrides ──

export const listPriceOverrides = async (req, res) => {
    try {
        const overrides = await OrganizationPriceOverride.find({ organizationId: req.params.organizationId }).sort({ effectiveFrom: -1 });
        res.json({ success: true, data: overrides });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPriceOverride = async (req, res) => {
    try {
        const override = await OrganizationPriceOverride.create({
            ...req.body,
            organizationId: req.params.organizationId,
            createdBy: req.user?._id
        });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            req.params.organizationId, 
            "Created price override", 
            { overrideId: override._id }
        );

        res.status(201).json({ success: true, data: override });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updatePriceOverride = async (req, res) => {
    try {
        const override = await OrganizationPriceOverride.findByIdAndUpdate(req.params.overrideId, req.body, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            override?.organizationId || null, 
            "Updated price override", 
            { overrideId: req.params.overrideId }
        );

        res.json({ success: true, data: override });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deletePriceOverride = async (req, res) => {
    try {
        const override = await OrganizationPriceOverride.findById(req.params.overrideId);
        if (!override) return res.status(404).json({ success: false, message: "Price override not found" });

        if (!override.effectiveUntil || override.effectiveUntil > new Date()) {
            override.effectiveUntil = new Date();
            await override.save();
        }
        await logAdminAction(
            req, "UPDATE_BILLING", "billing", override._id,
            "Ended organization price override",
            { organizationId: override.organizationId, effectiveUntil: override.effectiveUntil },
            override.organizationId
        );
        return res.json({ success: true, data: override });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
