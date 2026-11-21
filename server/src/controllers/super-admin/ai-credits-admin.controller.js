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
import User from "../../models/User.js";
import Organization from "../../models/Organization.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import mongoose from "mongoose";
import AdminSecurityCode from "../../models/AdminSecurityCode.js";
import { sendEmail } from "../../services/aws-ses.service.js";
import { parseResetPeriodInput } from "../../services/ai-feature-limits.js";
import { getAiCreditGrantedHtml, getAiCreditGrantedPlainText, getSuperAdminSecurityOtpHtml, getSuperAdminSecurityOtpPlainText, USAGE_URL } from "../../services/email-templates.service.js";
import { planOf } from "../../services/plan-limits.service.js";
import { takeFromGifted, lowerGiftedTotal } from "../../services/ai-credits.service.js";
import { addToPool, giftInForce } from "../../services/credit-expiry.js";

/**
 * PHASE 9: Super Admin AI Credits Admin Controller
 * Handles mutations: Blocking, Unblocking, Resetting limits, Granting credits.
 */

// Puts a gift of credits on a person's gifted balance. Used by every gift made here: to one person (grantCredits; the
// server has no other route for gifting many people at once, each person's gift comes through it) and to an
// organization's owner (grantOrgCredits).
// 2026-11-21 (owner: "fix all"): the gifted credits have ONE end date for the whole balance. Before, every gift did
// `$inc` on the stored balance and wrote the new end date over the old one, so gifted credits that had already expired
// (they count as 0 everywhere, but the stored number stayed) came back to life with the new gift. Now
// (services/credit-expiry.js):
//   - the stored end date has passed when the gift is made: the old balance is gone and the balance becomes exactly
//     the new gift
//   - not expired: as before, the gift is added to the balance
// In both cases the start and end dates are the ones the super admin chose for this gift, and "gifted in all" goes up
// by the gift, as before. The end date is checked inside the database update itself, so an answer charging the
// balance at the same moment is not lost.
// Returns { user, expired, refused }: user = the person after the gift (null: not found), refused = not an amount.
const giveGift = (userId, amount, startDate, endDate) => addToPool(User, userId, "gifted", amount, {
    now: new Date(),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
});


export const blockAiUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isBlocked } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { "ai_tokens.is_ai_blocked": isBlocked } },
            { returnDocument: 'after' }
        );

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: `User AI access ${isBlocked ? 'blocked' : 'unblocked'}` });
    } catch (error) {
        console.error("Block AI User Error:", error);
        res.status(500).json({ success: false, error: "Failed to update user block status" });
    }
};

export const blockAiOrg = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { isBlocked } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orgId)) {
            return res.status(400).json({ success: false, error: "Invalid org ID" });
        }

        const org = await Organization.findByIdAndUpdate(
            orgId,
            { $set: { "ai_config.is_ai_blocked": isBlocked } },
            { returnDocument: 'after' }
        );

        if (!org) return res.status(404).json({ success: false, error: "Organization not found" });

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: `Organization AI access ${isBlocked ? 'blocked' : 'unblocked'}` });
    } catch (error) {
        console.error("Block AI Org Error:", error);
        res.status(500).json({ success: false, error: "Failed to update org block status" });
    }
};

export const resetUserUsage = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        // Resets their used_this_week counter to 0
        await User.findByIdAndUpdate(userId, {
            $set: { "ai_tokens.used_this_week": 0, "ai_image_free_weekly_used": 0 }
        });

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: "User weekly usage reset to 0." });
    } catch (error) {
        console.error("Reset User Usage Error:", error);
        res.status(500).json({ success: false, error: "Failed to reset user usage" });
    }
};

export const resetOrgUsage = async (req, res) => {
    try {
        const { orgId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orgId)) {
            return res.status(400).json({ success: false, error: "Invalid org ID" });
        }

        // Resets the org's pro pool usage
        await Organization.findByIdAndUpdate(orgId, {
            $set: { "ai_config.pro_used_this_period": 0 }
        });

        // Optionally reset ALL users in this org's weekly limits
        await User.updateMany(
            { organization_id: orgId },
            { $set: { "ai_tokens.used_this_week": 0, "ai_image_free_weekly_used": 0 } }
        );

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: "Organization and all member usage reset." });
    } catch (error) {
        console.error("Reset Org Usage Error:", error);
        res.status(500).json({ success: false, error: "Failed to reset org usage" });
    }
};

export const grantCredits = async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount, sendEmail: shouldSendEmail = true, startDate, endDate } = req.body; // Token amount and options

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: "Invalid amount" });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: "Both start date and expiry date are strictly required." });
        }

        // The gift goes on the balance by the rule in services/credit-expiry.js (see giveGift above)
        const gift = await giveGift(userId, amount, startDate, endDate);
        if (gift.refused) return res.status(400).json({ success: false, error: "Invalid amount" });
        const user = gift.user;

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        // Record the transaction
        await AiCreditTransaction.create({
            userId: user._id,
            orgId: user.organization_id || null,
            amount_inr: 0, // Manual grant is free
            credits_added: amount,
            razorpay_payment_id: `grant_${new Date().getTime()}`,
            razorpay_order_id: `admin_grant`,
            type: "grant",
            status: "success",
            userName: user.name || "",
            userEmail: user.email || "",
            organizationName: user.organization_id ? "" : "Classgrid (Platform Team)"
        });

        if (user.email && shouldSendEmail) {
            try {
                const totalTokens = (user.ai_tokens.ai_credits_balance + user.ai_tokens.promotion_credits_balance) || 0;
                const totalBalance = totalTokens.toLocaleString();

                // Format expiration date for email
                const d = new Date(endDate);
                const expireDateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                const dashboardUrl = USAGE_URL; // Settings > Usage on chat.classgrid.in
                const emailHtml = getAiCreditGrantedHtml(user.name || user.email, amount.toLocaleString(), totalBalance, expireDateStr, dashboardUrl);
                const emailText = getAiCreditGrantedPlainText(user.name || user.email, amount.toLocaleString(), totalBalance, expireDateStr, dashboardUrl);
                await sendEmail({
                    to: user.email,
                    subject: `Your AI Credits Have Been Granted!`,
                    html: emailHtml,
                    text: emailText,
                    userId: user._id,
                    organizationId: user.organization_id
                });
            } catch (emailErr) {
                console.error("Failed to send gift credit email:", emailErr);
            }
        }

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: `${amount} credits granted to user. Email notification handled.` });
    } catch (error) {
        console.error("Grant Credits Error:", error);
        res.status(500).json({ success: false, error: "Failed to grant credits" });
    }
};

export const grantOrgCredits = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { amount, sendEmail: shouldSendEmail = true, startDate, endDate } = req.body;

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, error: "Invalid amount" });
        }

        let user;
        let orgNameStr = "";

        if (orgId === "classgrid") {
            orgNameStr = "Classgrid (Platform Team)";
            if (req.body.email) {
                user = await User.findOne({ email: req.body.email });
            }
            if (!user) {
                user = await User.findOne({ role: "super_admin", email: req.body.email || "nikhil.shinde@classgrid.in" });
            }
            if (!user) {
                user = await User.findOne({ $or: [{ role: 'super_admin' }, { organization_id: null }, { organization_id: { $exists: false } }] });
            }
        } else {
            if (!mongoose.Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({ success: false, error: "Invalid org ID" });
            }
            const org = await Organization.findById(orgId);
            if (!org) return res.status(404).json({ success: false, error: "Organization not found" });

            orgNameStr = org.name || "";
            if (req.body.email) {
                user = await User.findOne({ email: req.body.email });
            }
            if (!user && org.ownerEmail) {
                user = await User.findOne({ email: org.ownerEmail });
            }
            if (!user) {
                user = await User.findOne({ organization_id: orgId, role: { $in: ["Owner", "Admin", "org_admin"] } });
            }
            if (!user) {
                user = await User.findOne({ organization_id: orgId });
            }
        }

        if (!user) return res.status(404).json({ success: false, error: "No owner or admin found for this organization to receive credits." });

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: "Both start date and expiry date are strictly required." });
        }

        // The gift goes on the balance by the rule in services/credit-expiry.js (see giveGift above)
        const gift = await giveGift(user._id, amount, startDate, endDate);
        if (gift.refused) return res.status(400).json({ success: false, error: "Invalid amount" });
        user = gift.user;
        if (!user) return res.status(404).json({ success: false, error: "No owner or admin found for this organization to receive credits." });

        // Record the transaction
        await AiCreditTransaction.create({
            userId: user._id,
            orgId: user.organization_id || null,
            amount_inr: 0,
            credits_added: amount,
            razorpay_payment_id: `grant_org_${new Date().getTime()}`,
            razorpay_order_id: `admin_grant_org`,
            type: "grant",
            status: "success",
            userName: user.name || "",
            userEmail: user.email || "",
            organizationName: orgNameStr
        });

        if (user.email && shouldSendEmail) {
            try {
                const totalTokens = (user.ai_tokens.ai_credits_balance + user.ai_tokens.promotion_credits_balance) || 0;
                const totalBalance = totalTokens.toLocaleString();

                const d = new Date(endDate);
                const expireDateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                const dashboardUrl = USAGE_URL; // Settings > Usage on chat.classgrid.in
                const emailHtml = getAiCreditGrantedHtml(user.name || user.email, amount.toLocaleString(), totalBalance, expireDateStr, dashboardUrl);
                const emailText = getAiCreditGrantedPlainText(user.name || user.email, amount.toLocaleString(), totalBalance, expireDateStr, dashboardUrl);
                await sendEmail({
                    to: user.email,
                    subject: `Your AI Credits Have Been Granted!`,
                    html: emailHtml,
                    text: emailText,
                    userId: user._id,
                    organizationId: user.organization_id
                });
            } catch (emailErr) {
                console.error("Failed to send gift credit email:", emailErr);
            }
        }

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        return res.status(200).json({ success: true, message: `Granted ${amount} credits to org owner ${user.email}` });
    } catch (err) {
        console.error("Error granting org credits:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const deleteUserAiData = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        // Delete from Supabase
        if (user.email) {
            const { error } = await supabase
                .from('ai_chat_sessions')
                .delete()
                .eq('user_email', user.email);

            if (error) console.error("Error deleting Supabase chat data:", error);
        }

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: "User AI chat data deleted from Supabase." });
    } catch (error) {
        console.error("Delete User AI Data Error:", error);
        res.status(500).json({ success: false, error: "Failed to delete user AI data" });
    }
};

export const updateOrgAiLimits = async (req, res) => {
    try {
        const { orgId } = req.params;
        const {
            pro_pool_limit,
            free_weekly_limit_per_user,
            image_generation_limit,
            whatsapp_scheduling_limit,
            custom_limits_enabled
        } = req.body;

        const resetPeriods = {};
        for (const feature of ["token", "image", "whatsapp"]) {
            const { set, error } = parseResetPeriodInput(req.body, `${feature}_reset`);
            if (error) return res.status(400).json({ success: false, error });
            if (set) resetPeriods[feature] = set;
        }

        if (orgId === "classgrid") {
            const globalUpdateSet = {};
            for (const [feature, p] of Object.entries(resetPeriods)) {
                globalUpdateSet[`classgrid_${feature}_reset_value`] = p.value;
                globalUpdateSet[`classgrid_${feature}_reset_unit`] = p.unit;
            }
            if (pro_pool_limit !== undefined) globalUpdateSet.classgrid_pro_pool_limit = pro_pool_limit;
            if (free_weekly_limit_per_user !== undefined) globalUpdateSet.classgrid_user_weekly_limit = free_weekly_limit_per_user;
            if (image_generation_limit !== undefined) globalUpdateSet.classgrid_image_weekly_limit = image_generation_limit;
            if (whatsapp_scheduling_limit !== undefined) globalUpdateSet.classgrid_whatsapp_scheduling_limit = whatsapp_scheduling_limit;
            if (custom_limits_enabled !== undefined) globalUpdateSet.classgrid_custom_limits_enabled = custom_limits_enabled;

            const GlobalAiConfig = (await import("../../models/GlobalAiConfig.js")).default;
            await GlobalAiConfig.findOneAndUpdate(
                { key: "singleton" },
                { $set: globalUpdateSet },
                { upsert: true }
            );

            if (free_weekly_limit_per_user !== undefined) {
                await User.updateMany(
                    { $or: [{ role: 'super_admin' }, { organization_id: null }, { organization_id: { $exists: false } }] },
                    { $set: { "ai_tokens.free_weekly_limit": free_weekly_limit_per_user } }
                );
            }

            const io = req.app.get("io");
            if (io) io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");

            return res.status(200).json({ success: true, message: "Global AI limits updated successfully." });
        }

        if (!mongoose.Types.ObjectId.isValid(orgId)) {
            return res.status(400).json({ success: false, error: "Invalid org ID" });
        }

        const updateSet = {
            "ai_config.pro_pool_limit": pro_pool_limit,
            "ai_config.free_weekly_limit_per_user": free_weekly_limit_per_user
        };

        if (custom_limits_enabled !== undefined) updateSet["ai_config.custom_limits_enabled"] = custom_limits_enabled;
        if (image_generation_limit !== undefined) updateSet["ai_config.image_generation_limit"] = image_generation_limit;
        if (whatsapp_scheduling_limit !== undefined) updateSet["ai_config.whatsapp_scheduling_limit"] = whatsapp_scheduling_limit;
        for (const [feature, p] of Object.entries(resetPeriods)) {
            updateSet[`ai_config.${feature}_reset_value`] = p.value;
            updateSet[`ai_config.${feature}_reset_unit`] = p.unit;
        }

        const org = await Organization.findByIdAndUpdate(
            orgId,
            { $set: updateSet },
            { returnDocument: 'after' }
        );

        if (!org) return res.status(404).json({ success: false, error: "Organization not found" });

        // Update the default weekly limit for all users in this org
        await User.updateMany(
            { organization_id: orgId },
            { $set: { "ai_tokens.free_weekly_limit": free_weekly_limit_per_user } }
        );

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: "Organization AI limits updated successfully." });
    } catch (error) {
        console.error("Update Org AI Limits Error:", error);
        res.status(500).json({ success: false, error: "Failed to update org AI limits" });
    }
};

// ==========================================
// SECURITY / OTP ENDPOINTS
// ==========================================

export const requestSecurityCode = async (req, res) => {
    try {
        const { action, orgId } = req.body;
        // Check if user is authenticated and super admin
        if (!req.user || req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        const email = req.user.email;
        if (!email) {
            return res.status(400).json({ success: false, error: "Super Admin email not found" });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Invalidate old unused codes for this admin
        // No longer deleting old codes to avoid race conditions.

        // Expires in 10 minutes
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await AdminSecurityCode.create({
            superAdminId: req.user._id,
            email,
            code,
            action: action || "GENERAL_AI_MUTATION",
            orgId: orgId || null,
            expiresAt
        });

        let actionDescription = action;
        if (action === "RESET_ORG_USAGE") actionDescription = `Resetting AI Usage Limit for Organization: ${orgId || 'Unknown'}`;
        if (action === "BLOCK_ORG_AI") actionDescription = `Changing AI Block status for Organization: ${orgId || 'Unknown'}`;
        if (action === "RESET_USER_USAGE") actionDescription = `Resetting AI Usage Limit for User`;
        if (action === "BLOCK_USER_AI") actionDescription = `Changing AI Block status for User`;
        if (action === "GENERAL_AI_MUTATION") actionDescription = `Granting AI Credits`;

        const html = getSuperAdminSecurityOtpHtml(req.user.name || "Admin", code, actionDescription, 10);
        const plainText = getSuperAdminSecurityOtpPlainText(req.user.name || "Admin", code, actionDescription, 10);

        await sendEmail({
            to: email,
            subject: "Classgrid Super Admin Security Code (OTP)",
            html: html,
            text: plainText,
        });

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: "Security code sent successfully" });
    } catch (error) {
        console.error("Error in requestSecurityCode:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

export const verifySecurityCode = async (req, res) => {
    try {
        const { code, action, orgId } = req.body;

        if (!req.user || req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        if (!code) {
            return res.status(400).json({ success: false, error: "Security code is required" });
        }

        const trimmedCode = code.toString().trim();
        const userId = req.user._id.toString();

        console.log("[SecurityCode] Verify attempt:", { userId, trimmedCode, action, orgId });

        // BROAD QUERY: Find by code only, then validate ownership manually
        // This avoids ObjectId vs String type mismatch issues with superAdminId
        const allMatchingCodes = await AdminSecurityCode.find({
            code: trimmedCode,
            used: false,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        console.log("[SecurityCode] Found matching codes:", allMatchingCodes.length);

        // Find the one that belongs to this user (compare as strings to avoid type issues)
        const securityCode = allMatchingCodes.find(
            c => c.superAdminId?.toString() === userId
        );

        if (!securityCode) {
            // Extra debug: check if there are ANY codes for this user at all
            const userCodes = await AdminSecurityCode.find({}).then(
                codes => codes.filter(c => c.superAdminId?.toString() === userId)
            );
            console.log("[SecurityCode] FAIL - All codes for this user:", userCodes.map(c => ({
                code: c.code,
                used: c.used,
                expired: c.expiresAt < new Date(),
                expiresAt: c.expiresAt
            })));
            return res.status(400).json({ success: false, error: `Code not found for user. Codes matched: ${allMatchingCodes.length}. User codes exist: ${userCodes.length > 0}` });
        }

        if (action && securityCode.action !== action) {
            return res.status(400).json({ success: false, error: "Invalid action for this security code" });
        }

        if (orgId && securityCode.orgId !== orgId && securityCode.orgId !== null) {
            return res.status(400).json({ success: false, error: "Invalid organization for this security code" });
        }

        // Mark as used
        securityCode.used = true;
        await securityCode.save();
        console.log("[SecurityCode] SUCCESS - Code verified and marked as used");

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
            if (typeof orgId !== "undefined" && orgId) io.to(`org:${orgId}`).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: "Security code verified successfully" });
    } catch (error) {
        console.error("Error in verifySecurityCode:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};



export const removeGrantedCredits = async (req, res) => {
    try {
        const { userId, transactionId } = req.params;
        const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;

        const txn = await AiCreditTransaction.findOne({ _id: transactionId, userId, type: "grant" });
        if (!txn || txn.status === "revoked") {
            return res.status(400).json({ success: false, error: "Transaction not found or already revoked" });
        }

        // (a paused gift was already taken off the balance when it was paused: removing it takes nothing more.
        // Before 2026-11-21 it was subtracted a second time)
        const wasPaused = txn.status === "paused";
        txn.status = "revoked";
        await txn.save();

        const User = (await import("../../models/User.js")).default;
        if (!wasPaused) {
            await takeFromGifted(userId, txn.credits_added);
            await lowerGiftedTotal(userId, txn.credits_added);
        }
        const user = await User.findById(userId);

        await AiCreditTransaction.create({
            userId: user._id,
            orgId: user.organization_id || null,
            amount_inr: 0,
            credits_added: 0,
            razorpay_payment_id: "REVOKE_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            razorpay_order_id: "REVOKE_ORDER",
            type: "revoke",
            status: "success",
            metadata: {
                action: "revoked",
                transactionId: txn._id
            }
        });

        if (user && user.email) {
            try {
                const { getGrantedCreditsRemovedHtml, getGrantedCreditsRemovedPlainText } = await import("../../services/email-templates.service.js");
                const plan = await planOf(user).catch(() => null);
                const { sendEmail: sendSESEmail } = await import("../../services/aws-ses.service.js");
                const dashboardUrl = USAGE_URL; // Settings > Usage on chat.classgrid.in
                await sendSESEmail({
                    to: user.email,
                    subject: "Your AI Credits Have Been Removed",
                    html: getGrantedCreditsRemovedHtml(user.name, dashboardUrl, plan),
                    text: getGrantedCreditsRemovedPlainText(user.name, dashboardUrl, plan),
                    userId: user._id,
                    organizationId: user.organization_id
                });
            } catch (emailErr) {
                console.error("Failed to send remove credit email:", emailErr);
            }
        }

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: "Granted credits revoked successfully" });
    } catch (error) {
        console.error("Remove Granted Credits Error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

export const pauseGrantedCredits = async (req, res) => {
    try {
        const { userId, transactionId } = req.params;
        const { isPaused } = req.body; // true to pause, false to unpause

        const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
        const txn = await AiCreditTransaction.findOne({ _id: transactionId, userId, type: "grant" });

        if (!txn || txn.status === "revoked") {
            return res.status(400).json({ success: false, error: "Transaction not found or revoked" });
        }

        const User = (await import("../../models/User.js")).default;
        const user = await User.findById(userId);

        if (isPaused && txn.status !== "paused") {
            // What is left of the gift is held back (never more than the balance holds), and that number is kept
            // with the gift, so Resume gives back exactly what Pause took
            const held = await takeFromGifted(userId, txn.credits_added);
            await lowerGiftedTotal(userId, txn.credits_added);
            txn.status = "paused";
            txn.metadata = { ...(txn.metadata || {}), held };
            txn.markModified("metadata");
            await txn.save();
            await AiCreditTransaction.create({
                userId: user._id,
                orgId: user.organization_id || null,
                amount_inr: 0,
                credits_added: 0,
                razorpay_payment_id: "PAUSE_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                razorpay_order_id: "PAUSE_ORDER",
                type: "pause",
                status: "success",
                metadata: {
                    action: "paused",
                    transactionId: txn._id
                }
            });
        } else if (!isPaused && txn.status === "paused") {
            // (a gift paused before 2026-11-21 has no `held`: the whole gift was subtracted then, so the whole comes back)
            const kept = Number(txn.metadata?.held);
            const back = Number.isFinite(kept) && kept >= 0 ? kept : (txn.credits_added || 0);
            txn.status = "success";
            await txn.save();
            await User.findByIdAndUpdate(userId, {
                $inc: {
                    "ai_tokens.promotion_credits_balance": back,
                    "ai_tokens.total_promotion_credits_granted": (txn.credits_added || 0)
                }
            });
            await AiCreditTransaction.create({
                userId: user._id,
                orgId: user.organization_id || null,
                amount_inr: 0,
                credits_added: 0,
                razorpay_payment_id: "RESUME_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                razorpay_order_id: "RESUME_ORDER",
                type: "resume",
                status: "success",
                metadata: {
                    action: "resumed",
                    transactionId: txn._id
                }
            });
        }

        if (user && user.email) {
            try {
                const { getGrantedCreditsPausedHtml, getGrantedCreditsPausedPlainText } = await import("../../services/email-templates.service.js");
                const plan = await planOf(user).catch(() => null);
                const { sendEmail: sendSESEmail } = await import("../../services/aws-ses.service.js");
                const dashboardUrl = USAGE_URL; // Settings > Usage on chat.classgrid.in
                await sendSESEmail({
                    to: user.email,
                    subject: `Your AI Credits Have Been ${isPaused ? 'Paused' : 'Resumed'}`,
                    html: getGrantedCreditsPausedHtml(user.name, isPaused, dashboardUrl, plan),
                    text: getGrantedCreditsPausedPlainText(user.name, isPaused, dashboardUrl, plan),
                    userId: user._id,
                    organizationId: user.organization_id
                });
            } catch (emailErr) {
                console.error("Failed to send pause credit email:", emailErr);
            }
        }

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: `Granted credits ${isPaused ? "paused" : "unpaused"} successfully` });
    } catch (error) {
        console.error("Pause Granted Credits Error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

export const extendGrantedCredits = async (req, res) => {
    try {
        const { userId } = req.params;
        const { endDate, sendEmail = true } = req.body;

        if (!endDate) {
            return res.status(400).json({ success: false, error: "End date is required" });
        }

        const User = (await import("../../models/User.js")).default;

        const oldUser = await User.findById(userId);
        if (!oldUser) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const oldEndDate = oldUser.ai_tokens?.promotion_credits_end_date;

        // 2026-11-21 (owner: "fix all"): Extend only moves the end date of gifts that are in force. Before, it wrote
        // status "active" on the person's newest gift whatever that gift was, so a gift that had been removed
        // (revoked) or paused was marked as in force again, and the person page (getUserAiDetail in
        // ai-usage-users.controller.js, which works the balance out again from the gifts in force) then put that whole
        // gift back on the balance. Now the gifts are only read here: no gift's status is changed, and nothing is added
        // to the balance. A person whose gifts are all removed or paused has nothing to extend, and the end date
        // stays as it is. (An older account with gifted credits and no gift rows at all is extended as before.)
        const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
        const gifts = await AiCreditTransaction.find({ userId: oldUser._id, type: "grant" })
            .sort({ createdAt: -1 })
            .select("_id status")
            .lean();
        const txn = gifts.find((g) => giftInForce(g.status)) || null; // (the newest gift in force: the extend row points at it)
        if (gifts.length > 0 && !txn) {
            return res.status(400).json({ success: false, error: "No active granted credits to extend" });
        }

        const user = await User.findByIdAndUpdate(userId, {
            $set: { "ai_tokens.promotion_credits_end_date": new Date(endDate) }
        }, { returnDocument: 'after' });

        await AiCreditTransaction.create({
            userId: user._id,
            orgId: user.organization_id || null,
            amount_inr: 0,
            credits_added: 0,
            razorpay_payment_id: "EXTEND_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            razorpay_order_id: "EXTEND_ORDER",
            type: "extend",
            status: "success",
            metadata: {
                oldEndDate: oldEndDate,
                newEndDate: new Date(endDate),
                transactionId: txn ? txn._id : null
            }
        });

        if (sendEmail && user.email) {
            try {
                const { getGrantedCreditsExtendedHtml, getGrantedCreditsExtendedPlainText } = await import("../../services/email-templates.service.js");
                const { sendEmail: sendSESEmail } = await import("../../services/aws-ses.service.js");

                const dashboardUrl = USAGE_URL; // Settings > Usage on chat.classgrid.in
                const emailHtml = getGrantedCreditsExtendedHtml(user.name, new Date(endDate), dashboardUrl);
                const emailText = getGrantedCreditsExtendedPlainText(user.name, new Date(endDate), dashboardUrl);

                await sendSESEmail({
                    to: user.email,
                    subject: "Your AI Credits Have Been Extended!",
                    html: emailHtml,
                    text: emailText,
                    userId: user._id,
                    organizationId: user.organization_id
                });
            } catch (emailErr) {
                console.error("Failed to send extend credit email:", emailErr);
            }
        }

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            if (typeof userId !== "undefined" && userId) io.to(userId.toString()).emit("ai_token_update");
        }
        res.status(200).json({ success: true, message: "Granted credits extended successfully" });
    } catch (error) {
        console.error("Extend Granted Credits Error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};