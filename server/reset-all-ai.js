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
/**
 * NUCLEAR AI RESET - Wipe EVERYTHING
 * Resets all limits, all configs, all balances to absolute zero.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected!\n");
    const db = mongoose.connection.db;

    // 1. NUKE all user ai_tokens - set everything to 0, remove all custom limits
    console.log("🧹 [1/4] Nuking ALL user ai_tokens...");
    const userResult = await db.collection('users').updateMany({}, {
        $set: {
            "ai_tokens.used_this_week": 0,
            "ai_tokens.free_weekly_limit": 0,
            "ai_tokens.total_ai_tokens_used": 0,
            "ai_tokens.ai_credits_balance": 0,
            "ai_tokens.total_ai_credits_purchased": 0,
            "ai_tokens.promotion_credits_balance": 0,
            "ai_tokens.total_promotion_credits_granted": 0,
            "ai_tokens.promotion_credits_paused": false,
            "ai_tokens.is_ai_blocked": false,
            "ai_tokens.custom_limits_enabled": false,
        },
        $unset: {
            "ai_tokens.ai_credits_start_date": "",
            "ai_tokens.ai_credits_end_date": "",
            "ai_tokens.promotion_credits_start_date": "",
            "ai_tokens.promotion_credits_end_date": "",
            "ai_tokens.promotion_credits_granted_at": "",
            "ai_tokens.promotion_credits_expiration": "",
            "ai_tokens.promotion_credits_granted_by": "",
            "ai_tokens.week_reset_date": "",
        }
    });
    console.log(`   ✅ Nuked ${userResult.modifiedCount} users.\n`);

    // 2. DELETE all transactions
    console.log("🧹 [2/4] Deleting ALL AiCreditTransaction records...");
    const txnResult = await db.collection('aicredittransactions').deleteMany({});
    console.log(`   ✅ Deleted ${txnResult.deletedCount} transactions.\n`);

    // 3. NUKE all org ai_config - set limits to 0
    console.log("🧹 [3/4] Nuking ALL organization ai_config...");
    const orgResult = await db.collection('organizations').updateMany({}, {
        $set: {
            "ai_config.pro_pool_limit": 0,
            "ai_config.pro_used_this_period": 0,
            "ai_config.total_ai_tokens_used": 0,
            "ai_config.user_weekly_limit": 0,
            "ai_config.is_ai_blocked": false,
            "ai_config.custom_limits_enabled": false,
            "ai_config.image_weekly_limit": 0,
            "ai_config.whatsapp_scheduling_limit": 0,
        }
    });
    console.log(`   ✅ Nuked ${orgResult.modifiedCount} organizations.\n`);

    // 4. NUKE GlobalAiConfig - set ALL limits to 0
    console.log("🧹 [4/4] Nuking GlobalAiConfig (all global limits to 0)...");
    const globalResult = await db.collection('globalaiconfigs').updateMany({}, {
        $set: {
            "global_pro_pool_limit": 0,
            "global_user_weekly_limit": 0,
            "global_image_weekly_limit": 0,
            "global_whatsapp_scheduling_limit": 0,
            "global_ai_blocked": false,
            "classgrid_custom_limits_enabled": false,
        }
    });
    console.log(`   ✅ Nuked ${globalResult.modifiedCount} global configs.\n`);

    // VERIFY
    console.log("🔍 Verifying Nikhil (Test)...");
    const nikhil = await db.collection('users').findOne(
        { email: "quantumchem25@gmail.com" },
        { projection: { ai_tokens: 1, name: 1 } }
    );
    console.log(JSON.stringify(nikhil?.ai_tokens, null, 2));

    console.log("\n🔍 Verifying GlobalAiConfig...");
    const cfg = await db.collection('globalaiconfigs').findOne({});
    console.log(`   weekly_limit: ${cfg.global_user_weekly_limit}`);
    console.log(`   pool_limit: ${cfg.global_pro_pool_limit}`);
    console.log(`   image_limit: ${cfg.global_image_weekly_limit}`);

    console.log("\n" + "=".repeat(50));
    console.log("🎉 NUCLEAR RESET COMPLETE! Everything is at ZERO.");
    console.log("=".repeat(50));

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => { console.error("❌ Failed:", err); process.exit(1); });
