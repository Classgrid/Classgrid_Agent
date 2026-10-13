// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import GlobalAiConfig from "../../models/GlobalAiConfig.js";

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
                global_ai_blocked: false,
                credits_per_inr: 3000,
                image_generation_token_cost: 5000,
                cf_input_cost_per_million: 1.32,
                cf_output_cost_per_million: 3.96,
                cf_image_cost_per_unit: 0.0005
            });
            await config.save();
        }

        res.status(200).json({ success: true, config });
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
            global_ai_blocked,
            credits_per_inr,
            image_generation_token_cost,
            cf_input_cost_per_million,
            cf_output_cost_per_million,
            cf_image_cost_per_unit
        } = req.body;

        let config = await GlobalAiConfig.findOne({ key: "singleton" });

        if (!config) {
            config = new GlobalAiConfig({ key: "singleton" });
        }

        if (global_pro_pool_limit !== undefined) config.global_pro_pool_limit = global_pro_pool_limit;
        if (global_user_weekly_limit !== undefined) config.global_user_weekly_limit = global_user_weekly_limit;
        if (global_image_weekly_limit !== undefined) config.global_image_weekly_limit = global_image_weekly_limit;
        if (global_whatsapp_scheduling_limit !== undefined) config.global_whatsapp_scheduling_limit = global_whatsapp_scheduling_limit;
        if (global_ai_blocked !== undefined) config.global_ai_blocked = global_ai_blocked;
        if (credits_per_inr !== undefined) config.credits_per_inr = credits_per_inr;
        if (image_generation_token_cost !== undefined) config.image_generation_token_cost = image_generation_token_cost;
        if (cf_input_cost_per_million !== undefined) config.cf_input_cost_per_million = cf_input_cost_per_million;
        if (cf_output_cost_per_million !== undefined) config.cf_output_cost_per_million = cf_output_cost_per_million;
        if (cf_image_cost_per_unit !== undefined) config.cf_image_cost_per_unit = cf_image_cost_per_unit;

        await config.save();

        const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
            // Broadcast to all online users to fetch their new limits
            io.emit("ai_token_update");
        }

        res.status(200).json({ success: true, message: "Global AI Limits updated successfully.", config });
    } catch (error) {
        console.error("[updateGlobalAiConfig] Error:", error);
        res.status(500).json({ success: false, message: "Server error updating global config." });
    }
};
