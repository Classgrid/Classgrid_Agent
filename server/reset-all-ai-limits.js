// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import mongoose from "mongoose";
import dotenv from "dotenv";
import GlobalAiConfig from "./src/models/GlobalAiConfig.js";
import Organization from "./src/models/Organization.js";

dotenv.config({ path: "./.env" });

async function resetAllLimits() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        // 1. Reset Global Limits to 0
        const config = await GlobalAiConfig.findOneAndUpdate(
            { key: "singleton" },
            {
                $set: {
                    global_user_weekly_limit: 0,
                    global_pro_pool_limit: 0,
                    global_image_weekly_limit: 0,
                    global_whatsapp_scheduling_limit: 0
                }
            },
            { returnDocument: 'after', upsert: true }
        );

        console.log("✅ Reset global AI fallback limits to 0:");
        console.log("global_user_weekly_limit:", config.global_user_weekly_limit);
        console.log("global_pro_pool_limit:", config.global_pro_pool_limit);
        console.log("global_image_weekly_limit:", config.global_image_weekly_limit);
        console.log("global_whatsapp_scheduling_limit:", config.global_whatsapp_scheduling_limit);

        // 2. Reset All Organizations to 0
        const result = await Organization.updateMany(
            {},
            {
                $set: {
                    "ai_config.custom_limits_enabled": true, // We want the 0 limits to apply
                    "ai_config.free_weekly_limit_per_user": 0,
                    "ai_config.pro_pool_limit": 0,
                    "ai_config.image_generation_limit": 0,
                    "ai_config.whatsapp_scheduling_limit": 0
                }
            }
        );

        console.log(`✅ Reset separate AI limits to 0 for ${result.modifiedCount} organizations.`);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

resetAllLimits();
