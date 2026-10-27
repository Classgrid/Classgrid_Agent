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
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { getBlogSubscribersSb } from "../config/blogSubscribersSupabaseClient.js";
import UserProfile from "../models/UserProfile.js";
import { getProfileSchema } from "../utils/profile-schemas.js";
import {
    broadcastGlobal,
    emailOrgAdmins,
    createScheduledNotification,
    listScheduledNotifications,
    cancelScheduledNotification,
    listFeatureFlags,
    upsertFeatureFlag,
    toggleFeatureFlag,
    healthCheck,
    impersonateUser,
    getErrorLogs,
    updateOrgSubscription,
    getOrgSubscription,
    createPlatformRazorpayOrder,
    verifyPlatformRazorpayPayment,
    approveLeadAndProvision,
    getDemoLeads,
    scheduleLeadMeeting, createDemoLead,
    deleteDemoLead,
    regenerateLeadActivation
} from "../controllers/super-admin.controller.js";
import {
    getSuperAdminSupportConversation,
    listSuperAdminSupportConversations,
    markSuperAdminSupportConversationRead,
    sendSuperAdminSupportMessage,
    updateSuperAdminSupportConversation,
    deleteSuperAdminSupportConversation
} from "../controllers/support-communication.controller.js";

import notificationRoutes from "./super-admin/notification.routes.js";
import billingCatalogRoutes from "./super-admin/billing-catalog.routes.js";
import billingDiscountsTaxesRoutes from "./super-admin/billing-discounts-taxes.routes.js";
import billingEligibilityPricingRoutes from "./super-admin/billing-eligibility-pricing.routes.js";
import billingFailuresRoutes from "./super-admin/billing-failures.routes.js";
import billingInvoiceRoutes from "./super-admin/billing-invoice.routes.js";
import billingRevenueRoutes from "./super-admin/billing-revenue.routes.js";
import billingSubscriptionRoutes from "./super-admin/billing-subscription.routes.js";
import billingTransactionsRoutes from "./super-admin/billing-transactions.routes.js";
import billingExportsRoutes from "./super-admin/billing-exports.routes.js";
import aiUsageRoutes from "./super-admin/ai-usage.routes.js";
import { requireSuperAdminBillingAccess } from "../middlewares/billingPermissions.js";
import { validateBillingRequest } from "../middlewares/billingValidation.js";

const router = express.Router();
const PRIMARY_SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "support@classgrid.in").trim().toLowerCase();

// All routes require super_admin role
router.use(isAuthenticated, requireRole("super_admin"));

import { getGlobalAiConfig, updateGlobalAiConfig } from "../controllers/super-admin/ai-global-config.controller.js";

router.use("/notifications-sys", notificationRoutes);
router.use("/ai-usage", aiUsageRoutes);
router.get("/ai-global-config", getGlobalAiConfig);
router.put("/ai-global-config", updateGlobalAiConfig);

// Canonical contract. Authentication, billing permission, and validation apply
// to both canonical routes and the temporary backward-compatible aliases.
router.use("/billing", requireSuperAdminBillingAccess, validateBillingRequest);
router.get("/billing/permissions", (req, res) => {
    res.json({
        success: true,
        data: [
            "SUPER_ADMIN",
            "BILLING_READ",
            "BILLING_WRITE",
            "BILLING_EXPORT",
            "BILLING_REFUND",
            "BILLING_RECONCILE",
        ],
    });
});
router.get("/billing/organizations", async (req, res) => {
    try {
        const Organization = (await import("../models/Organization.js")).default;
        const organizations = await Organization.find({
            status: { $in: ["active", "suspended", "setup_in_progress"] },
        })
            .select("_id name sidebar_name status org_type org_mode")
            .sort({ name: 1 })
            .lean();
        res.json({
            success: true,
            data: organizations.map((organization) => ({
                ...organization,
                displayName: organization.sidebar_name || organization.name,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.use("/billing", billingCatalogRoutes);
router.use("/billing", billingDiscountsTaxesRoutes);
router.use("/billing", billingEligibilityPricingRoutes);
router.use("/billing/failed-payments", billingFailuresRoutes);
router.use("/billing/invoices", billingInvoiceRoutes);
router.use("/billing/revenue", billingRevenueRoutes);
router.use("/billing/subscriptions", billingSubscriptionRoutes);
router.use("/billing/transactions", billingTransactionsRoutes);
router.use("/billing/export-jobs", billingExportsRoutes);

// Backward-compatible aliases for older deployed clients.
router.use("/billing/catalog", billingCatalogRoutes);
router.use("/billing/discounts-taxes", billingDiscountsTaxesRoutes);
router.use("/billing/eligibility-pricing", billingEligibilityPricingRoutes);
router.use("/billing/failures", billingFailuresRoutes);
router.use("/billing/invoice", billingInvoiceRoutes);
router.use("/billing/revenue", billingRevenueRoutes);
router.use("/billing/subscription", billingSubscriptionRoutes);
router.use("/billing/transactions", billingTransactionsRoutes);

function isPrimarySuperAdmin(user) {
    return (user?.email || "").trim().toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL;
}

function ensurePrimarySuperAdmin(req, res) {
    if (isPrimarySuperAdmin(req.user)) {
        return true;
    }

    res.status(403).json({
        success: false,
        message: "Only the primary platform owner can manage subscribers.",
    });

    return false;
}

function normalizeSubscriber(row, index) {
    return {
        id: row?.id ?? row?._id ?? `${row?.email || "subscriber"}-${index}`,
        email: typeof row?.email === "string" ? row.email.trim() : "",
        name: typeof row?.name === "string" ? row.name.trim() : "",
        is_active: row?.is_active !== false,
        created_at: typeof row?.created_at === "string" ? row.created_at : null,
        updated_at: typeof row?.updated_at === "string" ? row.updated_at : null,
    };
}

function sortSubscribers(a, b) {
    const firstTimestamp = Date.parse(a.created_at || a.updated_at || "");
    const secondTimestamp = Date.parse(b.created_at || b.updated_at || "");
    const firstHasTimestamp = Number.isFinite(firstTimestamp);
    const secondHasTimestamp = Number.isFinite(secondTimestamp);

    if (firstHasTimestamp && secondHasTimestamp && firstTimestamp !== secondTimestamp) {
        return secondTimestamp - firstTimestamp;
    }

    if (firstHasTimestamp) return -1;
    if (secondHasTimestamp) return 1;

    return a.email.localeCompare(b.email);
}

function parseTimestamp(value) {
    if (!value || typeof value !== "string") return null;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return null;
    return new Date(timestamp);
}

function getIsoDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function formatTrendLabel(date) {
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function buildSubscriberTrend(subscribers, days = 14) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));

    const trend = [];
    const trendMap = new Map();

    for (let index = 0; index < days; index += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = getIsoDateKey(date);
        const point = {
            date: key,
            label: formatTrendLabel(date),
            subscribed: 0,
            unsubscribed: 0,
        };

        trend.push(point);
        trendMap.set(key, point);
    }

    subscribers.forEach((subscriber) => {
        const subscribedAt = parseTimestamp(subscriber.created_at);
        if (subscribedAt) {
            const point = trendMap.get(getIsoDateKey(subscribedAt));
            if (point) point.subscribed += 1;
        }

        if (!subscriber.is_active) {
            const unsubscribedAt = parseTimestamp(subscriber.updated_at);
            const point = unsubscribedAt ? trendMap.get(getIsoDateKey(unsubscribedAt)) : null;

            if (point) {
                point.unsubscribed += 1;
            }
        }
    });

    return trend;
}

function countSince(subscribers, days, selector) {
    const threshold = new Date();
    threshold.setHours(0, 0, 0, 0);
    threshold.setDate(threshold.getDate() - (days - 1));

    return subscribers.filter((subscriber) => {
        const date = selector(subscriber);
        return date && date >= threshold;
    }).length;
}

function findLatestDate(subscribers, selector) {
    return subscribers.reduce((latest, subscriber) => {
        const current = selector(subscriber);
        if (!current) return latest;
        if (!latest || current > latest) return current;
        return latest;
    }, null);
}

// -- 1. GLOBAL BROADCAST (Push Notifications)
router.post("/broadcast-global", broadcastGlobal);

// -- 2. EMAIL ORG ADMINS
router.post("/email-org-admins", emailOrgAdmins);

// -- 3. NOTIFICATIONS (list + create)
router.get("/notifications", listScheduledNotifications);
router.post("/notifications", createScheduledNotification);

// -- 3a. BLOG / CHANGELOG SUBSCRIBERS
router.get("/subscribers", async (req, res) => {
    try {
        const searchQuery = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
        const statusFilter = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "all";
        const preferenceFilter = typeof req.query.preference === "string" ? req.query.preference.trim().toLowerCase() : "all";

        const subscribersSb = getBlogSubscribersSb();
        const { data, error } = await subscribersSb.from("blog_subscribers").select("*");

        if (error) {
            console.error("[SuperAdmin] subscribers list error:", error.message);
            return res.status(500).json({ success: false, message: "Failed to load subscribers" });
        }

        const subscribers = (data || [])
            .map((row, index) => {
                const normalized = normalizeSubscriber(row, index);
                // Dynamically calculate is_active: if ANY preference is true, they are active.
                // If they are all false, they are paused/inactive.
                normalized.receives_blog = row.receives_blog !== false;
                normalized.receives_changelog = row.receives_changelog !== false;
                normalized.receives_legal = row.receives_legal !== false;
                normalized.is_active = normalized.receives_blog || normalized.receives_changelog || normalized.receives_legal;
                return normalized;
            })
            .filter((row) => row.email)
            .sort(sortSubscribers);
        const activeSubscribers = subscribers.filter((row) => row.is_active);
        const inactiveSubscribers = subscribers.filter((row) => !row.is_active);

        const filteredSubscribers = subscribers.filter((row) => {
            const matchesSearch = !searchQuery || row.email.toLowerCase().includes(searchQuery);
            const matchesStatus =
                statusFilter === "active"
                    ? row.is_active
                    : statusFilter === "inactive"
                        ? !row.is_active
                        : true;
                        
            const matchesPreference = 
                preferenceFilter === "blog" ? row.receives_blog :
                preferenceFilter === "blog-off" ? !row.receives_blog :
                preferenceFilter === "changelog" ? row.receives_changelog :
                preferenceFilter === "changelog-off" ? !row.receives_changelog :
                preferenceFilter === "legal" ? row.receives_legal :
                preferenceFilter === "legal-off" ? !row.receives_legal :
                true;

            return matchesSearch && matchesStatus && matchesPreference;
        });

        const inactiveSubscribersForList = inactiveSubscribers.filter((row) =>
            !searchQuery || row.email.toLowerCase().includes(searchQuery)
        );
        const recentSubscribers = [...activeSubscribers]
            .sort((a, b) => {
                const first = Date.parse(a.created_at || "");
                const second = Date.parse(b.created_at || "");
                if (Number.isFinite(first) && Number.isFinite(second)) return second - first;
                if (Number.isFinite(first)) return -1;
                if (Number.isFinite(second)) return 1;
                return a.email.localeCompare(b.email);
            })
            .slice(0, 6);
        const trend = buildSubscriberTrend(subscribers, 15);
        const newSubscribers15d = countSince(subscribers, 15, (row) => parseTimestamp(row.created_at));
        const newUnsubscribes15d = countSince(
            inactiveSubscribers,
            15,
            (row) => parseTimestamp(row.updated_at)
        );
        const activeCount = activeSubscribers.length;
        const totalCount = subscribers.length;
        const activeRate = totalCount > 0 ? Number(((activeCount / totalCount) * 100).toFixed(1)) : 0;
        const lastSubscribedAt = findLatestDate(subscribers, (row) => parseTimestamp(row.created_at));
        const lastUnsubscribedAt = findLatestDate(inactiveSubscribers, (row) => parseTimestamp(row.updated_at));

        return res.json({
            success: true,
            data: filteredSubscribers,
            total: filteredSubscribers.length,
            stats: {
                total: totalCount,
                active: activeCount,
                inactive: inactiveSubscribers.length,
                newSubscribers15d,
                newUnsubscribes15d,
                netGrowth15d: newSubscribers15d - newUnsubscribes15d,
                activeRate,
                deliveryReady: activeCount,
            },
            trend,
            inactiveSubscribers: inactiveSubscribersForList,
            recentSubscribers,
            activity: {
                lastSubscribedAt: lastSubscribedAt ? lastSubscribedAt.toISOString() : null,
                lastUnsubscribedAt: lastUnsubscribedAt ? lastUnsubscribedAt.toISOString() : null,
            },
        });
    } catch (err) {
        console.error("[SuperAdmin] subscribers route error:", err.message);
        const isConfigError = err.message?.includes("credentials");
        return res.status(isConfigError ? 503 : 500).json({
            success: false,
            message: isConfigError
                ? "Blog subscriber Supabase credentials are missing on the platform server."
                : "Server error",
        });
    }
});

router.patch("/subscribers/:email/pause", async (req, res) => {
    try {
        const subscriberEmail = decodeURIComponent(req.params.email || "").trim();
        if (!subscriberEmail) {
            return res.status(400).json({ success: false, message: "Subscriber email is required." });
        }

        const subscribersSb = getBlogSubscribersSb();
        const { error } = await subscribersSb
            .from("blog_subscribers")
            .update({ 
                receives_blog: false, 
                receives_changelog: false, 
                receives_legal: false, 
                updated_at: new Date().toISOString() 
            })
            .eq("email", subscriberEmail);

        if (error) {
            console.error("[SuperAdmin] subscriber pause error:", error.message);
            return res.status(500).json({ success: false, message: "Failed to pause subscriber." });
        }

        return res.json({ success: true, message: "Subscriber paused successfully." });
    } catch (err) {
        console.error("[SuperAdmin] subscriber pause route error:", err.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

router.patch("/subscribers/:email/resume", async (req, res) => {
    try {
        const subscriberEmail = decodeURIComponent(req.params.email || "").trim();
        if (!subscriberEmail) {
            return res.status(400).json({ success: false, message: "Subscriber email is required." });
        }

        const subscribersSb = getBlogSubscribersSb();
        const { error } = await subscribersSb
            .from("blog_subscribers")
            .update({ 
                receives_blog: true, 
                receives_changelog: true, 
                receives_legal: true, 
                updated_at: null 
            })
            .eq("email", subscriberEmail);

        if (error) {
            console.error("[SuperAdmin] subscriber resume error:", error.message);
            return res.status(500).json({ success: false, message: "Failed to resume subscriber." });
        }

        return res.json({ success: true, message: "Subscriber resumed successfully." });
    } catch (err) {
        console.error("[SuperAdmin] subscriber resume route error:", err.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

router.patch("/subscribers/:email/preferences", async (req, res) => {
    try {
        const subscriberEmail = decodeURIComponent(req.params.email || "").trim();
        if (!subscriberEmail) {
            return res.status(400).json({ success: false, message: "Subscriber email is required." });
        }

        const { receives_blog, receives_changelog, receives_legal } = req.body;
        
        console.log("[SuperAdmin] PATCH preferences req.body:", req.body);
        
        const updatePayload = { updated_at: new Date().toISOString() };
        if (typeof receives_blog === 'boolean') updatePayload.receives_blog = receives_blog;
        if (typeof receives_changelog === 'boolean') updatePayload.receives_changelog = receives_changelog;
        if (typeof receives_legal === 'boolean') updatePayload.receives_legal = receives_legal;

        console.log("[SuperAdmin] PATCH preferences updatePayload:", updatePayload);

        const subscribersSb = getBlogSubscribersSb();
        const { error } = await subscribersSb
            .from("blog_subscribers")
            .update(updatePayload)
            .eq("email", subscriberEmail);

        if (error) {
            console.error("[SuperAdmin] subscriber preference error:", error.message);
            return res.status(500).json({ success: false, message: "Failed to update subscriber preferences." });
        }

        return res.json({ success: true, message: "Subscriber preferences updated successfully." });
    } catch (err) {
        console.error("[SuperAdmin] subscriber preferences route error:", err.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

router.delete("/subscribers/:email", async (req, res) => {
    try {
        const subscriberEmail = decodeURIComponent(req.params.email || "").trim();
        if (!subscriberEmail) {
            return res.status(400).json({ success: false, message: "Subscriber email is required." });
        }

        const subscribersSb = getBlogSubscribersSb();
        const { error } = await subscribersSb
            .from("blog_subscribers")
            .delete()
            .eq("email", subscriberEmail);

        if (error) {
            console.error("[SuperAdmin] subscriber delete error:", error.message);
            return res.status(500).json({ success: false, message: "Failed to remove subscriber." });
        }

        return res.json({ success: true, message: "Subscriber removed successfully." });
    } catch (err) {
        console.error("[SuperAdmin] subscriber delete route error:", err.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// -- 3b. SCHEDULED NOTIFICATIONS (Festival Auto-Scheduler)
router.post("/scheduled-notifications", createScheduledNotification);
router.get("/scheduled-notifications", listScheduledNotifications);
router.patch("/scheduled-notifications/:id/cancel", cancelScheduledNotification);

// -- 4. FEATURE FLAGS (Kill Switch)
router.get("/feature-flags", listFeatureFlags);
router.post("/feature-flags", upsertFeatureFlag);
router.patch("/feature-flags/:key/toggle", toggleFeatureFlag);

// -- 5. HEALTH CHECK
router.get("/health", healthCheck);

// -- 6. IMPERSONATION (Login As)
router.post("/impersonate/:userId", impersonateUser);

// -- 7. ERROR LOG VIEWER
router.get("/error-logs", getErrorLogs);

// -- 7b. SERVER MAINTENANCE
import { cleanLogs } from "../controllers/super-admin.controller.js";
router.post("/clean-logs", cleanLogs);

// -- 8. ORG SUBSCRIPTION MANAGEMENT
router.get("/subscription/:orgId", getOrgSubscription);
router.put("/subscription/:orgId", updateOrgSubscription);
router.post("/subscription/:orgId/razorpay-order", createPlatformRazorpayOrder);
router.post("/subscription/:orgId/razorpay-verify", verifyPlatformRazorpayPayment);

// -- 8b. ALL ORGANIZATIONS LIST (for dashboard + org management page)
router.get("/organizations", async (req, res) => {
    try {
        const Organization = (await import("../models/Organization.js")).default;
        const User = (await import("../models/User.js")).default;

        const orgs = await Organization.find({})
            .select("name org_type structure_type status plan city state createdAt owner_id ownerName ownerEmail studentLimit faculty_limit logo_url")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        // Attach user counts per org
        const orgIds = orgs.map((o) => o._id);
        const ownerIds = orgs.map((o) => o.owner_id).filter(Boolean);
        const [userCounts, owners] = await Promise.all([
            User.aggregate([
                { $match: { organization_id: { $in: orgIds } } },
                { $group: { _id: "$organization_id", count: { $sum: 1 } } },
            ]),
            User.find({ _id: { $in: ownerIds } }).select("name email").lean(),
        ]);
        const countMap = Object.fromEntries(userCounts.map((u) => [u._id.toString(), u.count]));
        const ownerMap = Object.fromEntries(owners.map((u) => [u._id.toString(), u]));

        const enriched = orgs.map((o) => {
            const owner = o.owner_id ? ownerMap[o.owner_id.toString()] : null;
            const userCount = countMap[o._id.toString()] ?? 0;
            return {
                ...o,
                orgType: o.org_type ?? o.structure_type ?? "organization",
                ownerName: o.ownerName || owner?.name || "",
                ownerEmail: o.ownerEmail || owner?.email || "",
                totalUsers: userCount,
                userCount,
            };
        });

        res.json({ success: true, data: enriched, total: enriched.length });
    } catch (err) {
        console.error("[SuperAdmin] organizations list error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// -- 8c. CUSTOM DOMAINS PLATFORM MANAGER
router.get("/custom-domains", async (req, res) => {
    try {
        const Organization = (await import("../models/Organization.js")).default;

        const orgsWithDomains = await Organization.find({
            $or: [
                { "custom_domain.domain": { $ne: null, $exists: true } },
                { "erp_domain.domain": { $ne: null, $exists: true } }
            ]
        })
            .select("name subdomain custom_domain erp_domain createdAt ownerName ownerEmail owner_id")
            .populate("owner_id", "name email")
            .sort({ "createdAt": -1 })
            .lean();

        res.json({ success: true, data: orgsWithDomains });
    } catch (err) {
        console.error("[SuperAdmin] custom domains list error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/custom-domains/:orgId/full", async (req, res) => {
    try {
        const { orgId } = req.params;
        const Organization = (await import("../models/Organization.js")).default;
        const User = (await import("../models/User.js")).default;

        const org = await Organization.findById(orgId).populate("owner_id", "name email profilePicture").lean();
        if (!org) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        const [totalStudents, totalFaculty, totalUsers, adminsList] = await Promise.all([
            User.countDocuments({ organization_id: orgId, role: "student" }),
            User.countDocuments({ organization_id: orgId, role: { $in: ["faculty", "hod", "principal"] } }),
            User.countDocuments({ organization_id: orgId }),
            User.find({
                organization_id: orgId,
                role: { $in: ["org_admin", "super_admin", "library_manager", "hod", "principal", "vice_principal", "exam_controller", "fee_manager", "admission_head", "tpo_officer", "coordinator"] }
            }).select("name email role profilePicture department designation phoneNumber").lean()
        ]);

        res.json({
            success: true,
            data: {
                ...org,
                stats: { totalStudents, totalFaculty, totalUsers },
                adminsList
            }
        });
    } catch (err) {
        console.error("[SuperAdmin] fetch full org error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/custom-domains/:orgId/verify", async (req, res) => {
    try {
        const orgId = req.params.orgId;
        const Organization = (await import("../models/Organization.js")).default;
        
        const org = await Organization.findById(orgId);
        if (!org || !org.custom_domain?.domain) {
            return res.status(404).json({ success: false, message: "Organization or custom domain not found" });
        }

        const domain = org.custom_domain.domain;

        // Verify with Vercel API
        const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
        const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
        const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;

        if (!VERCEL_PROJECT_ID || !VERCEL_API_TOKEN) {
             return res.status(500).json({ success: false, message: "Vercel API credentials not configured on server" });
        }

        const fetch = (await import("node-fetch")).default;
        let url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;
        if (VERCEL_TEAM_ID) {
            url += `?teamId=${VERCEL_TEAM_ID}`;
        }

        const vercelRes = await fetch(url, {
            headers: {
                Authorization: `Bearer ${VERCEL_API_TOKEN}`,
            },
        });

        if (!vercelRes.ok) {
            const errData = await vercelRes.json().catch(() => ({}));
            return res.status(400).json({ 
                success: false, 
                message: "Failed to verify domain with Vercel API", 
                details: errData 
            });
        }

        const domainData = await vercelRes.json();
        const isVerified = domainData.verified;

        org.custom_domain.status = isVerified ? "verified" : "pending_verification";
        if (isVerified) {
            org.custom_domain.verified_at = new Date();
        }
        await org.save();

        return res.json({ 
            success: true, 
            status: org.custom_domain.status,
            domainData 
        });
    } catch (err) {
        console.error("[SuperAdmin] custom domain verify error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.delete("/custom-domains/:orgId", async (req, res) => {
    try {
        const orgId = req.params.orgId;
        const Organization = (await import("../models/Organization.js")).default;
        
        const org = await Organization.findById(orgId);
        if (!org || !org.custom_domain?.domain) {
            return res.status(404).json({ success: false, message: "Custom domain not found for this org" });
        }

        const domain = org.custom_domain.domain;

        // Remove from Vercel API
        const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
        const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
        const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;

        if (VERCEL_PROJECT_ID && VERCEL_API_TOKEN) {
            const fetch = (await import("node-fetch")).default;
            let url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;
            if (VERCEL_TEAM_ID) {
                url += `?teamId=${VERCEL_TEAM_ID}`;
            }

            const vercelRes = await fetch(url, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
                },
            });

            if (!vercelRes.ok && vercelRes.status !== 404) {
                console.error("[SuperAdmin] Failed to delete domain from Vercel", await vercelRes.text());
            }
        }

        // Remove from DB
        org.has_custom_domain = false;
        org.custom_domain = undefined; // or { domain: null } depending on schema, but undefined works if schema allows
        
        // Reset branding settings
        org.site_title = "Classgrid ERP";
        org.favicon_url = "";
        org.campus_photo_url = "";
        org.brand_colors = {
            primary: "#6366f1",
            secondary: "#4f46e5"
        };

        await org.save();

        return res.json({ success: true, message: "Custom domain removed successfully" });
    } catch (err) {
        console.error("[SuperAdmin] custom domain delete error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// -- 8d. ORGANIZATION DETAIL VIEW (for Dashboard / Drilldown)
import { getOrganizationDetail,     deleteOrganization,
    updateOrganizationStatus, updateOrganizationOnboarding } from "../controllers/super-admin.controller.js";
router.get("/organizations/:id", getOrganizationDetail);

// -- 8c. PLATFORM FEEDBACK (private reviews submitted from modules)
router.get("/feedback", async (req, res) => {
    try {
        const Review = (await import("../models/Review.js")).default;

        const feedback = await Review.find({ isPublic: false })
            .populate("user", "name email role")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        const data = feedback.map((item) => ({
            _id: item._id,
            user: {
                name: item.user?.name ?? item.name ?? "Unknown user",
                email: item.user?.email ?? "",
                role: item.user?.role ?? "user",
            },
            organization: { name: item.college || "Personal Account" },
            category: item.category || "general",
            message: item.suggestion ? `${item.helped} - ${item.suggestion}` : item.helped,
            status: item.status || "new",
            createdAt: item.createdAt,
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error("[SuperAdmin] feedback list error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.patch("/feedback/:id", async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ["new", "reviewed", "archived"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid feedback status" });
        }

        const Review = (await import("../models/Review.js")).default;
        const feedback = await Review.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { returnDocument: 'after', runValidators: true }
        );

        if (!feedback) {
            return res.status(404).json({ success: false, message: "Feedback not found" });
        }

        res.json({ success: true, feedback });
    } catch (err) {
        console.error("[SuperAdmin] feedback update error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// -- 9b. PLATFORM ACTIVITY LOG (Admin Audit Trail)
router.get("/activity-logs", async (req, res) => {
    try {
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;
        const { page = 1, limit = 50, action, actorId, targetType } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};
        if (action) filter.action = action;
        if (actorId) filter.actorId = actorId;
        if (targetType) filter.targetType = targetType;

        const [logs, total] = await Promise.all([
            AdminAuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            AdminAuditLog.countDocuments(filter),
        ]);

        res.json({ success: true, logs, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("[SuperAdmin] activity-logs error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// -- 9. LEAD APPROVAL + PROVISIONING
router.get("/leads", getDemoLeads);
router.post("/leads", createDemoLead);
router.post("/leads/:id/approve", approveLeadAndProvision);

// -- 9A. STEP 1 — Save admin details
router.patch("/leads/:id/admin-details", async (req, res) => {
  try {
    const DemoRequest = (await import("../models/DemoRequest.js")).default;
    const { adminName, adminEmail, adminPhone, role, designation } = req.body;

    if (!adminName || !adminEmail) {
      return res.status(400).json({ success: false, message: "adminName and adminEmail are required" });
    }

    const lead = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          adminName: adminName.trim(),
          adminEmail: adminEmail.toLowerCase().trim(),
          adminPhone: adminPhone || "",
          role: role || "",
          designation: designation || "",
        },
      },
      { returnDocument: 'after' }
    );

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, lead });
  } catch (err) {
    console.error("[SuperAdmin] admin-details error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -- 9B. STEP 2 — Save/update institution details
router.patch("/leads/:id/institution-details", async (req, res) => {
  try {
    const DemoRequest = (await import("../models/DemoRequest.js")).default;
    const {
      institutionName, orgType, state, district, taluka, cityVillage, city,
      website, studentCount, staffCount, campusCount, departmentCount,
      currentSystem, currentErpName, requiredModules, integrationsNeeded,
      historicalDataNeeded, targetGoLiveDate,
    } = req.body;

    const update = {};
    if (institutionName) update.institutionName = institutionName.trim();
    if (orgType) update.orgType = orgType;
    if (state) update.state = state;
    if (district !== undefined) update.district = district;
    if (taluka !== undefined) update.taluka = taluka;
    if (cityVillage !== undefined) update.cityVillage = cityVillage;
    if (city !== undefined) update.city = city;
    if (website !== undefined) update.website = website;
    if (studentCount !== undefined) update.studentCount = studentCount;
    if (staffCount !== undefined) update.staffCount = staffCount;
    if (campusCount !== undefined) update.campusCount = campusCount;
    if (departmentCount !== undefined) update.departmentCount = departmentCount;
    if (currentSystem !== undefined) update.currentSystem = currentSystem;
    if (currentErpName !== undefined) update.currentErpName = currentErpName;
    if (requiredModules !== undefined) update.requiredModules = requiredModules;
    if (integrationsNeeded !== undefined) update.integrationsNeeded = integrationsNeeded;
    if (historicalDataNeeded !== undefined) update.historicalDataNeeded = historicalDataNeeded;
    if (targetGoLiveDate !== undefined) update.targetGoLiveDate = targetGoLiveDate;

    const lead = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, lead });
  } catch (err) {
    console.error("[SuperAdmin] institution-details error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -- 9C. STEP 3 — Allocate dashboards
router.patch("/leads/:id/allocate-dashboards", async (req, res) => {
  try {
    const DemoRequest = (await import("../models/DemoRequest.js")).default;
    const { allocatedDashboards } = req.body;

    if (!Array.isArray(allocatedDashboards)) {
      return res.status(400).json({ success: false, message: "allocatedDashboards must be an array" });
    }

    const validDashboards = [
      "dashboard_admission", "dashboard_fees", "dashboard_exam",
      "dashboard_library", "dashboard_attendance", "dashboard_hr",
      "dashboard_hostel", "dashboard_student", "dashboard_faculty",
      "dashboard_organization",
    ];

    const filtered = allocatedDashboards.filter(d => validDashboards.includes(d));

    const lead = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      { $set: { allocatedDashboards: filtered } },
      { returnDocument: 'after' }
    );

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, lead, allocatedCount: filtered.length });
  } catch (err) {
    console.error("[SuperAdmin] allocate-dashboards error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -- 9D. STEP 4 — Allocate modules
router.patch("/leads/:id/allocate-modules", async (req, res) => {
  try {
    const DemoRequest = (await import("../models/DemoRequest.js")).default;
    const { allocatedModules } = req.body;

    if (!allocatedModules || typeof allocatedModules !== "object") {
      return res.status(400).json({ success: false, message: "allocatedModules must be an object" });
    }

    const validModuleKeys = [
      "erp_core", "admission_module", "fee_module", "hr_module",
      "canteen_module", "custom_domain_module", "ai_assistant",
      "analytics_module", "website_module", "certificates_module",
      "events_module", "feedback_module", "holiday_module",
      "id_cards_module", "exam_proctoring", "naac_module", "marketplace_module",
    ];

    const sanitized = {};
    for (const key of validModuleKeys) {
      sanitized[key] = !!allocatedModules[key];
    }
    sanitized.erp_core = true;

    const lead = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      { $set: { allocatedModules: sanitized } },
      { returnDocument: 'after' }
    );

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, lead });
  } catch (err) {
    console.error("[SuperAdmin] allocate-modules error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -- 9E. STEP 5 — Review summary
router.get("/leads/:id/provision-summary", async (req, res) => {
  try {
    const DemoRequest = (await import("../models/DemoRequest.js")).default;
    const lead = await DemoRequest.findById(req.params.id).lean();

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const summary = {
      admin: {
        name: lead.adminName,
        email: lead.adminEmail,
        phone: lead.adminPhone,
        role: lead.role,
      },
      institution: {
        name: lead.institutionName,
        type: lead.orgType,
        location: [lead.cityVillage || lead.city, lead.district, lead.state].filter(Boolean).join(", "),
        website: lead.website,
        studentCount: lead.studentCount,
        staffCount: lead.staffCount,
        campusCount: lead.campusCount,
        departmentCount: lead.departmentCount,
        currentSystem: lead.currentSystem,
        currentErpName: lead.currentErpName,
      },
      modules: lead.allocatedModules || {},
      dashboards: lead.allocatedDashboards || [],
      targetGoLiveDate: lead.targetGoLiveDate,
      provisioningType: lead.provisioningType || "sandbox",
      plan: "sandbox",
      duration: "31 days",
      readyToProvision: !!(lead.adminName && lead.adminEmail && lead.institutionName && lead.orgType),
    };

    res.json({ success: true, summary });
  } catch (err) {
    console.error("[SuperAdmin] provision-summary error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -- 9F. STEP 6 — Create Sandbox
router.post("/leads/:id/create-sandbox", async (req, res) => {
  try {
    const { approveLeadAndProvision } = await import("../services/lead-conversion.service.js");

    const result = await approveLeadAndProvision(
      req.params.id,
      { plan: "sandbox", mode: "sandbox" },
      req.user?._id || null
    );

    return res.status(201).json({
      success: true,
      message: `Sandbox organization created successfully for 31 days`,
      organization: {
        _id: result.organization._id,
        name: result.organization.name,
        subdomain: result.organization.subdomain,
        org_mode: "sandbox",
        demoExpiresAt: result.organization.demoExpiresAt,
      },
      admin: {
        _id: result.admin?._id,
        name: result.admin?.name,
        email: result.admin?.email,
      },
      activation: result.activation,
      warnings: result.warnings || [],
    });
  } catch (err) {
    console.error("[SuperAdmin] create-sandbox error:", err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Sandbox provisioning failed",
    });
  }
});

// -- 9G. Sandbox to Active Conversion
router.post("/organizations/:id/convert-to-active", async (req, res) => {
  try {
    const { convertSandboxToActive } = await import("../services/lead-conversion.service.js");
    const result = await convertSandboxToActive(req.params.id, req.body, req.user?._id || null);
    res.json({ success: true, message: "Organization converted to active production mode", data: result });
  } catch (err) {
    console.error("[SuperAdmin] convert-to-active error:", err.message);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Server error" });
  }
});

router.post("/leads/:id/schedule-meeting", scheduleLeadMeeting);
router.post("/leads/:id/regenerate-activation", regenerateLeadActivation);
router.patch("/leads/:id/assign", async (req, res, next) => {
    try {
        const { assignLead } = await import("../controllers/super-admin.controller.js");
        return assignLead(req, res);
    } catch (err) {
        next(err);
    }
});

// -- 11. DIRECT ORG PROVISIONING (no demo required)
router.post("/provision-direct", async (req, res) => {
    try {
        const { institutionName, orgType, adminName, adminEmail, adminPhone, city, state, plan } = req.body;

        if (!institutionName || !adminEmail || !adminName) {
            return res.status(400).json({ success: false, message: "institutionName, adminName, and adminEmail are required" });
        }

        const { approveLeadAndProvision } = await import("../services/lead-conversion.service.js");
        const DemoRequest = (await import("../models/DemoRequest.js")).default;

        // Create a synthetic lead so we can reuse the existing provisioning pipeline
        const lead = await DemoRequest.create({
            institutionName,
            orgType: orgType || "school",
            adminName,
            adminEmail,
            adminPhone: adminPhone || "0000000000",
            city: city || "N/A",
            state: state || "N/A",
            status: "new",
            lifecycleStage: "lead_created",
        });

        const result = await approveLeadAndProvision(lead._id, { plan: plan || "demo" }, req.user?._id || null);

        return res.status(201).json({
            success: true,
            message: `Organization "${institutionName}" provisioned successfully`,
            organization: result.organization,
            admin: {
                _id: result.admin?._id,
                name: result.admin?.name,
                email: result.admin?.email,
            },
            activation: result.activation,
            warnings: result.warnings || [],
        });
    } catch (err) {
        console.error("[SuperAdmin] provision-direct error:", err.message);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Provisioning failed" });
    }
});


// -- 10. HELPDESK / COMMUNICATION CENTER
router.get("/helpdesk/threads", listSuperAdminSupportConversations);
router.get("/helpdesk/threads/:threadId", getSuperAdminSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", sendSuperAdminSupportMessage);
router.patch("/helpdesk/threads/:threadId", updateSuperAdminSupportConversation);
router.patch("/helpdesk/threads/:threadId/read", markSuperAdminSupportConversationRead);


// -- 12. PLATFORM TEAM MANAGEMENT
router.get("/team", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const { getIO } = await import("../services/socket.service.js");

        const platformRoles = ["super_admin", "co_super_admin"];
        const teamDocs = await User.find({ role: { $in: platformRoles } })
            .select("name email role status isEmailVerified createdAt lastSeen lastLoginAt profilePicture")
            .sort({ createdAt: -1 })
            .lean();
        
        // Get online users using Socket.io
        let onlineUserIds = new Set();
        try {
            const sockets = await getIO().fetchSockets();
            sockets.forEach(s => {
                if (s.userId) onlineUserIds.add(s.userId.toString());
            });
        } catch (e) {
            console.error("[Team] error fetching sockets:", e.message);
        }
        
        // Map lastLoginAt to lastLogin to match frontend expectations, and include profilePicture
        const team = teamDocs.map(user => {
            // Extract creation date from ObjectId for legacy accounts missing createdAt
            const fallbackDate = new Date(parseInt(user._id.toString().substring(0, 8), 16) * 1000);
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                isEmailVerified: user.isEmailVerified,
                createdAt: user.createdAt || fallbackDate,
                lastLogin: user.lastLoginAt, // Keep if frontend uses it for legacy
                lastSeen: user.lastSeen,
                profilePicture: user.profilePicture,
                isOnline: onlineUserIds.has(user._id.toString())
            };
        });

        res.json({ success: true, team });
    } catch (err) {
        console.error("[Team] list error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/team/invite", async (req, res) => {
    try {
        const { name, email, personalEmail, password, role } = req.body;
        if (!name || !email || !role) {
            return res.status(400).json({ success: false, message: "name, email, and role are required" });
        }
        const allowedRoles = ["super_admin", "co_super_admin"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid platform role" });
        }

        const User = (await import("../models/User.js")).default;
        const bcrypt = (await import("bcryptjs")).default;

        const existing = await User.findOne({ email: email.toLowerCase().trim() }).lean();
        if (existing) {
            return res.status(409).json({ success: false, message: "A user with this email already exists" });
        }

        // Use admin-provided password, or auto-generate if not provided
        const crypto = (await import("crypto")).default;
        const tempPassword = password && password.trim() !== "" ? password.trim() : crypto.randomBytes(12).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        const member = await User.create({
            name,
            email: email.toLowerCase().trim(),
            role,
            password: passwordHash,
            isEmailVerified: false,
            status: "pending",
            mustResetPassword: true,
            organization_id: null,
        });

        const { sendEmail } = await import("../services/aws-ses.service.js");
        
        const loginUrl = "https://superadmin.classgrid.in/superadmin/login";
        const classgridEmail = email.toLowerCase().trim();
        const roleName = role.replace("platform_", "").replace(/_/g, " ").toUpperCase();
        const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body, html {
            margin: 0; padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f5f5f5;
            -webkit-font-smoothing: antialiased;
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;width:100%;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%;">
                
                <tr>
                  <td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
                    <img src="https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                    <h1 style="color:#111111;margin:0;font-size:22px;">Welcome to the Classgrid team, ${name}!</h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding:30px;color:#374151;font-size:15px;line-height:1.7;text-align:left;">
                    <p style="margin:0 0 16px 0; color:#374151;">We are absolutely thrilled to officially welcome you aboard. The entire team is excited to have you join us. As we continue to scale our platform and expand our community, your expertise and vision will be an invaluable asset to our mission.</p>
                    <p style="margin:0 0 32px 0; color:#374151;">To help you hit the ground running, we've outlined your core focus areas and the initial resources you'll need below.</p>
                    
                    <h3 style="color:#111111; margin:0 0 16px 0; text-transform:uppercase; font-size:14px; letter-spacing:1px; border-bottom:1px solid #eaeaea; padding-bottom:8px;">Your Responsibilities</h3>
                    <ul style="margin:0 0 32px 0; padding-left:20px; color:#374151;">
                      <li style="margin-bottom:8px;"><strong>Marketing Site:</strong> Maintain the marketing codebase and send PRs. (<a href="https://github.com/Classgrid/Classgrid_marketting" style="color:#2563eb;text-decoration:underline;">Repository</a>)</li>
                      <li style="margin-bottom:8px;"><strong>Main Platform:</strong> Contribute directly to our core desktop platform. (<a href="https://github.com/Classgrid/classgrid_platoform-desktop-" style="color:#2563eb;text-decoration:underline;">Repository</a>)</li>
                      <li style="margin-bottom:8px;"><strong>Infrastructure:</strong> Help maintain our CI/CD GitHub Actions and monitor Vercel deployment stability.</li>
                      <li style="margin-bottom:8px;"><strong>Growth & Analytics:</strong> Oversee user tracking via <a href="https://posthog.com/" style="color:#2563eb;text-decoration:underline;">PostHog</a> and lead our Google SEO strategies.</li>
                      <li style="margin-bottom:8px;"><strong>Content Management:</strong> Manage new blog posts and changelog updates via our Sanity CMS.</li>
                    </ul>

                    <h3 style="color:#111111; margin:0 0 16px 0; text-transform:uppercase; font-size:14px; letter-spacing:1px; border-bottom:1px solid #eaeaea; padding-bottom:8px;">Official Account Access</h3>
                    <p style="margin:0 0 20px 0; color:#374151;">We use Zoho Mail exclusively for all official Classgrid email communications (we do not use Gmail). Below are your temporary credentials.</p>
                    
                    <!-- CREDENTIALS BOX -->
                    <div style="background-color:#f9f9f9; border:1px solid #eaeaea; border-radius:8px; padding:20px; margin-bottom:24px;">
                      <div style="font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:#6b7280; margin-bottom:8px; font-weight:600;">Email Address</div>
                      <div style="font-family:monospace; font-size:18px; color:#111111; font-weight:bold; background-color:#ffffff; padding:12px 14px; border-radius:6px; border:1px solid #eaeaea; margin-bottom:16px;"><a href="mailto:${classgridEmail}" style="color:#111111 !important; text-decoration:none;">${classgridEmail}</a></div>
                      
                      <div style="font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:#6b7280; margin-bottom:8px; font-weight:600;">Temporary Password</div>
                      <div style="font-family:monospace; font-size:18px; color:#111111; font-weight:bold; background-color:#ffffff; padding:12px 14px; border-radius:6px; border:1px solid #eaeaea;">${tempPassword}</div>
                    </div>
                    
                    <p style="margin:0 0 24px 0; color:#374151;">Please log in and <strong>change your temporary password</strong> immediately.</p>
                    
                    <!-- Google Account Setup Instructions -->
                    <div style="background-color:#f0fdf4; border-left:3px solid #34d399; padding:16px 20px; border-radius:4px; margin-bottom:24px;">
                      <h4 style="color:#111111; margin:0 0 12px 0; font-size:16px;">Setup Your Chrome Profile & Workspace</h4>
                      <p style="margin:0 0 12px 0;color:#374151;font-size:15px;">To get the full workspace experience, please register this email as a Google Account. This allows you to create a dedicated Chrome Browser Profile, set your professional profile photo, use "Continue with Google" across our tools, and access Google Services (excluding Gmail). Follow these steps:</p>
                      <ol style="margin:0; padding-left:20px; color:#374151;">
                        <li style="margin-bottom:6px;">Click <strong>Setup Google Account</strong> below and enter your name and details.</li>
                        <li style="margin-bottom:6px;">When prompted to create an email, click <strong>"Use your existing email"</strong> instead.</li>
                        <li style="margin-bottom:6px;">Enter your Zoho email address from above. Google will send an OTP to it, so <strong>you must log into your Zoho Mailbox first</strong> to retrieve the code and verify it.</li>
                      </ol>
                    </div>
                    
                    <!-- BUTTONS -->
                    <div style="margin-top:24px;margin-bottom:32px;">
                      <a href="https://mail.zoho.in/zm/#mail/views/unread" style="display:inline-block; background-color:#34d399; color:#000000; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px; margin-right:12px; margin-bottom:12px;">Login to Zoho Mailbox</a>
                      <a href="https://accounts.google.com/signup" style="display:inline-block; background-color:#111111; color:#ffffff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px; margin-bottom:12px;">Setup Google Account</a>
                    </div>

                    <!-- NEW: SUPER ADMIN DASHBOARD ACCESS -->
                    <h3 style="color:#111111; margin:0 0 16px 0; text-transform:uppercase; font-size:14px; letter-spacing:1px; border-bottom:1px solid #eaeaea; padding-bottom:8px;">Classgrid Super Admin Dashboard</h3>
                    <p style="margin:0 0 16px 0; color:#374151;">You have been assigned the role of <strong>${roleName}</strong> on the Classgrid Super Admin Dashboard. This gives you administrative access to manage the entire platform — organizations, users, billing, analytics, and more.</p>
                    <p style="margin:0 0 20px 0; color:#374151;">Use the <strong>same Classgrid email and password</strong> shown above to log in.</p>
                    <div style="margin-bottom:32px;">
                      <a href="https://superadmin.classgrid.in/superadmin/login" style="display:inline-block; background-color:#f9f9f9; color:#111111; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px; border:1px solid #eaeaea;">Login to Super Admin Dashboard</a>
                    </div>

                    <!-- NEW: SANITY STUDIO ACCESS -->
                    <h3 style="color:#111111; margin:0 0 16px 0; text-transform:uppercase; font-size:14px; letter-spacing:1px; border-bottom:1px solid #eaeaea; padding-bottom:8px;">Classgrid Sanity Studio (CMS)</h3>
                    <p style="margin:0 0 16px 0; color:#374151;">You also have access to our <strong>Sanity Studio</strong> — the content management system where you can manage blog posts, changelogs, case studies, help articles, and all website content. Use the <strong>same Classgrid email</strong> to sign in via Google.</p>
                    <div style="margin-bottom:32px;">
                      <a href="https://studio.classgrid.in/" style="display:inline-block; background-color:#111111; color:#ffffff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px;">Open Sanity Studio</a>
                    </div>
                    
                    <!-- SIGNATURE -->
                    <div style="margin-top:40px;">
                      <p style="margin:0; color:#111111; font-weight:bold; font-size:16px;">Nikhil Shinde</p>
                      <p style="margin:0; font-size:14px; color:#6b7280;">Founder, Classgrid</p>
                    </div>
                  </td>
                </tr>
                
                <!-- FOOTER -->
                <tr>
                  <td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;background:#f9f9f9;">
                    <p style="color:#9ca3af;font-size:11px;line-height:1.5;margin:0;">
                      &copy; ${new Date().getFullYear()} Classgrid. All rights reserved.<br>
                      Secure access message. Do not forward this email.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
        `;

        // Send the email to personalEmail if provided, otherwise fall back to the classgrid email
        const toEmail = personalEmail && personalEmail.trim() !== "" 
            ? personalEmail.toLowerCase().trim() 
            : classgridEmail;

        await sendEmail({
            to: toEmail,
            fromEmail: "nikhil.shinde@classgrid.in",
            fromName: "Nikhil Shinde",
            subject: "Welcome to Classgrid! Your Account Credentials Inside",
            html: emailHtml,
            text: `Welcome to Classgrid, ${name}! Your login email is: ${classgridEmail}. Your temporary password is: ${tempPassword}. Please log in at ${loginUrl} to reset it.`,
        });

        // For now log the temp password in dev
        if (process.env.NODE_ENV !== "production") {
            console.log(`[Team Invite] ${classgridEmail} temp password: ${tempPassword}`);
        }

        try {
            const { getIO } = await import("../services/socket.service.js");
            getIO().emit("platform_team_updated");
        } catch (e) {
            console.error("[Team] socket emit error:", e.message);
        }

        res.status(201).json({
            success: true,
            message: `Invitation created for ${classgridEmail}. Welcome email sent to ${toEmail}.`,
            member: { _id: member._id, name: member.name, email: member.email, role: member.role, status: member.status },
        });
    } catch (err) {
        console.error("[Team] invite error:", err.message);
        res.status(500).json({ success: false, message: err.message || "Server error" });
    }
});

router.patch("/team/:id/role", async (req, res) => {
    try {
        const { role } = req.body;
        const allowedRoles = ["super_admin", "platform_support", "platform_sales", "platform_moderator", "platform_analyst"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid platform role" });
        }
        const User = (await import("../models/User.js")).default;
        await User.findByIdAndUpdate(req.params.id, { $set: { role } });
        
        try {
            const { getIO } = await import("../services/socket.service.js");
            getIO().emit("platform_team_updated");
        } catch (e) {
            console.error("[Team] socket emit error:", e.message);
        }
        
        res.json({ success: true, message: "Role updated" });
    } catch (err) {
        console.error("[Team] role update error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.delete("/team/:id", async (req, res) => {
    try {
        // Cannot remove self
        if (req.params.id === req.user?._id?.toString()) {
            return res.status(400).json({ success: false, message: "You cannot remove yourself." });
        }
        const User = (await import("../models/User.js")).default;
        const member = await User.findById(req.params.id).select("role email name").lean();
        if (!member) return res.status(404).json({ success: false, message: "Team member not found" });

        // Safety: never delete the god-owner or founder
        const PROTECTED_EMAILS = [
            (process.env.SUPER_ADMIN_EMAIL || "support@classgrid.in").toLowerCase(),
            "nikhil.shinde@classgrid.in"
        ];
        if (PROTECTED_EMAILS.includes(member.email.toLowerCase())) {
            // Log this unauthorized attempt
            console.warn(`🚨 [SECURITY] Attempted deletion of PROTECTED account "${member.email}" by user ${req.user?.email || "unknown"} (ID: ${req.user?._id || "unknown"})`);
            return res.status(403).json({ success: false, message: "This is a protected founder account and cannot be removed by anyone." });
        }

        await User.findByIdAndDelete(req.params.id);
        
        try {
            const { getIO } = await import("../services/socket.service.js");
            getIO().emit("platform_team_updated");
        } catch (e) {
            console.error("[Team] socket emit error:", e.message);
        }
        
        res.json({ success: true, message: "Team member removed" });
    } catch (err) {
        console.error("[Team] remove error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// -- 13. PLATFORM REVENUE DASHBOARD
router.get("/revenue", async (req, res) => {
    try {
        const OrgSubscription = (await import("../models/OrgSubscription.js")).default;
        const OrganizationUsage = (await import("../models/OrganizationUsage.js")).default;
        const Organization = (await import("../models/Organization.js")).default;

        const subscriptions = await OrgSubscription.find({}).lean();
        const usages = await OrganizationUsage.find({}).lean();
        const orgs = await Organization.find({}).select("name ownerEmail").lean();

        let mrr = 0;
        let totalIncome = 0;
        let lostRevenue = 0;
        let activeSubs = 0;

        const usageMap = {};
        usages.forEach(u => {
            usageMap[u.orgId.toString()] = u;
        });
        const orgMap = {};
        orgs.forEach(o => {
            orgMap[o._id.toString()] = o;
        });

        const recentTransactions = [];

        for (const sub of subscriptions) {
            const orgId = sub.organization_id.toString();
            const usage = usageMap[orgId];
            const org = orgMap[orgId];
            if (!org) continue;

            const billing = sub.billing || {};
            const base = billing.basePricePerMonth || 0;
            const estimatedValue = base;

            if (sub.plan === "active" && sub.status === "active") {
                mrr += estimatedValue;
                activeSubs++;
                // Dummy transaction representation based on active status
                if (estimatedValue > 0) {
                    recentTransactions.push({
                        id: `txn_${orgId.substring(0, 8)}`,
                        orgName: org.name,
                        amount: estimatedValue,
                        status: "successful",
                        date: sub.updatedAt || sub.createdAt,
                        plan: "active"
                    });
                    totalIncome += estimatedValue * 3; // mock past income
                }
            } else if (sub.plan === "demo" || sub.status !== "active") {
                lostRevenue += estimatedValue;
            }
        }

        res.json({
            success: true,
            data: {
                mrr,
                totalIncome,
                lostRevenue,
                activeSubs,
                recentTransactions: recentTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
            }
        });
    } catch (err) {
        console.error("[SuperAdmin] revenue error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── GOD MODE: ORGANIZATION CONTROL ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Suspend an organization (sets status: suspended, blocks all member logins)
router.patch("/organizations/:id/suspend", async (req, res) => {
    try {
        const { reason = "Suspended by Super Admin" } = req.body;
        const Organization = (await import("../models/Organization.js")).default;
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;

        // Snapshot previous state for rollback
        const prev = await Organization.findById(req.params.id).select("status name").lean();
        if (!prev) return res.status(404).json({ success: false, message: "Org not found" });

        const org = await Organization.findByIdAndUpdate(
            req.params.id,
            { $set: { status: "suspended", suspendedReason: reason, suspendedAt: new Date(), suspendedBy: req.user._id } },
            { returnDocument: 'after' }
        ).lean();

        // Audit log
        await AdminAuditLog.create({
            actorId: req.user._id,
            actorName: req.user.name,
            actorRole: "super_admin",
            action: "org.suspend",
            targetId: org._id.toString(),
            targetName: org.name,
            targetType: "organization",
            previousState: { status: prev.status },
            metadata: { reason },
            rollbackStatus: "none",
            ip: req.ip,
            userAgent: req.headers["user-agent"] ?? "",
        }).catch(e => console.error("[AuditLog] suspend-org write failed:", e.message));

        res.json({ success: true, message: `Organization "${org.name}" suspended.`, org });
    } catch (err) {
        console.error("[SuperAdmin] suspend-org error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Activate a suspended organization
router.patch("/organizations/:id/activate", async (req, res) => {
    try {
        const Organization = (await import("../models/Organization.js")).default;
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;

        const prev = await Organization.findById(req.params.id).select("status name").lean();
        if (!prev) return res.status(404).json({ success: false, message: "Org not found" });

        const org = await Organization.findByIdAndUpdate(
            req.params.id,
            { $set: { status: "active" }, $unset: { suspendedReason: "", suspendedAt: "", suspendedBy: "" } },
            { returnDocument: 'after' }
        ).lean();

        await AdminAuditLog.create({
            actorId: req.user._id, actorName: req.user.name, actorRole: "super_admin",
            action: "org.activate", targetId: org._id.toString(), targetName: org.name,
            targetType: "organization", previousState: { status: prev.status },
            rollbackStatus: "none", ip: req.ip, userAgent: req.headers["user-agent"] ?? "",
        }).catch(e => console.error("[AuditLog] activate-org write failed:", e.message));

        res.json({ success: true, message: `Organization "${org.name}" re-activated.`, org });
    } catch (err) {
        console.error("[SuperAdmin] activate-org error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── GOD MODE: USER CONTROL (ACROSS ALL ORGS) ─────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Global user search (across all organizations)
router.get("/users", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const Organization = (await import("../models/Organization.js")).default;
        const { q = "", role, orgId, status, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};
        if (q.trim()) {
            filter.$or = [
                { name: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
            ];
        }
        if (role) filter.role = role;
        if (orgId) filter.organization_id = orgId;
        if (status) filter.status = status;

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("name email role status isEmailVerified organization_id createdAt lastLoginAt profilePicture")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(filter),
        ]);

        // Attach org data
        const orgIds = [...new Set(users.map(u => u.organization_id?.toString()).filter(Boolean))];
        const orgs = await Organization.find({ _id: { $in: orgIds } }).select("name logo_url org_type").lean();
        const orgMap = Object.fromEntries(orgs.map(o => [o._id.toString(), o]));

        const enriched = users.map(u => {
            const org = u.organization_id ? orgMap[u.organization_id.toString()] : null;
            return {
                ...u,
                organizationName: org ? org.name : "Unknown",
                organizationLogo: org ? org.logo_url : null,
                orgType: org ? org.org_type : null,
            };
        });

        res.json({ success: true, data: enriched, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("[SuperAdmin] global-users error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Get full user details (including all profile data and org details)
router.get("/users/:id/full", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        
        // Find user and populate organization with all fields
        const user = await User.findById(req.params.id)
            .populate("organization_id")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Clean sensitive fields
        delete user.password;
        if (user.tokens) delete user.tokens;
        if (user.zoom_tokens) delete user.zoom_tokens;
        if (user.webex_tokens) delete user.webex_tokens;

        const profile = await UserProfile.findOne({ user: req.params.id }).lean();
        const orgType = user.organization_id?.org_type || "school";
        const schema = getProfileSchema(user.role, orgType);

        res.json({
            success: true,
            data: {
                user,
                organization: user.organization_id || null,
                profile,
                schema
            }
        });
    } catch (err) {
        console.error("[SuperAdmin] get user full error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Ban / suspend a user (God mode: no org restriction)
router.patch("/users/:id/ban", async (req, res) => {
    try {
        const { reason = "Banned by Super Admin" } = req.body;
        const User = (await import("../models/User.js")).default;
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;

        const prev = await User.findById(req.params.id).select("status name email").lean();
        if (!prev) return res.status(404).json({ success: false, message: "User not found" });

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { status: "suspended", bannedReason: reason, bannedAt: new Date() } },
            { returnDocument: 'after' }
        ).select("name email status").lean();

        await AdminAuditLog.create({
            actorId: req.user._id, actorName: req.user.name, actorRole: "super_admin",
            action: "user.ban", targetId: user._id.toString(), targetName: user.name,
            targetType: "user", previousState: { status: prev.status },
            metadata: { reason }, rollbackStatus: "none",
            ip: req.ip, userAgent: req.headers["user-agent"] ?? "",
        }).catch(e => console.error("[AuditLog] user.ban write failed:", e.message));

        res.json({ success: true, message: `User "${user.name}" banned.`, user });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Unban / reactivate a user
router.patch("/users/:id/unban", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;

        const prev = await User.findById(req.params.id).select("status name").lean();
        if (!prev) return res.status(404).json({ success: false, message: "User not found" });

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { status: "active" }, $unset: { bannedReason: "", bannedAt: "" } },
            { returnDocument: 'after' }
        ).select("name email status").lean();

        await AdminAuditLog.create({
            actorId: req.user._id, actorName: req.user.name, actorRole: "super_admin",
            action: "user.unban", targetId: user._id.toString(), targetName: user.name,
            targetType: "user", previousState: { status: prev.status },
            rollbackStatus: "none", ip: req.ip, userAgent: req.headers["user-agent"] ?? "",
        }).catch(e => console.error("[AuditLog] user.unban write failed:", e.message));

        res.json({ success: true, message: `User "${user.name}" reactivated.`, user });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Force logout a user (invalidate their session by bumping passwordChangedAt)
router.post("/users/:id/force-logout", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { passwordChangedAt: new Date() } },
            { returnDocument: 'after' }
        ).select("name email").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, message: `User "${user.name}" force-logged-out.` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Send password reset email to any user
router.post("/users/:id/reset-password", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const crypto = (await import("crypto")).default;
        const { sendEmail } = await import("../services/aws-ses.service.js");

        const user = await User.findById(req.params.id).select("name email").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await User.findByIdAndUpdate(req.params.id, {
            $set: { resetPasswordToken: token, resetPasswordExpires: expires }
        });

        const resetUrl = `${process.env.FRONTEND_URL || "https://classgrid.in"}/reset-password?token=${token}`;
        await sendEmail({
            to: user.email,
            subject: "Password Reset — Classgrid",
            html: `<p>Hi ${user.name},</p><p>A Super Admin has requested a password reset for your account.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour.</p>`,
            text: `Password reset link: ${resetUrl}`,
        });

        res.json({ success: true, message: `Password reset email sent to ${user.email}.` });
    } catch (err) {
        console.error("[SuperAdmin] reset-password error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Update user role (God mode)
router.patch("/users/:id/role", async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) return res.status(400).json({ success: false, message: "role is required" });
        const User = (await import("../models/User.js")).default;
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;

        const prev = await User.findById(req.params.id).select("role name").lean();
        if (!prev) return res.status(404).json({ success: false, message: "User not found" });

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { role } },
            { returnDocument: 'after' }
        ).select("name email role").lean();

        await AdminAuditLog.create({
            actorId: req.user._id, actorName: req.user.name, actorRole: "super_admin",
            action: "user.role_change", targetId: user._id.toString(), targetName: user.name,
            targetType: "user", previousState: { role: prev.role },
            metadata: { newRole: role }, rollbackStatus: "none",
            ip: req.ip, userAgent: req.headers["user-agent"] ?? "",
        }).catch(e => console.error("[AuditLog] user.role_change write failed:", e.message));

        res.json({ success: true, message: `Role updated to ${role}.`, user });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Bulk user operations
router.post("/users/bulk", async (req, res) => {
    try {
        const { userIds, action, value } = req.body;
        if (!userIds?.length || !action) {
            return res.status(400).json({ success: false, message: "userIds and action are required" });
        }
        const User = (await import("../models/User.js")).default;
        const allowedActions = ["ban", "unban", "force-logout", "set-role"];
        if (!allowedActions.includes(action)) {
            return res.status(400).json({ success: false, message: "Invalid action" });
        }

        let update = {};
        if (action === "ban") update = { $set: { status: "suspended" } };
        else if (action === "unban") update = { $set: { status: "active" } };
        else if (action === "force-logout") update = { $set: { passwordChangedAt: new Date() } };
        else if (action === "set-role" && value) update = { $set: { role: value } };

        const result = await User.updateMany({ _id: { $in: userIds } }, update);
        res.json({ success: true, message: `Bulk action "${action}" applied to ${result.modifiedCount} users.` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── GOD MODE: SYSTEM HEALTH EXTENDED ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Extended system metrics
router.get("/system-metrics", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const Organization = (await import("../models/Organization.js")).default;
        const EmailJob = (await import("../models/EmailJob.js")).default;
        const SystemLog = (await import("../models/SystemLog.js")).default;

        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);
        const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const [totalUsers, totalOrgs, activeOrgs, suspendedOrgs,
               emailsPending, emailsSent, emailsFailed,
               errorLogs24h, warnLogs24h,
               newUsers7d, newOrgs7d] = await Promise.all([
            User.countDocuments({}),
            Organization.countDocuments({}),
            Organization.countDocuments({ status: "active" }),
            Organization.countDocuments({ status: "suspended" }),
            EmailJob.countDocuments({ status: "pending" }),
            EmailJob.countDocuments({ status: "sent" }),
            EmailJob.countDocuments({ status: "failed" }),
            SystemLog.countDocuments({ level: "error", timestamp: { $gte: last24h } }),
            SystemLog.countDocuments({ level: "warn", timestamp: { $gte: last24h } }),
            User.countDocuments({ createdAt: { $gte: last7d } }),
            Organization.countDocuments({ createdAt: { $gte: last7d } }),
        ]);

        res.json({
            success: true,
            data: {
                users: { total: totalUsers, new7d: newUsers7d },
                orgs: { total: totalOrgs, active: activeOrgs, suspended: suspendedOrgs, new7d: newOrgs7d },
                emails: { pending: emailsPending, sent: emailsSent, failed: emailsFailed },
                logs: { errors24h: errorLogs24h, warnings24h: warnLogs24h },
                uptime: process.uptime(),
                memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                nodeVersion: process.version,
                timestamp: now.toISOString(),
            },
        });
    } catch (err) {
        console.error("[SuperAdmin] system-metrics error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── REVENUE AGGREGATION ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

router.get("/revenue/by-organization", async (req, res) => {
    try {
        const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
        const Organization = (await import("../models/Organization.js")).default;
        
        const { organizationId, organizationType, startDate, endDate, search } = req.query;
        
        const match = { status: "success" };
        if (organizationId) match.organizationId = organizationId;
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        // We will fetch matching orgs if there is a search or organizationType filter
        let validOrgIds = null;
        if (organizationType || search) {
            const orgFilter = {};
            if (organizationType && organizationType !== "ALL") orgFilter.type = organizationType;
            if (search) orgFilter.name = new RegExp(search, "i");
            const orgs = await Organization.find(orgFilter).select('_id');
            validOrgIds = orgs.map(o => o._id.toString());
            match.organizationId = { $in: validOrgIds };
        }

        const agg = await PlatformTransaction.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$organizationId",
                    organizationName: { $first: "$organizationName" },
                    grossRevenuePaise: { $sum: { $multiply: ["$amount", 100] } },
                    transactionCount: { $sum: 1 },
                    latestTransactionDate: { $max: "$createdAt" }
                }
            },
            { $sort: { grossRevenuePaise: -1 } }
        ]);

        return res.json({ success: true, data: agg });
    } catch (err) {
        console.error("Revenue By Org error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/revenue/by-type", async (req, res) => {
    try {
        const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
        const Organization = (await import("../models/Organization.js")).default;
        
        const { organizationId, organizationType, startDate, endDate, search } = req.query;
        
        const match = { status: "success" };
        if (organizationId) match.organizationId = organizationId;
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        if (organizationType || search) {
            const orgFilter = {};
            if (organizationType && organizationType !== "ALL") orgFilter.type = organizationType;
            if (search) orgFilter.name = new RegExp(search, "i");
            const orgs = await Organization.find(orgFilter).select('_id');
            match.organizationId = { $in: orgs.map(o => o._id.toString()) };
        }

        const agg = await PlatformTransaction.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$type",
                    grossRevenuePaise: { $sum: { $multiply: ["$amount", 100] } },
                    transactionCount: { $sum: 1 },
                }
            },
            { $sort: { grossRevenuePaise: -1 } }
        ]);

        return res.json({ success: true, data: agg });
    } catch (err) {
        console.error("Revenue By Type error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── PLATFORM TRANSACTIONS (Billing History + Refunds) ────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// List all platform transactions (with pagination + org filter)
router.get("/transactions", async (req, res) => {
    try {
        const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
        const { orgId, organizationId, status, type, search, startDate, endDate, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};
        if (orgId || organizationId) filter.organizationId = orgId || organizationId;
        if (status && status !== "ALL") { filter.status = status; } else { filter.status = { $ne: "failed" }; }
        if (type && type !== "ALL") filter.type = type;
        if (search) {
            filter.$or = [
                { razorpayPaymentId: new RegExp(search, "i") },
                { razorpayOrderId: new RegExp(search, "i") },
                { organizationName: new RegExp(search, "i") },
                { userName: new RegExp(search, "i") },
                { userEmail: new RegExp(search, "i") },
            ];
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [txns, total] = await Promise.all([
            PlatformTransaction.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("organizationId", "name").populate("userId", "profilePicture")
                .populate("processedBy", "name email")
                .lean(),
            PlatformTransaction.countDocuments(filter),
        ]);

        res.json({ success: true, data: txns, total, page: parseInt(page) });
    } catch (err) {
        console.error("[SuperAdmin] transactions list error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Get single platform transaction
router.get("/transactions/:id", async (req, res) => {
    try {
        const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
        const txn = await PlatformTransaction.findById(req.params.id)
            .populate("organizationId", "name").populate("userId", "profilePicture")
            .populate("processedBy", "name email")
            .lean();
            
        if (!txn) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }
        
        // Enrich with PaymentTransaction data OR fetch directly from Razorpay if missing
        if (txn && txn.razorpayPaymentId) {
            let fetchedFromRzp = false;
            try {
                const razorpayService = (await import("../services/razorpay.service.js")).default;
                const rzp = razorpayService.getPlatformInstance();
                const payment = await rzp.payments.fetch(txn.razorpayPaymentId);
                
                if (payment) {
                    fetchedFromRzp = true;
                    txn.feePaise = payment.fee || 0;
                    txn.taxPaise = payment.tax || 0;
                    txn.bankRRN = payment.acquirer_data?.rrn || payment.acquirer_data?.bank_transaction_id || payment.bank_transaction_id || null;
                    
                    let methodStr = payment.method || "";
                    if (methodStr === "upi" && payment.vpa) methodStr = `upi:${payment.vpa}`;
                    else if (methodStr === "card" && payment.card) {
                        methodStr = `card:${payment.card.network} ${payment.card.last4}`;
                        txn.cardDetails = {
                            type: payment.card.type || "",
                            subType: payment.card.sub_type || "",
                            issuer: payment.card.issuer || "",
                            network: payment.card.network || "",
                            last4: payment.card.last4 || "",
                            name: payment.card.name || "",
                            cardId: payment.card_id || "",
                            authCode: payment.acquirer_data?.auth_code || ""
                        };
                    }
                    else if (methodStr === "netbanking" && payment.bank) methodStr = `netbanking:${payment.bank}`;
                    
                    if (methodStr) txn.paymentMethod = methodStr;
                    
                    if (!txn.userEmail && payment.email) txn.userEmail = payment.email;
                    if (!txn.userMobile && payment.contact) txn.userMobile = payment.contact;
                }
            } catch (e) {
                console.error("[SuperAdmin] Failed to fetch live Razorpay payment:", e.message);
            }

            if (!fetchedFromRzp) {
                const PaymentTransaction = (await import("../models/PaymentTransaction.js")).default;
                const payTxn = await PaymentTransaction.findOne({ providerPaymentId: txn.razorpayPaymentId }).lean();
                if (payTxn) {
                    txn.feePaise = payTxn.feePaise ?? 0;
                    txn.taxPaise = payTxn.taxPaise ?? 0;
                    txn.sourceIp = payTxn.sourceIp || null;
                    txn.bankRRN = payTxn.bankReference || null;
                }
            }
        }
        res.json({ success: true, data: txn });
    } catch (err) {
        console.error("[SuperAdmin] get transaction error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Record a manual transaction (Super Admin logs a manual payment)
router.post("/transactions", async (req, res) => {
    try {
        const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
        const Organization = (await import("../models/Organization.js")).default;

        const { organizationId, amount, type = "manual", note, planActivated, newExpiresAt } = req.body;
        if (!organizationId || !amount) {
            return res.status(400).json({ success: false, message: "organizationId and amount are required" });
        }

        const org = await Organization.findById(organizationId).select("name").lean();
        if (!org) return res.status(404).json({ success: false, message: "Org not found" });

        const txn = await PlatformTransaction.create({
            organizationId,
            organizationName: org.name,
            processedBy: req.user._id,
            type,
            amount,
            status: "success",
            note,
            planActivated,
            newExpiresAt: newExpiresAt || null,
        });

        const io = req.app.get("io");
        if (io) {
            io.emit("platform_transactions_updated");
        }

        res.json({ success: true, message: "Transaction recorded.", data: txn });
    } catch (err) {
        console.error("[SuperAdmin] record transaction error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Issue a refund (creates a refund transaction + marks original as refunded)
router.post("/transactions/:id/refund", async (req, res) => {
    try {
        const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
        const { reason = "Refund issued by Super Admin" } = req.body;

        const original = await PlatformTransaction.findById(req.params.id).lean();
        if (!original) return res.status(404).json({ success: false, message: "Transaction not found" });
        if (original.status === "refunded") {
            return res.status(400).json({ success: false, message: "Already refunded" });
        }

        // Mark original as refunded
        await PlatformTransaction.findByIdAndUpdate(req.params.id, {
            $set: { status: "refunded", refundReason: reason, refundedAt: new Date() }
        });

        // Create refund record
        const refund = await PlatformTransaction.create({
            organizationId: original.organizationId,
            organizationName: original.organizationName,
            processedBy: req.user._id,
            type: "refund",
            amount: -Math.abs(original.amount),
            status: "success",
            refundOf: original._id,
            refundReason: reason,
            note: `Refund for transaction ${req.params.id}`,
        });

        const io = req.app.get("io");
        if (io) {
            io.emit("platform_transactions_updated");
        }

        res.json({ success: true, message: "Refund issued.", data: refund });
    } catch (err) {
        console.error("[SuperAdmin] refund error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CONTENT MODERATION ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// List all content reports
router.get("/content-reports", async (req, res) => {
    try {
        const ContentReport = (await import("../models/ContentReport.js")).default;
        const { status, contentType, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};
        if (status) filter.status = status;
        if (contentType) filter.contentType = contentType;

        const [reports, total] = await Promise.all([
            ContentReport.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("reportedBy", "name email")
                .populate("reportedUser", "name email")
                .populate("organizationId", "name").populate("userId", "profile_image name email")
                .lean(),
            ContentReport.countDocuments(filter),
        ]);

        res.json({ success: true, data: reports, total, page: parseInt(page) });
    } catch (err) {
        console.error("[SuperAdmin] content-reports error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Resolve a content report
router.patch("/content-reports/:id/resolve", async (req, res) => {
    try {
        const ContentReport = (await import("../models/ContentReport.js")).default;
        const { action = "no_action", note = "" } = req.body;

        const report = await ContentReport.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: "resolved",
                    "resolution.action": action,
                    "resolution.note": note,
                    "resolution.resolvedBy": req.user._id,
                    "resolution.resolvedAt": new Date(),
                },
            },
            { returnDocument: 'after' }
        ).lean();

        if (!report) return res.status(404).json({ success: false, message: "Report not found" });
        res.json({ success: true, message: "Report resolved.", data: report });
    } catch (err) {
        console.error("[SuperAdmin] resolve report error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Dismiss a content report
router.patch("/content-reports/:id/dismiss", async (req, res) => {
    try {
        const ContentReport = (await import("../models/ContentReport.js")).default;
        const report = await ContentReport.findByIdAndUpdate(
            req.params.id,
            { $set: { status: "dismissed", "resolution.action": "no_action", "resolution.resolvedBy": req.user._id, "resolution.resolvedAt": new Date() } },
            { returnDocument: 'after' }
        ).lean();
        if (!report) return res.status(404).json({ success: false, message: "Report not found" });
        res.json({ success: true, message: "Report dismissed.", data: report });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── GDPR / DATA EXPORT & DELETION ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Export all data for a specific user (GDPR Article 20)
router.get("/gdpr/export/:userId", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;

        const user = await User.findById(req.params.userId)
            .select("-password -resetPasswordToken -activationToken -activationCodeHash")
            .lean();

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Collect data from related collections
        const collections = {};
        try {
            const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;
            collections.auditLogs = await AdminAuditLog.find({ userId: req.params.userId }).limit(500).lean();
        } catch (_) { collections.auditLogs = []; }

        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: req.user.email,
            subject: "GDPR Data Export",
            user,
            ...collections,
        };

        res.setHeader("Content-Disposition", `attachment; filename="gdpr-export-${req.params.userId}.json"`);
        res.setHeader("Content-Type", "application/json");
        res.json(exportData);
    } catch (err) {
        console.error("[SuperAdmin] GDPR export error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Anonymize / delete user data (GDPR Article 17 - Right to Erasure)
// Using POST (not DELETE) so the body is reliably parsed by all middleware
router.post("/gdpr/erase/:userId", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;
        const { confirm } = req.body;

        if (confirm !== "ERASE") {
            return res.status(400).json({ success: false, message: "Must send confirm: 'ERASE' to proceed." });
        }

        const user = await User.findById(req.params.userId).lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Safety: never erase a super_admin
        if (user.role === "super_admin") {
            return res.status(403).json({ success: false, message: "Cannot erase a Super Admin account." });
        }

        // Anonymize instead of hard delete (preserves foreign key integrity)
        const anonymizedEmail = `deleted_${Date.now()}@erased.classgrid.in`;
        await User.findByIdAndUpdate(req.params.userId, {
            $set: {
                name: "Deleted User",
                email: anonymizedEmail,
                phoneNumber: "",
                bio: "",
                address: "",
                profilePicture: "",
                status: "deleted",
                password: null,
                googleId: null,
                facebookId: null,
                githubId: null,
                linkedinId: null,
                fcmTokens: [],
                trustedDevices: [],
            },
        });

        // Audit log
        await AdminAuditLog.create({
            actorId: req.user._id, actorName: req.user.name, actorRole: "super_admin",
            action: "user.gdpr_erase", targetId: req.params.userId, targetName: user.name,
            targetType: "user", previousState: { email: user.email, name: user.name },
            metadata: { anonymizedEmail }, rollbackStatus: "none",
            ip: req.ip, userAgent: req.headers["user-agent"] ?? "",
        }).catch(e => console.error("[AuditLog] gdpr_erase write failed:", e.message));

        const io = req.app.get("io");
        if (io) {
            io.emit("platform_gdpr_updated");
        }

        res.json({ success: true, message: `User data erased. Email replaced with ${anonymizedEmail}.` });
    } catch (err) {
        console.error("[SuperAdmin] GDPR erase error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ROLLBACK ACTIONS ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// List rollback-eligible audit log entries (recent, destructive actions)
router.get("/rollback/candidates", async (req, res) => {
    try {
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

        const entries = await AdminAuditLog.find({
            createdAt: { $gte: since },
            action: {
                $in: [
                    "org.suspend", "org.activate", "org.delete",
                    "user.ban", "user.unban", "user.role_change", "user.force_logout",
                    "subscription.update", "feature_flag.toggle",
                ]
            },
            rollbackStatus: { $ne: "rolled_back" },
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("userId", "name email")
            .lean();

        res.json({ success: true, data: entries, total: entries.length });
    } catch (err) {
        console.error("[SuperAdmin] rollback candidates error:", err.message);
        // If AdminAuditLog doesn't have these fields yet, return empty
        res.json({ success: true, data: [], total: 0, note: "Rollback tracking will start from new actions." });
    }
});

// Rollback a specific action
router.post("/rollback/:logId", async (req, res) => {
    try {
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;

        const logEntry = await AdminAuditLog.findById(req.params.logId).lean();
        if (!logEntry) return res.status(404).json({ success: false, message: "Log entry not found" });
        if (logEntry.rollbackStatus === "rolled_back") {
            return res.status(400).json({ success: false, message: "Already rolled back." });
        }

        const { action, targetId, previousState } = logEntry;
        let rollbackMessage = "";

        // Perform the inverse action
        if (action === "org.suspend" && targetId) {
            const Organization = (await import("../models/Organization.js")).default;
            await Organization.findByIdAndUpdate(targetId, { $set: { status: "active" }, $unset: { suspendedReason: "", suspendedAt: "", suspendedBy: "" } });
            rollbackMessage = "Organization re-activated.";
        } else if (action === "org.activate" && targetId) {
            const Organization = (await import("../models/Organization.js")).default;
            await Organization.findByIdAndUpdate(targetId, { $set: { status: "suspended" } });
            rollbackMessage = "Organization suspended (rollback).";
        } else if ((action === "user.ban" || action === "user.unban") && targetId) {
            const User = (await import("../models/User.js")).default;
            const reverseStatus = action === "user.ban" ? "active" : "suspended";
            await User.findByIdAndUpdate(targetId, { $set: { status: reverseStatus } });
            rollbackMessage = `User status rolled back to ${reverseStatus}.`;
        } else if (action === "user.role_change" && targetId && previousState?.role) {
            const User = (await import("../models/User.js")).default;
            await User.findByIdAndUpdate(targetId, { $set: { role: previousState.role } });
            rollbackMessage = `User role rolled back to ${previousState.role}.`;
        } else if (action === "feature_flag.toggle" && targetId) {
            const FeatureFlag = (await import("../models/FeatureFlag.js")).default;
            await FeatureFlag.findOneAndUpdate({ key: targetId }, [{ $set: { isEnabled: { $not: "$isEnabled" } } }]);
            rollbackMessage = "Feature flag toggled back.";
        } else {
            return res.status(400).json({ success: false, message: `Cannot auto-rollback action type: ${action}. Manual intervention required.` });
        }

        // Mark log entry as rolled back
        await AdminAuditLog.findByIdAndUpdate(req.params.logId, {
            $set: { rollbackStatus: "rolled_back", rolledBackBy: req.user._id, rolledBackAt: new Date() }
        });

        res.json({ success: true, message: rollbackMessage });
    } catch (err) {
        console.error("[SuperAdmin] rollback error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── BACKUP & RECOVERY ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Collection stats — count of documents in each major collection
router.get("/backup/stats", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const Organization = (await import("../models/Organization.js")).default;
        const EmailJob = (await import("../models/EmailJob.js")).default;
        const SystemLog = (await import("../models/SystemLog.js")).default;
        const AdminAuditLog = (await import("../models/AdminAuditLog.js")).default;
        const PlatformTransaction = (await import("../models/PlatformTransaction.js")).default;
        const ContentReport = (await import("../models/ContentReport.js")).default;

        const [users, orgs, emails, logs, audits, transactions, reports] = await Promise.all([
            User.countDocuments({}),
            Organization.countDocuments({}),
            EmailJob.countDocuments({}),
            SystemLog.countDocuments({}),
            AdminAuditLog.countDocuments({}),
            PlatformTransaction.countDocuments({}),
            ContentReport.countDocuments({}),
        ]);

        res.json({
            success: true,
            data: {
                collections: [
                    { key: "users", label: "Users", count: users, icon: "users" },
                    { key: "organizations", label: "Organizations", count: orgs, icon: "building" },
                    { key: "transactions", label: "Platform Transactions", count: transactions, icon: "rupee" },
                    { key: "audit_logs", label: "Audit Logs", count: audits, icon: "shield" },
                    { key: "system_logs", label: "System Logs", count: logs, icon: "activity" },
                    { key: "email_queue", label: "Email Queue", count: emails, icon: "mail" },
                    { key: "content_reports", label: "Content Reports", count: reports, icon: "flag" },
                ],
                lastChecked: new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error("[SuperAdmin] backup-stats error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Full data export for a specific collection
router.get("/backup/export/:collection", async (req, res) => {
    try {
        const { collection } = req.params;
        const { limit = 50000 } = req.query;
        const ts = new Date().toISOString().slice(0, 10);

        let data = [];
        let filename = `classgrid-${collection}-${ts}.json`;

        switch (collection) {
            case "users": {
                const User = (await import("../models/User.js")).default;
                data = await User.find({})
                    .select("-password -resetPasswordToken -activationToken -activationCodeHash -google_access_token -google_refresh_token")
                    .limit(parseInt(limit))
                    .lean();
                break;
            }
            case "organizations": {
                const Org = (await import("../models/Organization.js")).default;
                data = await Org.find({}).limit(parseInt(limit)).lean();
                break;
            }
            case "transactions": {
                const PT = (await import("../models/PlatformTransaction.js")).default;
                data = await PT.find({})
                    .populate("organizationId", "name").populate("userId", "profile_image name email")
                    .populate("processedBy", "name email")
                    .limit(parseInt(limit))
                    .lean();
                break;
            }
            case "audit_logs": {
                const AL = (await import("../models/AdminAuditLog.js")).default;
                data = await AL.find({})
                    .populate("userId", "name email")
                    .sort({ createdAt: -1 })
                    .limit(parseInt(limit))
                    .lean();
                break;
            }
            case "system_logs": {
                const SL = (await import("../models/SystemLog.js")).default;
                data = await SL.find({}).sort({ timestamp: -1 }).limit(parseInt(limit)).lean();
                break;
            }
            case "email_queue": {
                const EJ = (await import("../models/EmailJob.js")).default;
                data = await EJ.find({}).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
                break;
            }
            case "content_reports": {
                const CR = (await import("../models/ContentReport.js")).default;
                data = await CR.find({})
                    .populate("reportedBy", "name email")
                    .populate("reportedUser", "name email")
                    .limit(parseInt(limit))
                    .lean();
                break;
            }
            default:
                return res.status(400).json({ success: false, message: `Unknown collection: ${collection}` });
        }

        const payload = {
            exportedAt: new Date().toISOString(),
            exportedBy: req.user?.email ?? "super_admin",
            collection,
            totalRecords: data.length,
            data,
        };

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/json");
        res.json(payload);
    } catch (err) {
        console.error("[SuperAdmin] export error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Integrity check — verifies orphaned records, broken refs
router.get("/backup/integrity", async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const Organization = (await import("../models/Organization.js")).default;

        // Step 1: Get all valid org IDs from the Organization collection
        const validOrgs = await Organization.find({}).select("_id").lean();
        const validOrgIdSet = new Set(validOrgs.map(o => o._id.toString()));

        // Step 2: Get all users who have an organization_id assigned
        const usersWithOrg = await User.find({
            organization_id: { $ne: null },
            role: { $ne: "super_admin" },
        }).select("organization_id").lean();

        // Step 3: Count users whose org no longer exists
        const orphanedUsers = usersWithOrg.filter(
            u => u.organization_id && !validOrgIdSet.has(u.organization_id.toString())
        ).length;

        // Step 4: Other integrity checks
        const suspendedOrgs = await Organization.countDocuments({ status: "suspended" });
        const deletedUsers = await User.countDocuments({ status: "deleted" });
        const superAdminCount = await User.countDocuments({ role: "super_admin" });

        const issues = [];
        if (orphanedUsers > 0) issues.push({ type: "warning", message: `${orphanedUsers} users reference non-existent organizations` });
        if (superAdminCount > 5) issues.push({ type: "warning", message: `${superAdminCount} super admin accounts — review for security` });
        if (suspendedOrgs > 0) issues.push({ type: "info", message: `${suspendedOrgs} organizations currently suspended` });

        res.json({
            success: true,
            data: {
                status: issues.filter(i => i.type === "warning").length > 0 ? "warnings" : "clean",
                checks: [
                    { label: "Orphaned User Records", value: orphanedUsers, ok: orphanedUsers === 0 },
                    { label: "Super Admin Accounts", value: superAdminCount, ok: superAdminCount <= 5 },
                    { label: "Suspended Organizations", value: suspendedOrgs, ok: true },
                    { label: "Deleted Users (Anonymized)", value: deletedUsers, ok: true },
                ],
                issues,
                checkedAt: new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error("[SuperAdmin] integrity check error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Delete endpoints
router.patch("/leads/:id/notes", async (req, res) => {
    try {
        const { id } = req.params;
        const { meetingNotes, meetingStatus, isOrganizationVetted, lifecycleStage, assignedTo, studentCount, staffCount, campusCount, currentSystem, demoReview } = req.body;
        
        const updateData = {};
        if (meetingNotes !== undefined) updateData.meetingNotes = meetingNotes;
        if (meetingStatus !== undefined) updateData.meetingStatus = meetingStatus;
        if (isOrganizationVetted !== undefined) updateData.isOrganizationVetted = isOrganizationVetted;
        if (lifecycleStage !== undefined) updateData.lifecycleStage = lifecycleStage;
        if (assignedTo !== undefined) {
            updateData.assignedTo = assignedTo || null;
            updateData.assignedAt = assignedTo ? new Date() : null;
        }
        if (studentCount !== undefined) updateData.studentCount = studentCount;
        if (staffCount !== undefined) updateData.staffCount = staffCount;
        if (campusCount !== undefined) updateData.campusCount = campusCount;
        if (currentSystem !== undefined) updateData.currentSystem = currentSystem;
        if (demoReview !== undefined) updateData.demoReview = demoReview;

        const mongooseModule = await import("mongoose");
        const mongoose = mongooseModule.default || mongooseModule;
        
        let oldLead = null;
        if (assignedTo !== undefined || isOrganizationVetted !== undefined) {
            oldLead = await mongoose.model('DemoRequest').findById(id).populate("assignedTo", "name email");
        }

        let lead = await mongoose.model('DemoRequest').findByIdAndUpdate(
            id, 
            { $set: updateData }, 
            { returnDocument: 'after' }
        ).populate("assignedTo", "name email profilePicture avatarUrl picture photoUrl").lean();
        
        if (assignedTo !== undefined && assignedTo && lead.assignedTo && (!oldLead || !oldLead.assignedTo || oldLead.assignedTo._id?.toString() !== assignedTo.toString())) {
            try {
                const assignee = await mongoose.model('User').findById(assignedTo).select('name email');
                if (assignee) {
                    const { sendDemoLeadAssignedNotification } = await import("../services/notification-email.service.js");
                    sendDemoLeadAssignedNotification({
                        demoRequest: lead,
                        assignee: assignee,
                        assigner: req.user,
                        notifySuperAdmin: true
                    }).catch(e => console.error("Assignment email async error:", e.message));
                }
            } catch (e) {
                console.error("Failed to send manual assignment notification:", e.message);
            }
        }

        // Check if isOrganizationVetted was just set to true by Nikhil
        if (isOrganizationVetted === true && oldLead && !oldLead.isOrganizationVetted) {
            try {
                // If Nikhil is approving his OWN assigned lead, do not send the email
                const isSelfApprove = lead.assignedTo && req.user?._id?.toString() === lead.assignedTo._id?.toString();
                
                if (lead.assignedTo && req.user?.email?.toLowerCase() === "nikhil.shinde@classgrid.in" && !isSelfApprove) {
                    const { sendVettingApprovedNotification } = await import("../services/notification-email.service.js");
                    sendVettingApprovedNotification({
                        demoRequest: lead,
                        assignee: lead.assignedTo,
                        approver: req.user
                    }).catch(e => console.error("Vetting email async error:", e.message));
                }
            } catch (e) {
                console.error("Failed to send vetting approved notification:", e.message);
            }
        }

        return res.json({ success: true, lead });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false });
    }
});

router.post("/leads/:id/request-vetting-approval", async (req, res) => {
    try {
        const { requestVettingApproval } = await import("../controllers/super-admin.controller.js");
        return await requestVettingApproval(req, res);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false });
    }
});
router.delete("/leads/:id", deleteDemoLead);
router.delete("/support-tickets/:threadId", deleteSuperAdminSupportConversation);


// =================================================
// UPDATE ORGANIZATION STATUS
// =================================================
router.delete("/orgs/:id", isAuthenticated, requireRole("super_admin"), deleteOrganization);
router.put("/orgs/:id/status", isAuthenticated, requireRole("super_admin"), updateOrganizationStatus);

// =================================================
// UPDATE ORGANIZATION ONBOARDING
// =================================================
router.put("/orgs/:id/onboarding", isAuthenticated, requireRole("super_admin"), updateOrganizationOnboarding);

// =================================================
// SUPER ADMIN DATA AUDIT ROUTES
// =================================================
import { getOrgHierarchyAudit, getOrgFacultyAudit, getOrgStudentsAudit, getOrgFeesAudit, getOrgAdmissionsAudit } from "../controllers/super-admin.controller.js";
router.get("/orgs/:id/hierarchy-audit", isAuthenticated, requireRole("super_admin"), getOrgHierarchyAudit);
router.get("/orgs/:id/faculty-audit", isAuthenticated, requireRole("super_admin"), getOrgFacultyAudit);
router.get("/orgs/:id/students-audit", isAuthenticated, requireRole("super_admin"), getOrgStudentsAudit);
router.get("/orgs/:id/fees-audit", isAuthenticated, requireRole("super_admin"), getOrgFeesAudit);
router.get("/orgs/:id/admissions-audit", isAuthenticated, requireRole("super_admin"), getOrgAdmissionsAudit);

export default router;



