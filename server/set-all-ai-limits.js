// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import mongoose from "mongoose";
import dotenv from "dotenv";
import GlobalAiConfig from "./src/models/GlobalAiConfig.js";
import Organization from "./src/models/Organization.js";

dotenv.config({ path: "./.env" });

async function setAllLimits() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const USER_LIMIT = 1000000;    // 10 lakh
        const POOL_LIMIT = 5000000;    // 50 lakh
        const MEDIA_LIMIT = 10;        // 10 images / messages

        // 1. Set Global Limits
        const config = await GlobalAiConfig.findOneAndUpdate(
            { key: "singleton" },
            {
                $set: {
                    global_user_weekly_limit: USER_LIMIT,
                    global_pro_pool_limit: POOL_LIMIT,
                    global_image_weekly_limit: MEDIA_LIMIT,
                    global_whatsapp_scheduling_limit: MEDIA_LIMIT,
                    credits_per_inr: 5000, // Restoring reasonable pricing since test is done
                    image_generation_token_cost: 5000
                }
            },
            { returnDocument: 'after', upsert: true }
        );

        console.log("✅ Set global AI fallback limits:");
        console.log("global_user_weekly_limit:", config.global_user_weekly_limit);
        console.log("global_pro_pool_limit:", config.global_pro_pool_limit);
        console.log("global_image_weekly_limit:", config.global_image_weekly_limit);
        console.log("global_whatsapp_scheduling_limit:", config.global_whatsapp_scheduling_limit);
        console.log("credits_per_inr:", config.credits_per_inr);

        // 2. Set All Organizations
        const result = await Organization.updateMany(
            {},
            {
                $set: {
                    "ai_config.custom_limits_enabled": true,
                    "ai_config.free_weekly_limit_per_user": USER_LIMIT,
                    "ai_config.pro_pool_limit": POOL_LIMIT,
                    "ai_config.image_generation_limit": MEDIA_LIMIT,
                    "ai_config.whatsapp_scheduling_limit": MEDIA_LIMIT
                }
            }
        );

        console.log(`✅ Set separate AI limits for ${result.modifiedCount} organizations.`);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

setAllLimits();
