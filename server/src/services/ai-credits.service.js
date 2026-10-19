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
import User from "../models/User.js";
import Organization from "../models/Organization.js";

/**
 * Service to handle mathematical logic and database interactions 
 * for AI tokens/credits across the platform.
 * 
 * NOTE: 1 Credit = 1 Token exactly.
 * Conversion: ₹100 = 500,000 Credits
 */

import GlobalAiConfig from "../models/GlobalAiConfig.js";
import { enqueueEmail } from "./email-queue.service.js";
import { resetPeriodMs } from "./ai-feature-limits.js";
import { getGrantedCreditsLowEmailHtml, getTopUpCreditsLowEmailHtml, getFreeLimitsExhaustedEmailHtml, getGrantedCreditsExhaustedEmailHtml, getTopUpCreditsExhaustedEmailHtml } from "./email-templates.service.js";



export const calculateCreditsFromAmount = async (amountInr) => {
    let multiplier = 0;
    try {
        const config = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
        if (config && config.credits_per_inr !== undefined && config.credits_per_inr !== null) {
            multiplier = config.credits_per_inr;
        }
    } catch (err) {
        console.error("Error fetching credits_per_inr:", err);
    }
    return Math.floor(amountInr * multiplier);
};

/**
 * The free weekly limit set in the super admin dashboard, resolved the same way everywhere:
 * global limit -> org custom limit (when the org doesn't follow global) or the Classgrid limit for users
 * without an org -> the user's own custom limit. Used by the check before a request AND by the deduction
 * after it (they used to differ: the deduction read only user.ai_tokens.free_weekly_limit, default 100,000,
 * so usage stopped being counted at 100k while the check allowed the dashboard's limit).
 */
// End of the user's current token period, always from the reset timing set in the super admin dashboard right now:
// period start + current timing. Users saved before the start was recorded fall back to their saved end date, and a
// saved end further away than the current timing counts as over.
export function tokenWindowEnd(tokens, periodMs, nowMs = Date.now()) {
    const start = tokens?.window_start ? new Date(tokens.window_start).getTime() : 0;
    if (start) return start + periodMs;
    const saved = tokens?.week_reset_date ? new Date(tokens.week_reset_date).getTime() : 0;
    if (!saved || saved - nowMs > periodMs) return 0;
    return saved;
}

export function resolveWeeklyLimit(user, org, globalConfig, orgId = org?._id) {
    let weeklyLimit = globalConfig?.global_user_weekly_limit || 0;
    if (org) {
        if (org.ai_config?.custom_limits_enabled && org.ai_config.free_weekly_limit_per_user !== undefined && org.ai_config.free_weekly_limit_per_user !== null) {
            weeklyLimit = org.ai_config.free_weekly_limit_per_user;
        }
    } else if (!orgId && globalConfig?.classgrid_custom_limits_enabled && globalConfig.classgrid_user_weekly_limit !== undefined && globalConfig.classgrid_user_weekly_limit !== null) {
        weeklyLimit = globalConfig.classgrid_user_weekly_limit;
    }
    if (user?.ai_tokens?.custom_limits_enabled && user.ai_tokens.free_weekly_limit !== undefined && user.ai_tokens.free_weekly_limit !== null) {
        weeklyLimit = user.ai_tokens.free_weekly_limit;
    }
    return weeklyLimit;
}

export const hasEnoughTokens = async (userId, orgId, requiredTokens = 1, { paidOnly = false } = {}) => {
    // 1. Check if user is blocked or suspended
    const user = await User.findById(userId).select('ai_tokens role status');
    if (!user) {
        return { allowed: false, reason: "User not found." };
    }
    if (user.ai_tokens?.is_ai_blocked) {
        return { allowed: false, reason: "User AI access is explicitly blocked." };
    }
    if (user.status && user.status !== "active" && user.status !== "pending") {
        return { allowed: false, reason: `User account is ${user.status}.` };
    }

    // FETCH GLOBAL CONFIG
    const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit global_ai_blocked classgrid_custom_limits_enabled classgrid_user_weekly_limit global_token_reset_value global_token_reset_unit classgrid_token_reset_value classgrid_token_reset_unit global_image_reset_value global_image_reset_unit classgrid_image_reset_value classgrid_image_reset_unit").lean() || {};
    if (globalConfig.global_ai_blocked) {
        return { allowed: false, reason: "AI access is globally blocked by administrators." };
    }

    // Premium models (Claude Fable 5.1): paid credits only, never free weekly, promotion or org-pool tokens
    if (paidOnly) {
        let paid = user.ai_tokens?.ai_credits_balance || 0;
        if (user.ai_tokens?.ai_credits_end_date && new Date(user.ai_tokens.ai_credits_end_date).getTime() < Date.now()) paid = 0;
        if (paid >= requiredTokens) return { allowed: true, source: "personal", remaining: paid };
        return { allowed: false, reason: "Insufficient paid credits.", paidOnly: true, remaining: Math.max(0, paid) };
    }

    // --- SHARED ORG POOL & ORG CUSTOM LIMITS (STEP 2) ---
    let org = null;
    if (orgId) {
        org = await Organization.findById(orgId).select('ai_config status').lean();
        if (org) {
            if (org.status && org.status !== "active") {
                 return { allowed: false, reason: `Organization account is ${org.status}.` };
            }
            if (org.ai_config?.is_ai_blocked) {
                 return { allowed: false, reason: "Organization AI access is explicitly blocked." };
            }

            // Check Org Pool (if org_admin)
            if (user.role === 'org_admin') {
                const orgUsed = org.ai_config?.pro_used_this_period || 0;
                const orgLimit = org.ai_config?.pro_pool_limit || 0;
                if (orgUsed + requiredTokens <= orgLimit) {
                    return { allowed: true, source: "org_pool", remaining: orgLimit - orgUsed };
                }
            }
        }
    }

    // Global -> org (or Classgrid) -> user custom limit, as set in the super admin dashboard.
    const weeklyLimit = resolveWeeklyLimit(user, org, globalConfig, orgId);

    // 2. Check free weekly limit FIRST (Always use free before touching paid/promo)
    let usedThisWeek = user.ai_tokens?.used_this_week || 0;
    // Reset follows the dashboard timing live (see tokenWindowEnd)
    const tokenPeriodMs = resetPeriodMs("tokens", org, globalConfig, orgId);
    const nowMs = Date.now();
    const windowEndMs = tokenWindowEnd(user.ai_tokens, tokenPeriodMs, nowMs);
    const savedResetMs = user.ai_tokens?.week_reset_date ? new Date(user.ai_tokens.week_reset_date).getTime() : 0;
    if (nowMs >= windowEndMs) {
        usedThisWeek = 0;
        const newResetDate = new Date(nowMs + tokenPeriodMs);
        // Async update DB but don't block the chat flow
        User.findByIdAndUpdate(userId, { 
            $set: { 
                "ai_tokens.used_this_week": 0,
                "ai_tokens.window_start": new Date(nowMs),
                "ai_tokens.week_reset_date": newResetDate
            }
        }).catch(e => console.error("Auto-reset error:", e));
        User.updateOne(
            { _id: userId, ai_image_reset_date: null },
            { $set: { ai_image_free_weekly_used: 0, ai_image_reset_date: new Date(nowMs + resetPeriodMs("image", org, globalConfig, orgId)) } }
        ).catch(e => console.error("Image auto-reset error:", e));
    } else if (savedResetMs !== windowEndMs) {
        // The dashboard timing changed: keep the saved end date (shown to users) in step with it
        User.updateOne({ _id: userId }, { $set: { "ai_tokens.week_reset_date": new Date(windowEndMs) } })
            .catch(e => console.error("Reset date update error:", e));
    }

    if (usedThisWeek + requiredTokens <= weeklyLimit) {
        // spendable: what one answer may use in total. deductTokens spills free-pool overflow into the first
        // credit pool, so that pool's balance counts too (the live token check during an answer stops at this number).
        const spill = pickCreditSource(user);
        const t = user.ai_tokens || {};
        const spillBalance = spill === "promotion" ? (t.promotion_credits_balance || 0) : spill === "personal" ? (t.ai_credits_balance || 0) : 0;
        return { allowed: true, source: "weekly_free", remaining: weeklyLimit - usedThisWeek, spendable: weeklyLimit - usedThisWeek + spillBalance };
    }

    // 3. FIFO LOGIC: Determine which came FIRST between Top-Up (Paid) and Granted (Promotion)
    const now = new Date().getTime();
    
    // Check if Promotion credits are expired
    // Note: paused/revoked credits are already subtracted from balance by the per-transaction controllers
    let promoBalance = user.ai_tokens?.promotion_credits_balance || 0;
    if (user.ai_tokens?.promotion_credits_end_date && new Date(user.ai_tokens.promotion_credits_end_date).getTime() < now) {
        promoBalance = 0; // Expired
    }
    
    // Check if Paid credits are expired
    let paidBalance = user.ai_tokens?.ai_credits_balance || 0;
    if (user.ai_tokens?.ai_credits_end_date && new Date(user.ai_tokens.ai_credits_end_date).getTime() < now) {
        paidBalance = 0; // Expired
    }
    
    const promoStart = user.ai_tokens?.promotion_credits_start_date ? new Date(user.ai_tokens.promotion_credits_start_date).getTime() : Infinity;
    const paidStart = user.ai_tokens?.ai_credits_start_date ? new Date(user.ai_tokens.ai_credits_start_date).getTime() : Infinity;

    // Whichever was purchased/granted FIRST gets used FIRST (FIFO)
    if (promoBalance >= requiredTokens && paidBalance >= requiredTokens) {
        if (promoStart <= paidStart) {
            return { allowed: true, source: "promotion", remaining: promoBalance };
        } else {
            return { allowed: true, source: "personal", remaining: paidBalance };
        }
    } else if (promoBalance >= requiredTokens) {
        return { allowed: true, source: "promotion", remaining: promoBalance };
    } else if (paidBalance >= requiredTokens) {
        return { allowed: true, source: "personal", remaining: paidBalance };
    }

    // No single pool covers it, but the pools together may: the free pool spills over into the first credit pool
    // when it runs out (see deductTokens), so free headroom + that pool's balance counts.
    const freeHeadroom = Math.max(0, weeklyLimit - usedThisWeek);
    const spillSource = pickCreditSource(user);
    const spillBalance = spillSource === "promotion" ? promoBalance : spillSource === "personal" ? paidBalance : 0;
    if (freeHeadroom > 0 && freeHeadroom + spillBalance >= requiredTokens) {
        return { allowed: true, source: "weekly_free", remaining: freeHeadroom + spillBalance };
    }

    return { allowed: false, reason: "Insufficient tokens." };
};


// HELPER TO TRIGGER ALERTS
const triggerEmailAlerts = async (userId, orgId, type, oldBalance, currentBalance, totalLimit) => {
    try {
        const user = await User.findById(userId).select('email first_name last_name ai_tokens');
        if (!user || !user.email) return;

        let subdomain = '';
        if (orgId) {
            const org = await Organization.findById(orgId).select('subdomain');
            if (org && org.subdomain) subdomain = org.subdomain;
        }

        const userName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Classgrid User';
        let resetDate = user.ai_tokens?.week_reset_date ? new Date(user.ai_tokens.week_reset_date).toLocaleDateString('en-IN') : 'next week';
        const threshold20 = totalLimit * 0.2;

        // Top-Up Alerts
        if (type === 'personal') {
            if (oldBalance > threshold20 && currentBalance <= threshold20 && currentBalance > 0) {
                await enqueueEmail({
                    to: user.email,
                    subject: "Action Required: You have used 80% of your Top-Up AI Credits",
                    html: getTopUpCreditsLowEmailHtml(userName, subdomain),
                    type: "billing_alert",
                    userId, organizationId: orgId
                });
            }
            if (oldBalance > 0 && currentBalance <= 0) {
                await enqueueEmail({
                    to: user.email,
                    subject: "Action Required: You have reached 100% of your Top-Up AI Credits",
                    html: getTopUpCreditsExhaustedEmailHtml(userName, resetDate, subdomain),
                    type: "billing_alert",
                    userId, organizationId: orgId
                });
            }
        }

        // Granted Credits Alerts
        if (type === 'promotion') {
            if (oldBalance > threshold20 && currentBalance <= threshold20 && currentBalance > 0) {
                const expDate = user.ai_tokens?.promotion_credits_end_date ? new Date(user.ai_tokens.promotion_credits_end_date).toLocaleDateString('en-IN') : 'soon';
                await enqueueEmail({
                    to: user.email,
                    subject: "Action Required: You have used 80% of your Granted AI Credits",
                    html: getGrantedCreditsLowEmailHtml(userName, expDate, subdomain),
                    type: "billing_alert",
                    userId, organizationId: orgId
                });
            }
            if (oldBalance > 0 && currentBalance <= 0) {
                await enqueueEmail({
                    to: user.email,
                    subject: "Action Required: You have reached 100% of your Granted AI Credits",
                    html: getGrantedCreditsExhaustedEmailHtml(userName, resetDate, subdomain),
                    type: "billing_alert",
                    userId, organizationId: orgId
                });
            }
        }

        // Free Limits Alert
        if (type === 'free') {
            if (oldBalance > 0 && currentBalance <= 0) {
                await enqueueEmail({
                    to: user.email,
                    subject: "Action Required: You have reached 100% of your Free AI Usage",
                    html: getFreeLimitsExhaustedEmailHtml(userName, resetDate, subdomain),
                    type: "billing_alert",
                    userId, organizationId: orgId
                });
            }
        }
    } catch (error) {
        console.error('Failed to trigger email alerts:', error);
    }
};

// The credit pool to charge once the free weekly pool is used up: promotion (granted) or personal (paid),
// whichever started first among those with a positive, unexpired balance. Same FIFO rule as hasEnoughTokens.
function pickCreditSource(user) {
    const now = Date.now();
    const t = user?.ai_tokens || {};
    const promoOk = (t.promotion_credits_balance || 0) > 0 && !(t.promotion_credits_end_date && new Date(t.promotion_credits_end_date).getTime() < now);
    const paidOk = (t.ai_credits_balance || 0) > 0 && !(t.ai_credits_end_date && new Date(t.ai_credits_end_date).getTime() < now);
    if (promoOk && paidOk) {
        const promoStart = t.promotion_credits_start_date ? new Date(t.promotion_credits_start_date).getTime() : Infinity;
        const paidStart = t.ai_credits_start_date ? new Date(t.ai_credits_start_date).getTime() : Infinity;
        return promoStart <= paidStart ? "promotion" : "personal";
    }
    if (promoOk) return "promotion";
    if (paidOk) return "personal";
    return null;
}

export const deductTokens = async (userId, orgId, tokenAmount, source) => {
    try {
        let result = { success: false, remaining: 0, type: "unknown" };

        if (source === "personal") {
            // Read current balance FIRST, then cap the deduction
            const user = await User.findById(userId).select("ai_tokens.ai_credits_balance");
            const currentBalance = Math.max(0, user?.ai_tokens?.ai_credits_balance || 0);
            const actualDeduction = Math.min(tokenAmount, currentBalance);
            if (actualDeduction <= 0) {
                return { success: true, remaining: 0, limit: 0, type: "personal", uncharged: tokenAmount };
            }
            const updatedUser = await User.findByIdAndUpdate(userId, {
                $inc: {
                    "ai_tokens.ai_credits_balance": -actualDeduction,
                    "ai_tokens.total_ai_tokens_used": actualDeduction
                }
            }, { returnDocument: 'after' });
            result = { success: true, remaining: Math.max(0, updatedUser.ai_tokens.ai_credits_balance), limit: updatedUser.ai_tokens.ai_credits_balance + actualDeduction, type: "personal", uncharged: tokenAmount - actualDeduction };
            triggerEmailAlerts(userId, orgId, "personal", currentBalance, result.remaining, user?.ai_tokens?.total_ai_credits_purchased || currentBalance);

        } else if (source === "promotion") {
            // Read current balance FIRST, then cap the deduction
            const user = await User.findById(userId).select("ai_tokens.promotion_credits_balance");
            const currentBalance = Math.max(0, user?.ai_tokens?.promotion_credits_balance || 0);
            const actualDeduction = Math.min(tokenAmount, currentBalance);
            if (actualDeduction <= 0) {
                return { success: true, remaining: 0, limit: 0, type: "promotion", uncharged: tokenAmount };
            }
            const updatedUser = await User.findByIdAndUpdate(userId, {
                $inc: {
                    "ai_tokens.promotion_credits_balance": -actualDeduction,
                    "ai_tokens.total_ai_tokens_used": actualDeduction
                }
            }, { returnDocument: 'after' });
            result = { success: true, remaining: Math.max(0, updatedUser.ai_tokens.promotion_credits_balance), limit: updatedUser.ai_tokens.promotion_credits_balance + actualDeduction, type: "promotion", uncharged: tokenAmount - actualDeduction };
            triggerEmailAlerts(userId, orgId, "promotion", currentBalance, result.remaining, user?.ai_tokens?.total_promotion_credits_granted || currentBalance);

        } else if (source === "weekly_free") {
            // Free tier, with the same dashboard limit the pre-request check uses.
            const user = await User.findById(userId).select("ai_tokens");
            const org = orgId ? await Organization.findById(orgId).select("ai_config").lean() : null;
            const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit classgrid_custom_limits_enabled classgrid_user_weekly_limit").lean() || {};
            const weeklyLimit = resolveWeeklyLimit(user, org, globalConfig, orgId);
            const currentUsed = user?.ai_tokens?.used_this_week || 0;
            const headroom = Math.max(0, weeklyLimit - currentUsed);
            const actualDeduction = Math.min(tokenAmount, headroom);
            const overflow = tokenAmount - actualDeduction;

            if (actualDeduction > 0) {
                const updatedUser = await User.findByIdAndUpdate(userId, {
                    $inc: {
                        "ai_tokens.used_this_week": actualDeduction,
                        "ai_tokens.total_ai_tokens_used": actualDeduction
                    }
                }, { returnDocument: 'after' });
                result = { success: true, remaining: Math.max(0, weeklyLimit - updatedUser.ai_tokens.used_this_week), limit: weeklyLimit, type: "free" };
                triggerEmailAlerts(userId, orgId, "free", headroom, result.remaining, weeklyLimit);
            } else {
                result = { success: true, remaining: 0, limit: weeklyLimit, type: "free" };
            }

            // The free pool ran out during this request: the rest is charged to granted or paid credits
            // (whichever started first, as in hasEnoughTokens) instead of being dropped.
            if (overflow > 0) {
                const next = pickCreditSource(user);
                if (next) {
                    const spill = await deductTokens(userId, orgId, overflow, next);
                    result.spilledTo = next;
                    result.spilledTokens = overflow;
                    result.spill = spill;
                    if (spill?.uncharged) result.uncharged = spill.uncharged; // the credit pool ran out too
                } else {
                    result.uncharged = overflow;
                }
            }

        } else if (source === "org_pool") {
            // For org pool: cap so pro_used_this_period never exceeds pro_pool_limit
            const Organization = (await import("../models/Organization.js")).default;
            const org = await Organization.findById(orgId).select("ai_config.pro_used_this_period ai_config.pro_pool_limit");
            const orgLimit = org?.ai_config?.pro_pool_limit || 0;
            const orgUsed = org?.ai_config?.pro_used_this_period || 0;
            const headroom = Math.max(0, orgLimit - orgUsed);
            const actualDeduction = Math.min(tokenAmount, headroom);
            if (actualDeduction <= 0) {
                return { success: true, remaining: 0, limit: orgLimit, type: "pro", uncharged: tokenAmount };
            }
            const updatedOrg = await Organization.findByIdAndUpdate(orgId, {
                $inc: {
                    "ai_config.pro_used_this_period": actualDeduction,
                    "ai_config.total_ai_tokens_used": actualDeduction
                }
            }, { returnDocument: 'after' });
            await User.findByIdAndUpdate(userId, {
                $inc: { "ai_tokens.total_ai_tokens_used": actualDeduction }
            });
            result = { success: true, remaining: Math.max(0, updatedOrg.ai_config.pro_pool_limit - updatedOrg.ai_config.pro_used_this_period), limit: updatedOrg.ai_config.pro_pool_limit, type: "pro", uncharged: tokenAmount - actualDeduction };
        }

        if (result.success) {
            import("../services/socket.service.js").then(({ getIO }) => {
                const io = getIO();
                if (io) {
                    io.to(userId.toString()).emit("ai_token_update");
                    io.to("superadmin:ai_usage").emit("ai_usage_updated");
                }
            }).catch(err => console.error("Socket error in deductTokens:", err));
        }

        return result;
    } catch (error) {
        console.error("Error deducting tokens:", error);
        return { success: false, remaining: 0, type: "unknown" };
    }
};

export const addCredits = async (userId, amountToAdd) => {
    try {
        const user = await User.findByIdAndUpdate(userId, {
            $inc: { "ai_tokens.ai_credits_balance": amountToAdd }
        }, { returnDocument: 'after' });
        
        import("../services/socket.service.js").then(({ getIO }) => {
            const io = getIO();
            if (io) {
                io.to(userId.toString()).emit("ai_token_update");
                io.to("superadmin:ai_usage").emit("ai_usage_updated");
            }
        }).catch(err => console.error("Socket error in addCredits:", err));
        
        return user;
    } catch (error) {
        console.error("Error adding credits:", error);
        return null;
    }
};

export const getImageGenerationCost = async () => {
    try {
        const config = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
        if (config && config.image_generation_token_cost !== undefined && config.image_generation_token_cost !== null) {
            return config.image_generation_token_cost;
        }
    } catch (err) {
        console.error("Error fetching image_generation_token_cost:", err);
    }
    return 0;
};

