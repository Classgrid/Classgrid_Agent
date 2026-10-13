// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import User from "../models/User.js";
import AiCreditTransaction from "../models/AiCreditTransaction.js";
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import Organization from "../models/Organization.js";
import { resolveWeeklyLimit } from "../services/ai-credits.service.js";

/**
 * PHASE 13: End User AI Credits Controller
 * Allows end-users (students, teachers, admins) to view their own balance,
 * free limits, and top-up transaction history.
 */

export const getMyCredits = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("ai_tokens").lean();
        
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const tokens = user.ai_tokens || {};
        // The free weekly limit from the super admin dashboard (same rule the chat uses to check and deduct).
        const orgId = req.user.organization_id || null;
        const org = orgId ? await Organization.findById(orgId).select("ai_config").lean() : null;
        const limitConfig = await GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit classgrid_custom_limits_enabled classgrid_user_weekly_limit").lean() || {};
        const freeWeeklyLimit = resolveWeeklyLimit(user, org, limitConfig, orgId);
        // After the weekly reset date the week starts over, even before the next chat message resets the counter.
        const weekOver = tokens.week_reset_date && Date.now() >= new Date(tokens.week_reset_date).getTime();
        const usedThisWeek = weekOver ? 0 : (tokens.used_this_week || 0);

        const totalPurchased = tokens.total_ai_credits_purchased || 0;
        const balance = tokens.ai_credits_balance || 0;
        const usedAmount = Math.max(0, totalPurchased - balance);

        // Calculate strict start/end dates for Free
        const now = new Date();
        const freeEndDate = tokens.week_reset_date ? new Date(tokens.week_reset_date) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const freeStartDate = new Date(freeEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const pools = [
            {
                creditId: `FREE-${user._id.toString().substring(0, 10).toUpperCase()}`,
                creditType: "Free",
                status: "Active",
                issuedAmount: freeWeeklyLimit,
                amountRemaining: Math.max(0, freeWeeklyLimit - usedThisWeek),
                estimatedAmountRemaining: Math.max(0, freeWeeklyLimit - usedThisWeek),
                startDate: freeStartDate.toISOString(),
                expirationDate: freeEndDate.toISOString()
            }
        ];

        // Promotion Credits
        const totalPromoGranted = tokens.total_promotion_credits_granted || 0;
        let promoBalance = tokens.promotion_credits_balance || 0;
        let promoStatus = "Active";
        const promoEndDate = tokens.promotion_credits_end_date ? new Date(tokens.promotion_credits_end_date) : null;
        
        // Determine correct status based on balance math (paused/revoked credits are already subtracted from balance)
        if (promoBalance <= 0 && totalPromoGranted > 0) {
            promoStatus = "Exhausted";
            promoBalance = 0;
        } else if (promoEndDate && promoEndDate.getTime() < now.getTime()) {
            promoStatus = "Expired";
            promoBalance = 0;
        } else {
            promoStatus = "Active";
        }

        if (totalPromoGranted > 0 || promoBalance > 0) {
            pools.push({
                creditId: `PRM-${user._id.toString().substring(0, 10).toUpperCase()}`,
                creditType: "Promotion",
                status: promoStatus,
                issuedAmount: totalPromoGranted,
                amountRemaining: promoBalance,
                estimatedAmountRemaining: promoBalance,
                startDate: tokens.promotion_credits_start_date ? new Date(tokens.promotion_credits_start_date).toISOString() : now.toISOString(),
                expirationDate: promoEndDate ? promoEndDate.toISOString() : null
            });
        }

        // Paid Credits
        let paidBalance = balance;
        let paidStatus = "Active";
        const paidStartDate = tokens.ai_credits_start_date ? new Date(tokens.ai_credits_start_date) : now;
        const paidExpirationDate = tokens.ai_credits_end_date 
            ? new Date(tokens.ai_credits_end_date) 
            : new Date(paidStartDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days validity
        
        if (paidBalance <= 0 && totalPurchased > 0) {
            paidStatus = "Exhausted";
            paidBalance = 0;
        } else if (paidExpirationDate.getTime() < now.getTime()) {
            paidStatus = "Expired";
            paidBalance = 0;
        }

        if (totalPurchased > 0 || paidBalance > 0) {
            pools.push({
                creditId: `PAID-${user._id.toString().substring(0, 10).toUpperCase()}`,
                creditType: "Paid",
                status: paidStatus,
                issuedAmount: totalPurchased,
                amountRemaining: paidBalance,
                estimatedAmountRemaining: paidBalance,
                startDate: paidStartDate.toISOString(),
                expirationDate: paidExpirationDate.toISOString()
            });
        }

        const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
        const creditsPerInr = globalConfig?.credits_per_inr ?? 5000;

        res.status(200).json({
            success: true,
            data: {
                ...tokens,
                total_ai_credits_purchased: totalPurchased,
                ai_credits_balance: balance,
                ai_credits_used: usedAmount,
                ai_credits_start_date: tokens.ai_credits_start_date || null,
                ai_credits_end_date: tokens.ai_credits_end_date || null,
                pools: pools,
                credits_per_inr: creditsPerInr
            }
        });
    } catch (error) {
        console.error("Get My AI Balance Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch AI balance" });
    }
};

export const getMyPurchaseHistory = async (req, res) => {
    try {
        const history = await AiCreditTransaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error("Get My Top-up History Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch top-up history" });
    }
};

export const getMyUsage = async (req, res) => {
    try {
        // Implement real usage retrieval from Supabase ai_chat_sessions
        const { primarySupabaseClient: supabase } = await import("../../config/supabaseClient.js");
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentChats, error } = await supabase
            .from('ai_chat_sessions')
            .select('created_at')
            .eq('user_email', req.user.email)
            .gte('created_at', sevenDaysAgo.toISOString());

        res.status(200).json({
            success: true,
            data: recentChats || []
        });
    } catch (error) {
        console.error("Get My Usage Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch AI usage" });
    }
};
