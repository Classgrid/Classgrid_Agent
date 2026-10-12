// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import mongoose from "mongoose";
import dotenv from "dotenv";
import GlobalAiConfig from "./src/models/GlobalAiConfig.js";

dotenv.config({ path: "./.env" });

async function resetPricing() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const config = await GlobalAiConfig.findOneAndUpdate(
            { key: "singleton" },
            {
                $set: {
                    credits_per_inr: 0,
                    image_generation_token_cost: 0
                }
            },
            { returnDocument: 'after', upsert: true }
        );

        console.log("✅ Reset global AI pricing to 0:");
        console.log("credits_per_inr:", config.credits_per_inr);
        console.log("image_generation_token_cost:", config.image_generation_token_cost);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

resetPricing();
