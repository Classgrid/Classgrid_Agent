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
import mongoose from "mongoose";
import dotenv from "dotenv";
import GlobalAiConfig from "./server/src/models/GlobalAiConfig.js";

dotenv.config({ path: "./server/.env" });

async function resetGlobalConfig() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

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
            { new: true, upsert: true }
        );

        console.log("Reset global AI fallback limits to 0:");
        console.log("global_user_weekly_limit:", config.global_user_weekly_limit);
        console.log("global_pro_pool_limit:", config.global_pro_pool_limit);
        console.log("global_image_weekly_limit:", config.global_image_weekly_limit);
        console.log("global_whatsapp_scheduling_limit:", config.global_whatsapp_scheduling_limit);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

resetGlobalConfig();
