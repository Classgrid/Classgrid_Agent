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
import GlobalAiConfig from "../../models/GlobalAiConfig.js";

// GET /api/super-admin/ai/usage
export const getAiUsageStats = async (req, res) => {
    try {
        const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }) || { global_user_weekly_limit: 100000 };
        const defaultLimit = globalConfig.global_user_weekly_limit;

        // Aggregate usage across all users, grouping by Organization Name -> Role
        const usageData = await User.aggregate([
            {
                $lookup: {
                    from: "organizations",
                    localField: "organization_id",
                    foreignField: "_id",
                    as: "org"
                }
            },
            {
                $unwind: {
                    path: "$org",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        orgName: { $ifNull: ["$org.name", "No Organization"] },
                        orgId: "$org._id",
                        role: "$role"
                    },
                    totalUsers: { $sum: 1 },
                    totalUsedTokens: { $sum: { $ifNull: ["$ai_tokens.used_this_week", 0] } },
                    totalLimit: { $sum: { $ifNull: ["$ai_tokens.free_weekly_limit", defaultLimit] } }
                }
            },
            {
                $group: {
                    _id: "$_id.orgName",
                    orgId: { $first: "$_id.orgId" },
                    roles: {
                        $push: {
                            role: "$_id.role",
                            totalUsers: "$totalUsers",
                            usedTokens: "$totalUsedTokens",
                            limit: "$totalLimit"
                        }
                    },
                    orgTotalUsed: { $sum: "$totalUsedTokens" }
                }
            },
            {
                $sort: { orgTotalUsed: -1 }
            }
        ]);

        res.status(200).json({
            success: true,
            data: usageData,
            timestamp: new Date().toISOString() // Gives Month, Day, Date
        });
    } catch (error) {
        console.error("Error fetching AI usage stats:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// POST /api/super-admin/ai/reset-credits
export const resetCredits = async (req, res) => {
    try {
        const { targetId, targetType, newLimit } = req.body;
        
        if (targetType === "user") {
            const updateObj = { "ai_tokens.used_this_week": 0 };
            if (newLimit) updateObj["ai_tokens.free_weekly_limit"] = Number(newLimit);
            
            await User.findByIdAndUpdate(targetId, { $set: updateObj });
        } else if (targetType === "organization") {
            const updateObj = { "ai_config.pro_used_this_period": 0 };
            if (newLimit) updateObj["ai_config.pro_pool_limit"] = Number(newLimit);
            
            await Organization.findByIdAndUpdate(targetId, { $set: updateObj });
            
            // Also reset all users in this org
            await User.updateMany(
                { organization_id: targetId },
                { $set: { "ai_tokens.used_this_week": 0 } }
            );
        } else {
            return res.status(400).json({ success: false, message: "Invalid targetType" });
        }

        res.status(200).json({ success: true, message: "Credits reset successfully" });
    } catch (error) {
        console.error("Error resetting credits:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// POST /api/super-admin/ai/block
export const toggleBlockAi = async (req, res) => {
    try {
        const { targetId, targetType, block } = req.body;
        // block is a boolean
        
        if (targetType === "user") {
            await User.findByIdAndUpdate(targetId, { $set: { is_ai_blocked: block } });
        } else if (targetType === "organization") {
            await Organization.findByIdAndUpdate(targetId, { $set: { is_ai_blocked: block } });
            
            // Apply to all users in the org
            await User.updateMany(
                { organization_id: targetId },
                { $set: { is_ai_blocked: block } }
            );
        } else {
            return res.status(400).json({ success: false, message: "Invalid targetType" });
        }

        res.status(200).json({ success: true, message: `AI access ${block ? 'blocked' : 'unblocked'} successfully` });
    } catch (error) {
        console.error("Error toggling AI block:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
