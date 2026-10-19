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
import mongoose from "mongoose";
import dotenv from "dotenv";
import AiUsageLog from "./src/models/AiUsageLog.js";
import Organization from "./src/models/Organization.js";
import User from "./src/models/User.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to MongoDB");
        
        await AiUsageLog.deleteMany({});
        console.log("Cleared existing AiUsageLogs");

        const orgs = await Organization.find({}).limit(5);
        const orgIds = orgs.map(o => o._id);
        if (orgIds.length === 0) {
            orgIds.push(new mongoose.Types.ObjectId());
        }

        const users = await User.find({}).limit(20);
        const userIds = users.map(u => u._id);
        if (userIds.length === 0) {
            userIds.push(new mongoose.Types.ObjectId());
        }

        const models = [
            "@cf/deepseek-ai/deepseek-v4-pro-0813",
            "@cf/black-forest-labs/flux-1-schnell",
            "@cf/meta/llama-3.2-11b-vision-instruct",
            "@cf/openai/whisper-large-v3-turbo",
            "@cf/deepgram/aura-2-en",
            "@cf/runwayml/stable-diffusion-v1-5-img2img"
        ];
        
        const logs = [];
        const now = new Date();
        
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            
            const requestsToday = Math.floor(Math.random() * 50) + 10;
            
            for (let j = 0; j < requestsToday; j++) {
                const model = models[Math.floor(Math.random() * models.length)];
                
                const createdAt = new Date(date);
                createdAt.setHours(Math.floor(Math.random() * 24));
                createdAt.setMinutes(Math.floor(Math.random() * 60));
                
                logs.push({
                    userId: userIds[Math.floor(Math.random() * userIds.length)],
                    organization_id: orgIds[Math.floor(Math.random() * orgIds.length)], // Use real orgs!
                    provider: "cloudflare",
                    model: model,
                    feature: "chat_ai",
                    promptTokens: Math.floor(Math.random() * 500) + 100,
                    completionTokens: Math.floor(Math.random() * 1000) + 200,
                    totalTokens: 0, 
                    success: Math.random() > 0.05,
                    createdAt: createdAt
                });
            }
        }

        logs.forEach(l => l.totalTokens = l.promptTokens + l.completionTokens);

        await AiUsageLog.insertMany(logs);
        console.log(`Successfully seeded ${logs.length} AiUsageLog entries with real orgs.`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
