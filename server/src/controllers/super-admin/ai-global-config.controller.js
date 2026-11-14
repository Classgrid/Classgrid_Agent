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
import GlobalAiConfig from "../../models/GlobalAiConfig.js";
import { resolveResetPeriod, parseResetPeriodInput } from "../../services/ai-feature-limits.js";
import { usageToday, forgetCapSettings, DEFAULT_CAP } from "../../services/cf-neuron-cap.service.js";

const effectiveGlobalPeriods = (config) => ({
    tokens: resolveResetPeriod("tokens", null, config, "global"),
    image: resolveResetPeriod("image", null, config, "global"),
    whatsapp: resolveResetPeriod("whatsapp", null, config, "global"),
    calls: resolveResetPeriod("calls", null, config, "global"),
});

// Fetch Global AI Configuration
export const getGlobalAiConfig = async (req, res) => {
    try {
        let config = await GlobalAiConfig.findOne({ key: "singleton" });

        // If it doesn't exist yet, create it with defaults
        if (!config) {
            config = new GlobalAiConfig({
                key: "singleton",
                global_pro_pool_limit: 500000,
                global_user_weekly_limit: 100000,
                global_image_weekly_limit: 20,
                global_whatsapp_scheduling_limit: 10,
                global_call_minutes_limit: 150,
                global_ai_blocked: false,
                credits_per_inr: 3000,
                image_generation_token_cost: 5000,
                cf_input_cost_per_million: 1.32,
                cf_output_cost_per_million: 3.96,
                cf_image_cost_per_unit: 0.0005
            });
            await config.save();
        }

        // (today's Cloudflare Neurons, per model, beside the cap: the super admin sees what a day costs)
        const neurons = await usageToday();
        const cfNeurons = { ...neurons, cap: DEFAULT_CAP, enabled: config.cf_neuron_cap_enabled === true };
        res.status(200).json({ success: true, config: { ...config.toObject(), cfNeurons }, resetPeriods: effectiveGlobalPeriods(config) });
    } catch (error) {
        console.error("[getGlobalAiConfig] Error:", error);
        res.status(500).json({ success: false, message: "Server error fetching global config." });
    }
};

// Update Global AI Configuration
export const updateGlobalAiConfig = async (req, res) => {
    try {
        const { 
            global_pro_pool_limit, 
            global_user_weekly_limit, 
            global_image_weekly_limit,
            global_whatsapp_scheduling_limit, 
            global_call_minutes_limit,
            global_ai_blocked,
            free_limit_per_computer,
            credits_per_inr,
            image_generation_token_cost,
            cf_input_cost_per_million,
            cf_output_cost_per_million,
            cf_image_cost_per_unit,
            cf_neuron_cap_enabled
        } = req.body;

        const resetPeriods = {};
        for (const feature of ["token", "image", "whatsapp", "call"]) {
            const { set, error } = parseResetPeriodInput(req.body, `global_${feature}_reset`);
            if (error) return res.status(400).json({ success: false, message: error, error });
            if (set) resetPeriods[feature] = set;
        }

        let config = await GlobalAiConfig.findOne({ key: "singleton" });

        if (!config) {
            config = new GlobalAiConfig({ key: "singleton" });
        }

        if (global_pro_pool_limit !== undefined) config.global_pro_pool_limit = global_pro_pool_limit;
        if (global_user_weekly_limit !== undefined) config.global_user_weekly_limit = global_user_weekly_limit;
        if (global_image_weekly_limit !== undefined) config.global_image_weekly_limit = global_image_weekly_limit;
        if (global_whatsapp_scheduling_limit !== undefined) config.global_whatsapp_scheduling_limit = global_whatsapp_scheduling_limit;
        if (global_call_minutes_limit !== undefined) config.global_call_minutes_limit = Math.max(0, Number(global_call_minutes_limit) || 0);
        if (global_ai_blocked !== undefined) config.global_ai_blocked = global_ai_blocked;
        if (free_limit_per_computer !== undefined) config.free_limit_per_computer = free_limit_per_computer === true;
        if (credits_per_inr !== undefined) config.credits_per_inr = credits_per_inr;
        if (image_generation_token_cost !== undefined) config.image_generation_token_cost = image_generation_token_cost;
        if (cf_input_cost_per_million !== undefined) config.cf_input_cost_per_million = cf_input_cost_per_million;
        if (cf_output_cost_per_million !== undefined) config.cf_output_cost_per_million = cf_output_cost_per_million;
        if (cf_image_cost_per_unit !== undefined) config.cf_image_cost_per_unit = cf_image_cost_per_unit;
        if (cf_neuron_cap_enabled !== undefined) config.cf_neuron_cap_enabled = cf_neuron_cap_enabled === true;
        for (const [feature, p] of Object.entries(resetPeriods)) {
            config[`global_${feature}_reset_value`] = p.value;
            config[`global_${feature}_reset_unit`] = p.unit;
        }

        await config.save();
        forgetCapSettings(); // (the Cloudflare cap and switch are read again on the next request)

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            // Broadcast to all online users to fetch their new limits
            io.emit("ai_token_update");
        }

        res.status(200).json({ success: true, message: "Global AI Limits updated successfully.", config, resetPeriods: effectiveGlobalPeriods(config) });
    } catch (error) {
        console.error("[updateGlobalAiConfig] Error:", error);
        res.status(500).json({ success: false, message: "Server error updating global config." });
    }
};
