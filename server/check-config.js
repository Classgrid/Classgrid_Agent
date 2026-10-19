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
import mongoose from 'mongoose'; import dotenv from 'dotenv'; import GlobalAiConfig from './src/models/GlobalAiConfig.js'; dotenv.config({ path: './.env' }); mongoose.connect(process.env.MONGO_URI).then(async () => { const config = await GlobalAiConfig.findOne({ key: 'singleton' }).lean(); console.log('\n--- MONGODB ACTUAL VALUES ---'); console.log('Individual Weekly Limit:', config.global_user_weekly_limit); console.log('Organization Pool:', config.global_pro_pool_limit); console.log('Image Generations:', config.global_image_weekly_limit); console.log('WhatsApp Scheduling:', config.global_whatsapp_scheduling_limit); console.log('Credits per INR:', config.credits_per_inr); console.log('-----------------------------\n'); process.exit(0); });
