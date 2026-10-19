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
const fs = require('fs');

let fileContent = fs.readFileSync('src/controllers/ai-chat.controller.js', 'utf8');

const targetFunctionRegex = /export const getMyUsage = async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: "Failed to fetch token usage" \}\);\s*\}\s*\};/m;

const newFunction = `export const getMyUsage = async (req, res) => {
    try {
        const User = (await import("../models/User.js")).default;
        const Organization = (await import("../models/Organization.js")).default;
        const GlobalAiConfig = (await import("../models/GlobalAiConfig.js")).default;

        const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }) || {
            global_pro_pool_limit: 500000,
            global_user_weekly_limit: 100000,
            global_ai_blocked: false
        };

        const userTokens = await User.findById(req.user.id).select("ai_tokens organization_id role");
        
        let freeLimit = globalConfig.global_user_weekly_limit;
        if (userTokens?.ai_tokens?.custom_limits_enabled) {
            freeLimit = userTokens.ai_tokens.free_weekly_limit || globalConfig.global_user_weekly_limit;
        }

        if (!userTokens || !userTokens.ai_tokens) {
            return res.json({ type: 'free', used: 0, limit: freeLimit, remaining: freeLimit });
        }

        const freeData = {
            used: userTokens.ai_tokens.used_this_week,
            limit: freeLimit,
            remaining: freeLimit - userTokens.ai_tokens.used_this_week,
            resetDate: userTokens.ai_tokens.week_reset_date
        };

        // Return Pro pool if allowed
        if (userTokens.organization_id) {
            const org = await Organization.findById(userTokens.organization_id).select("ai_config");
            if (org && org.ai_config) {
                const isOrgBlocked = org.ai_config.is_ai_blocked || globalConfig.global_ai_blocked;
                if (isOrgBlocked) {
                    return res.status(403).json({ error: "AI access has been blocked for your organization." });
                }

                let poolLimit = globalConfig.global_pro_pool_limit;
                if (org.ai_config.custom_limits_enabled) {
                    poolLimit = org.ai_config.pro_pool_limit || globalConfig.global_pro_pool_limit;
                }

                const proRemaining = poolLimit - org.ai_config.pro_used_this_period;
                if (proRemaining > 0 && (org.ai_config.pro_enabled_roles?.includes(userTokens.role) || org.ai_config.pro_enabled_users?.includes(req.user.id))) {
                    return res.json({
                        type: 'pro',
                        used: org.ai_config.pro_used_this_period,
                        limit: poolLimit,
                        remaining: proRemaining,
                        resetDate: org.ai_config.pro_reset_date,
                        freeData
                    });
                }
            }
        }

        const remaining = freeLimit - userTokens.ai_tokens.used_this_week;
        return res.json({
            type: 'free',
            used: userTokens.ai_tokens.used_this_week,
            limit: freeLimit,
            remaining,
            resetDate: userTokens.ai_tokens.week_reset_date,
            freeData
        });
    } catch (e) {
        console.error("Error getting AI usage:", e);
        res.status(500).json({ error: "Failed to fetch token usage" });
    }
};`;

if (targetFunctionRegex.test(fileContent)) {
    fileContent = fileContent.replace(targetFunctionRegex, newFunction);
    fs.writeFileSync('src/controllers/ai-chat.controller.js', fileContent);
    console.log("Replaced getMyUsage successfully!");
} else {
    console.log("Could not find getMyUsage to replace");
}
