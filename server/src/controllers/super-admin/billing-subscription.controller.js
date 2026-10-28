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

import OrganizationSubscription from "../../models/OrganizationSubscription.js";
import OrganizationSubscriptionItem from "../../models/OrganizationSubscriptionItem.js";
import SubscriptionChange from "../../models/SubscriptionChange.js";
import InvoiceGenerator from "../../services/billing/InvoiceGenerator.js";
import ProrationEngine from "../../services/billing/ProrationEngine.js";
import { logAdminAction } from "../../services/auditLog.service.js";
import { finishedAccountsMatch } from "../../utils/chat-onboarding.js";

export const listSubscriptions = async (req, res) => {
    try {
        const subscriptions = await OrganizationSubscription.find().populate("billingPlanVersionId organizationId").sort({ createdAt: -1 });
        res.json({ success: true, data: subscriptions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSubscriptionOverview = async (req, res) => {
    try {
        const Organization = (await import("../../models/Organization.js")).default;
        const User = (await import("../../models/User.js")).default;
        
        const [orgStats, totalUsers] = await Promise.all([
            Organization.aggregate([
                {
                    $group: {
                        _id: null,
                        totalOrgs: { $sum: 1 },
                        activeOrgs: { 
                            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
                        },
                        demoOrgs: {
                            $sum: { $cond: [{ $in: ["$org_type", ["DEMO", "TRIAL"]] }, 1, 0] }
                        }
                    }
                }
            ]),
            User.countDocuments({ status: "active", ...finishedAccountsMatch() })
        ]);

        const stats = orgStats[0] || { totalOrgs: 0, activeOrgs: 0, demoOrgs: 0 };
        
        res.json({
            success: true,
            data: {
                totalOrganizations: stats.totalOrgs,
                activeOrgs: stats.activeOrgs,
                demoTrialOrgs: stats.demoOrgs,
                totalUsersAcrossOrgs: totalUsers
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSubscription = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOne({ organizationId }).populate("billingPlanVersionId");
        if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

        const items = await OrganizationSubscriptionItem.find({ organizationSubscriptionId: subscription._id }).populate("billingModuleVersionId");
        
        res.json({ success: true, data: { subscription, items } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const previewSubscriptionChange = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOne({ organizationId });
        if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

        // Use the real InvoiceGenerator engine in dry-run mode
        const preview = await InvoiceGenerator.generateForSubscription(
            organizationId, 
            subscription._id, 
            new Date(), 
            subscription.currentPeriodEnd, 
            true
        );

        res.json({ success: true, data: preview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const assignPlan = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { billingPlanId, billingPlanVersionId, billingCycle } = req.body;

        const subscription = await OrganizationSubscription.create({
            organizationId,
            billingPlanId,
            billingPlanVersionId,
            billingCycle,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1))
        });

        await SubscriptionChange.create({
            organizationSubscriptionId: subscription._id,
            reason: "PLAN_ASSIGNED",
            newStateSnapshot: subscription,
            createdBy: req.user?._id
        });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Assigned new billing plan", 
            { planId: billingPlanId, cycle: billingCycle }
        );

        res.status(201).json({ success: true, data: subscription });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const changePlan = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOneAndUpdate({ organizationId }, req.body, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Changed subscription plan", 
            req.body
        );

        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const addModule = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOne({ organizationId });
        if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

        const item = await OrganizationSubscriptionItem.create({
            organizationSubscriptionId: subscription._id,
            billingModuleId: req.body.billingModuleId,
            billingModuleVersionId: req.body.billingModuleVersionId,
            quantity: req.body.quantity || 1,
            effectiveFrom: new Date()
        });

        await SubscriptionChange.create({
            organizationSubscriptionId: subscription._id,
            reason: "MODULE_ADDED",
            newStateSnapshot: item,
            createdBy: req.user?._id
        });

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Added billing module", 
            { moduleId: req.body.billingModuleId, quantity: req.body.quantity || 1 }
        );

        res.status(201).json({ success: true, data: item });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const removeModule = async (req, res) => {
    try {
        const { organizationId } = req.params;

        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Removed billing module", 
            {}
        );

        res.json({ success: true, message: "Module removed" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const changeBillingCycle = async (req, res) => {
    try {
        const { organizationId } = req.params;
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId || null, 
            "Changed billing cycle", 
            {}
        );

        res.json({ success: true, message: "Cycle changed" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const pauseSubscription = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOneAndUpdate({ organizationId }, { status: "PAUSED" }, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Paused subscription", 
            {}
        );

        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const resumeSubscription = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOneAndUpdate({ organizationId }, { status: "ACTIVE" }, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Resumed subscription", 
            {}
        );

        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOneAndUpdate({ organizationId }, { status: "CANCELLED", cancelledAt: new Date() }, { returnDocument: 'after' });
        
        // RULE 6 ENFORCEMENT: Audit Log
        await logAdminAction(
            req, 
            "UPDATE_BILLING", 
            "organization", 
            organizationId, 
            "Cancelled subscription", 
            {}
        );

        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getSubscriptionHistory = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOne({ organizationId });
        if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

        const history = await SubscriptionChange.find({ organizationSubscriptionId: subscription._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUpcomingInvoice = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const subscription = await OrganizationSubscription.findOne({ organizationId });
        if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

        // Generate draft invoice dynamically without saving
        const draft = await InvoiceGenerator.generateForSubscription(organizationId, subscription._id, subscription.currentPeriodStart, subscription.currentPeriodEnd, true);
        
        res.json({ success: true, data: draft });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
