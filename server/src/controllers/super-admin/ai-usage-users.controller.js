// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import { primarySupabaseClient as supabase } from "../../config/supabaseClient.js";
import mongoose from "mongoose";

// PHASE 8: Super Admin AI Usage - Users Controller

export const listUsersInOrg = async (req, res) => {
    try {
        const { orgId } = req.params;
        let query = {};
        
        if (orgId === "classgrid") {
            query = { $or: [{ organization_id: null }, { organization_id: { $exists: false } }] };
        } else {
            if (!mongoose.Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({ success: false, error: "Invalid organization ID" });
            }
            query = { organization_id: orgId };
        }

        const users = await User.find(query)
            .select("name email role ai_tokens organization_id profilePicture platformLogo avatarUrl picture photoUrl")
            .lean();

        const userIds = users.map(u => u._id);
        const latestTransactions = await AiCreditTransaction.aggregate([
            { $match: { userId: { $in: userIds }, type: { $in: ["topup", "grant"] }, status: "success" } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: "$userId", latestTopUp: { $first: "$credits_added" }, date: { $first: "$createdAt" } } }
        ]);

        const topUpMap = {};
        latestTransactions.forEach(t => {
            topUpMap[t._id.toString()] = { amount: t.latestTopUp, date: t.date };
        });

        // Group users by role
        const roles = {};
        users.forEach(user => {
            const role = user.role || "unknown";
            if (!roles[role]) {
                roles[role] = {
                    roleName: role,
                    userCount: 0,
                    totalUsage: 0,
                    users: []
                };
            }
            roles[role].userCount += 1;
            roles[role].totalUsage += (user.ai_tokens?.total_ai_tokens_used || 0);
            
            const finalProfilePicture = user.profilePicture || user.platformLogo || user.photoUrl || user.avatarUrl || user.picture || null;
            
            roles[role].users.push({
                id: user._id,
                name: user.name,
                email: user.email,
                role: role,
                profilePicture: finalProfilePicture,
                totalUsage: user.ai_tokens?.total_ai_tokens_used || 0,
                isBlocked: user.ai_tokens?.is_ai_blocked || false,
                recentTopUp: topUpMap[user._id.toString()] ? topUpMap[user._id.toString()].amount : null
            });
        });

        res.status(200).json({ success: true, data: Object.values(roles) });

    } catch (error) {
        console.error("List Users in Org Error:", error);
        res.status(500).json({ success: false, error: "Failed to list users" });
    }
};

export const getUserAiDetail = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        const user = await User.findById(userId)
            .select("name email role ai_tokens organization_id profilePicture ai_image_free_weekly_used ai_image_reset_date")
            .populate("organization_id", "name")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const topupHistory = await AiCreditTransaction.find({ userId: userId, type: "topup" })
            .sort({ createdAt: -1 })
            .lean();

        const promotionHistory = await AiCreditTransaction.find({ 
            userId: userId, 
            type: { $in: ["grant", "pause", "resume", "extend", "revoke"] } 
        })
            .sort({ createdAt: -1 })
            .lean();

        let totalActive = 0;
        promotionHistory.forEach(g => {
            const s = (g.status || '').toLowerCase();
            if (g.type === "grant" && (s === "success" || s === "active" || s === "pending")) {
                totalActive += (g.credits_added || 0);
            }
        });
        
        const used = (user.ai_tokens?.total_promotion_credits_granted || 0) - (user.ai_tokens?.promotion_credits_balance || 0);
        const correctedBalance = Math.max(0, totalActive - Math.max(0, used));
        
        if (
            user.ai_tokens?.promotion_credits_balance !== correctedBalance || 
            user.ai_tokens?.total_promotion_credits_granted !== totalActive
        ) {
            await User.findByIdAndUpdate(userId, {
                $set: {
                    "ai_tokens.promotion_credits_balance": correctedBalance,
                    "ai_tokens.total_promotion_credits_granted": totalActive
                }
            });
            if (!user.ai_tokens) user.ai_tokens = {};
            user.ai_tokens.promotion_credits_balance = correctedBalance;
            user.ai_tokens.total_promotion_credits_granted = totalActive;
        }

        let totalChats = 0;
        if (user.email) {
            const { count, error: countError } = await supabase
                .from('ai_chat_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_email', user.email);
            
            if (!countError) totalChats = count || 0;
        }

        let orgPool = null;
        let effectiveFreeLimit = 100000;
        
        try {
            const GlobalAiConfig = (await import("../../models/GlobalAiConfig.js")).default;
            const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit classgrid_custom_limits_enabled classgrid_user_weekly_limit").lean() || {};
            
            effectiveFreeLimit = globalConfig.global_user_weekly_limit || 0;

            if (user.organization_id && user.organization_id._id) {
                const Organization = (await import("../../models/Organization.js")).default;
                const org = await Organization.findById(user.organization_id._id).select("ai_config").lean();
                if (org && org.ai_config) {
                    if (org.ai_config.custom_limits_enabled && org.ai_config.free_weekly_limit_per_user !== undefined && org.ai_config.free_weekly_limit_per_user !== null) {
                        effectiveFreeLimit = org.ai_config.free_weekly_limit_per_user;
                    }
                    
                    if (user.role === 'org_admin' || user.role === 'Owner') {
                        orgPool = {
                            limit: org.ai_config.pro_pool_limit || 0,
                            used: org.ai_config.pro_pool_used || 0
                        };
                    }
                }
            } else {
                if (globalConfig.classgrid_custom_limits_enabled && globalConfig.classgrid_user_weekly_limit !== undefined && globalConfig.classgrid_user_weekly_limit !== null) {
                    effectiveFreeLimit = globalConfig.classgrid_user_weekly_limit;
                }
            }

        } catch (e) {
            console.error("Error fetching configs:", e);
        }

        if (user.ai_tokens) {
            if (user.ai_tokens.custom_limits_enabled && user.ai_tokens.free_weekly_limit !== undefined && user.ai_tokens.free_weekly_limit !== null) {
                effectiveFreeLimit = user.ai_tokens.free_weekly_limit;
            }
            user.ai_tokens.free_weekly_limit = effectiveFreeLimit;
        }

        let limitTimers = null;
        try {
            const GlobalAiConfig = (await import("../../models/GlobalAiConfig.js")).default;
            const Organization = (await import("../../models/Organization.js")).default;
            const { resolveFeatureLimit, resolveResetPeriod, checkWhatsappLimit } = await import("../../services/ai-feature-limits.js");
            const timerConfig = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
            const timerOrgId = user.organization_id?._id || null;
            const timerOrg = timerOrgId ? await Organization.findById(timerOrgId).select("ai_config").lean() : null;
            const nowMs = Date.now();
            const timer = (used, limit, savedDate, periodMs) => {
                const savedMs = savedDate ? new Date(savedDate).getTime() : 0;
                if (!savedMs || nowMs >= savedMs || savedMs - nowMs > periodMs) return { used: 0, limit, resetAt: null };
                return { used, limit, resetAt: new Date(Math.min(savedMs, nowMs + periodMs)) };
            };
            const wa = await checkWhatsappLimit({ _id: user._id, organization_id: timerOrgId });
            limitTimers = {
                tokens: timer(user.ai_tokens?.used_this_week || 0, effectiveFreeLimit, user.ai_tokens?.week_reset_date, resolveResetPeriod("tokens", timerOrg, timerConfig, timerOrgId).ms),
                image: timer(user.ai_image_free_weekly_used || 0, resolveFeatureLimit("image", timerOrg, timerConfig, timerOrgId), user.ai_image_reset_date, resolveResetPeriod("image", timerOrg, timerConfig, timerOrgId).ms),
                whatsapp: { used: wa.used, limit: wa.limit, resetAt: wa.resetAt },
            };
        } catch (e) {
            console.error("Error fetching limit timers:", e);
        }

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                limitTimers,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture || null,
                orgName: user.organization_id?.name || "Classgrid (Platform Team)",
                isBlocked: user.ai_tokens?.is_ai_blocked || false,
                totalUsage: user.ai_tokens?.total_ai_tokens_used || 0,
                balance: user.ai_tokens?.ai_credits_balance || 0,
                ai_tokens: user.ai_tokens,
                orgPool: orgPool,
                totalChats,
                topupHistory: topupHistory.map(t => ({
                    id: t._id,
                    amount_inr: t.amount_inr,
                    credits_added: t.credits_added,
                    status: t.status,
                    date: t.createdAt
                })),
                promotionHistory: (function() {
                    const history = promotionHistory.map(t => ({
                        id: t._id,
                        type: t.type,
                        credits_added: t.credits_added,
                        status: t.status,
                        date: t.createdAt,
                        metadata: t.metadata || {}
                    }));
                    
                    // If they have granted credits but no 'grant' transaction in the history yet (e.g. legacy data)
                    if (user.ai_tokens?.total_promotion_credits_granted > 0 && !history.some(h => h.type === 'grant')) {
                        history.push({
                            id: 'legacy_grant',
                            type: 'grant',
                            credits_added: user.ai_tokens.total_promotion_credits_granted,
                            status: 'success',
                            date: user.ai_tokens.promotion_credits_start_date || new Date().toISOString(),
                            metadata: {}
                        });
                        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    }
                    return history;
                })()
            }
        });
    } catch (error) {
        console.error("Get User AI Detail Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch user details" });
    }
};
