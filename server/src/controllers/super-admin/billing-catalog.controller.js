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

import BillingPlan from "../../models/BillingPlan.js";
import BillingPlanVersion from "../../models/BillingPlanVersion.js";
import BillingModule from "../../models/BillingModule.js";
import BillingModuleVersion from "../../models/BillingModuleVersion.js";
import PlanModule from "../../models/PlanModule.js";
import { logAdminAction } from "../../services/auditLog.service.js";

// ── Plans ──

export const listPlans = async (req, res) => {
    try {
        const plans = await BillingPlan.find().populate("activeVersionId").sort({ createdAt: -1 });
        res.json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPlan = async (req, res) => {
    try {
        const { name, code, description, currency, allowedOrgTypes, allowedStructureTypes } = req.body;
        const plan = await BillingPlan.create({
            name, code, description, currency, allowedOrgTypes, allowedStructureTypes, status: "DRAFT", createdBy: req.user?._id
        });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Created new billing plan", 
            { planId: plan._id, code }
        );

        res.status(201).json({ success: true, data: plan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getPlan = async (req, res) => {
    try {
        const plan = await BillingPlan.findById(req.params.planId).populate("activeVersionId");
        if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
        res.json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePlanEligibility = async (req, res) => {
    try {
        const { allowedOrgTypes, allowedStructureTypes } = req.body;
        const plan = await BillingPlan.findByIdAndUpdate(
            req.params.planId, 
            { allowedOrgTypes, allowedStructureTypes, updatedBy: req.user?._id }, 
            { returnDocument: 'after' }
        );
        if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Updated billing plan eligibility", 
            { planId: plan._id }
        );

        res.json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPlanVersion = async (req, res) => {
    try {
        const { planId } = req.params;
        const { monthlyBasePricePaise, annualBasePricePaise, organizationLimit, trialPeriodDays, effectiveFrom, modules } = req.body;
        
        const plan = await BillingPlan.findById(planId);
        if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

        // Get next version number
        const lastVersion = await BillingPlanVersion.findOne({ planId }).sort({ versionNumber: -1 });
        const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        const version = await BillingPlanVersion.create({
            planId, versionNumber, monthlyBasePricePaise, annualBasePricePaise, organizationLimit, trialPeriodDays, effectiveFrom, createdBy: req.user?._id
        });

        // Add Plan Modules
        if (modules && modules.length > 0) {
            const planModules = modules.map(m => ({
                billingPlanVersionId: version._id,
                billingModuleId: m.moduleId,
                pricingType: m.pricingType,
                includedQuantity: m.includedQuantity,
                monthlyPricePaise: m.monthlyPricePaise,
                annualPricePaise: m.annualPricePaise,
                isIncluded: m.isIncluded,
                isOptional: m.isOptional,
                effectiveFrom
            }));
            await PlanModule.insertMany(planModules);
        }

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Created new billing plan version", 
            { planId, versionId: version._id }
        );

        res.status(201).json({ success: true, data: version });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listPlanVersions = async (req, res) => {
    try {
        const versions = await BillingPlanVersion.find({ planId: req.params.planId }).sort({ versionNumber: -1 });
        res.json({ success: true, data: versions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const archivePlan = async (req, res) => {
    try {
        const plan = await BillingPlan.findByIdAndUpdate(req.params.planId, { status: "ARCHIVED" }, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Archived billing plan", 
            { planId: req.params.planId }
        );

        res.json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Modules ──

export const listModules = async (req, res) => {
    try {
        const modules = await BillingModule.find().populate("activeVersionId").sort({ createdAt: -1 });
        res.json({ success: true, data: modules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createModule = async (req, res) => {
    try {
        const { name, code, category, description, pricingType, trialAllowed, allowedOrgTypes, allowedStructureTypes } = req.body;
        const module = await BillingModule.create({
            name, code, category, description, pricingType, trialAllowed, allowedOrgTypes, allowedStructureTypes, createdBy: req.user?._id
        });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Created new billing module", 
            { moduleId: module._id, code }
        );

        res.status(201).json({ success: true, data: module });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getModule = async (req, res) => {
    try {
        const module = await BillingModule.findById(req.params.moduleId).populate("activeVersionId");
        if (!module) return res.status(404).json({ success: false, message: "Module not found" });
        res.json({ success: true, data: module });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateModuleEligibility = async (req, res) => {
    try {
        const { allowedOrgTypes, allowedStructureTypes } = req.body;
        const module = await BillingModule.findByIdAndUpdate(
            req.params.moduleId, 
            { allowedOrgTypes, allowedStructureTypes, updatedBy: req.user?._id }, 
            { returnDocument: 'after' }
        );
        if (!module) return res.status(404).json({ success: false, message: "Module not found" });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Updated billing module eligibility", 
            { moduleId: module._id }
        );

        res.json({ success: true, data: module });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createModuleVersion = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { monthlyPricePaise, annualPricePaise, taxCategory, unitType, effectiveFrom } = req.body;
        
        const module = await BillingModule.findById(moduleId);
        if (!module) return res.status(404).json({ success: false, message: "Module not found" });

        const lastVersion = await BillingModuleVersion.findOne({ moduleId }).sort({ versionNumber: -1 });
        const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        const version = await BillingModuleVersion.create({
            moduleId, versionNumber, monthlyPricePaise, annualPricePaise, taxCategory, unitType, effectiveFrom, createdBy: req.user?._id
        });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Created new billing module version", 
            { moduleId, versionId: version._id }
        );

        res.status(201).json({ success: true, data: version });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listModuleVersions = async (req, res) => {
    try {
        const versions = await BillingModuleVersion.find({ moduleId: req.params.moduleId }).sort({ versionNumber: -1 });
        res.json({ success: true, data: versions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const archiveModule = async (req, res) => {
    try {
        const module = await BillingModule.findByIdAndUpdate(req.params.moduleId, { status: "ARCHIVED" }, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            null, 
            "Archived billing module", 
            { moduleId: req.params.moduleId }
        );

        res.json({ success: true, data: module });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
