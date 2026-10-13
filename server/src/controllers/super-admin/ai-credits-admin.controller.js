// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import User from "../../models/User.js";
import Organization from "../../models/Organization.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import mongoose from "mongoose";
import AdminSecurityCode from "../../models/AdminSecurityCode.js";
import { sendEmail } from "../../services/aws-ses.service.js";
import { parseResetPeriodInput } from "../../services/ai-feature-limits.js";
import { getAiCreditGrantedHtml, getAiCreditGrantedPlainText, getSuperAdminSecurityOtpHtml, getSuperAdminSecurityOtpPlainText } from "../../services/email-templates.service.js";

/**
 * PHASE 9: Super Admin AI Credits Admin Controller
 * Handles mutations: Blocking, Unblocking, Resetting limits, Granting credits.
 */

const getDashboardUrlForUser = async (user) => {
    let baseUrl = "https://app.classgrid.in";
    if (user.organization_id) {
        try {
            const org = await Organization.findById(user.organization_id);
            if (org) {
                if (org.erp_domain && org.erp_domain.domain) {
                    baseUrl = `https://${org.erp_domain.domain}`;
                } else if (org.subdomain) {
                    baseUrl = `https://${org.subdomain}.classgrid.in`;
                }
            }
        } catch (e) { console.error("Error getting org url", e); }
    }

    let agentPath = "/student/agent";
    switch (user.role) {
        case "super_admin":
        case "co_super_admin": agentPath = "/superadmin/agent"; break;
        case "org_admin":
        case "admin": agentPath = "/org/admin/agent"; break;
        case "teacher":
        case "faculty":
        case "hod":
        case "principal":
        case "vice_principal": agentPath = "/faculty/agent"; break;
        case "library_manager": agentPath = "/dept/library/agent"; break;
        case "hostel_warden": agentPath = "/dept/hostel/agent"; break;
        case "hr_manager": agentPath = "/dept/hr/agent"; break;
        case "attendance_manager": agentPath = "/dept/attendance/agent"; break;
        case "fees_admin":
        case "accountant": agentPath = "/dept/fees/agent"; break;
        case "exams_admin": agentPath = "/dept/exams/agent"; break;
        case "admissions_admin": agentPath = "/dept/admissions/agent"; break;
    }
    return `${baseUrl}${agentPath}`;
};

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

        const updateObj = {
            $inc: {
                "ai_tokens.promotion_credits_balance": amount,
                "ai_tokens.total_promotion_credits_granted": amount
            },
            $set: {}
        };

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: "Both start date and expiry date are strictly required." });
        }

        updateObj.$set["ai_tokens.promotion_credits_start_date"] = new Date(startDate);
        updateObj.$set["ai_tokens.promotion_credits_end_date"] = new Date(endDate);

        const user = await User.findByIdAndUpdate(userId, updateObj, { returnDocument: 'after' });

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

                const dashboardUrl = await getDashboardUrlForUser(user);
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

        const updateObj = {
            $inc: {
                "ai_tokens.promotion_credits_balance": amount,
                "ai_tokens.total_promotion_credits_granted": amount
            },
            $set: {}
        };

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: "Both start date and expiry date are strictly required." });
        }

        updateObj.$set["ai_tokens.promotion_credits_start_date"] = new Date(startDate);
        updateObj.$set["ai_tokens.promotion_credits_end_date"] = new Date(endDate);

        user = await User.findByIdAndUpdate(user._id, updateObj, { returnDocument: 'after' });

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

                const dashboardUrl = await getDashboardUrlForUser(user);
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

        txn.status = "revoked";
        await txn.save();

        const User = (await import("../../models/User.js")).default;
        const user = await User.findByIdAndUpdate(userId, {
            $inc: {
                "ai_tokens.promotion_credits_balance": -(txn.credits_added || 0),
                "ai_tokens.total_promotion_credits_granted": -(txn.credits_added || 0)
            }
        }, { returnDocument: 'after' });

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
                const { sendEmail: sendSESEmail } = await import("../../services/aws-ses.service.js");
                const dashboardUrl = await getDashboardUrlForUser(user);
                await sendSESEmail({
                    to: user.email,
                    subject: "Your AI Credits Have Been Removed",
                    html: getGrantedCreditsRemovedHtml(user.name, dashboardUrl),
                    text: getGrantedCreditsRemovedPlainText(user.name, dashboardUrl),
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
            txn.status = "paused";
            await txn.save();
            await User.findByIdAndUpdate(userId, {
                $inc: {
                    "ai_tokens.promotion_credits_balance": -(txn.credits_added || 0),
                    "ai_tokens.total_promotion_credits_granted": -(txn.credits_added || 0)
                }
            });
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
            txn.status = "success";
            await txn.save();
            await User.findByIdAndUpdate(userId, {
                $inc: {
                    "ai_tokens.promotion_credits_balance": (txn.credits_added || 0),
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
                const { sendEmail: sendSESEmail } = await import("../../services/aws-ses.service.js");
                const dashboardUrl = await getDashboardUrlForUser(user);
                await sendSESEmail({
                    to: user.email,
                    subject: `Your AI Credits Have Been ${isPaused ? 'Paused' : 'Resumed'}`,
                    html: getGrantedCreditsPausedHtml(user.name, isPaused, dashboardUrl),
                    text: getGrantedCreditsPausedPlainText(user.name, isPaused, dashboardUrl),
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

        const user = await User.findByIdAndUpdate(userId, {
            $set: { "ai_tokens.promotion_credits_end_date": new Date(endDate) }
        }, { returnDocument: 'after' });

        const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
        const txn = await AiCreditTransaction.findOneAndUpdate(
            { userId: user._id, type: "grant" },
            { $set: { status: "active" } },
            { sort: { createdAt: -1 }, returnDocument: "after" }
        );

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

                const dashboardUrl = await getDashboardUrlForUser(user);
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