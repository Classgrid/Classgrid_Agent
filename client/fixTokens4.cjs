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

// 1. Fix ai-credits.service.js
const creditsServiceFile = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/services/ai-credits.service.js';
let creditsContent = fs.readFileSync(creditsServiceFile, 'utf8');

creditsContent = creditsContent.replace(
`    // 2. Check if org is blocked
    const org = await Organization.findById(orgId).select('ai_config status');
    if (!org || org.status !== "active" || org.ai_config?.is_ai_blocked) {
        return { allowed: false, reason: "Organization AI access is blocked or inactive." };
    }

    // 3. Check personal balance first
    if (user.ai_tokens?.ai_credits_balance >= requiredTokens) {
        return { allowed: true, source: "personal" };
    }

    // 4. Check free weekly limit
    const usedThisWeek = user.ai_tokens?.used_this_week || 0;
    const weeklyLimit = user.ai_tokens?.free_weekly_limit || 0;
    if (usedThisWeek + requiredTokens <= weeklyLimit) {
        return { allowed: true, source: "weekly_free" };
    }

    // 5. Check Org pro pool limit (if enabled for user's role/id)
    // Assuming role check happens before this function or we just check pool size
    const orgUsed = org.ai_config?.pro_used_this_period || 0;
    const orgLimit = org.ai_config?.pro_pool_limit || 0;
    
    if (orgUsed + requiredTokens <= orgLimit) {
        return { allowed: true, source: "org_pool" };
    }`,
`    // 2. Check if org is blocked
    let org = null;
    if (orgId) {
        org = await Organization.findById(orgId).select('ai_config status');
        if (org && (org.status !== "active" || org.ai_config?.is_ai_blocked)) {
            return { allowed: false, reason: "Organization AI access is blocked or inactive." };
        }
    }

    // 3. Check personal balance first
    if (user.ai_tokens?.ai_credits_balance >= requiredTokens) {
        return { allowed: true, source: "personal" };
    }

    // 4. Check free weekly limit
    const usedThisWeek = user.ai_tokens?.used_this_week || 0;
    const weeklyLimit = user.ai_tokens?.free_weekly_limit || 0;
    if (usedThisWeek + requiredTokens <= weeklyLimit) {
        return { allowed: true, source: "weekly_free" };
    }

    // 5. Check Org pro pool limit (if enabled for user's role/id)
    if (org) {
        const orgUsed = org.ai_config?.pro_used_this_period || 0;
        const orgLimit = org.ai_config?.pro_pool_limit || 0;
        
        if (orgUsed + requiredTokens <= orgLimit) {
            return { allowed: true, source: "org_pool" };
        }
    }`
);

fs.writeFileSync(creditsServiceFile, creditsContent);

// 2. Fix ai-chat.controller.js
const chatControllerFile = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/ai-chat.controller.js';
let chatContent = fs.readFileSync(chatControllerFile, 'utf8');

chatContent = chatContent.replace(
`            const check = await hasEnoughTokens(userId, orgId, estimatedCost);
            if (!check.allowed) {
                res.writeHead(429, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "ai_quota_exceeded", message: check.reason }));
                return;
            }`,
`            const check = await hasEnoughTokens(userId, orgId, estimatedCost);
            if (!check.allowed) {
                const user = await User.findById(userId).select("ai_tokens");
                const resetDate = user?.ai_tokens?.week_reset_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                res.writeHead(429, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "ai_quota_exceeded", message: check.reason, resetDate: resetDate.toISOString() }));
                return;
            }`
);

fs.writeFileSync(chatControllerFile, chatContent);

console.log("Fixed token logic and chat controller reset date response.");
