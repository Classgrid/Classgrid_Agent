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
import mongoose from 'mongoose'; import dotenv from 'dotenv'; dotenv.config({ path: './.env' }); import AiCreditTransaction from './src/models/AiCreditTransaction.js'; import User from './src/models/User.js'; import Transaction from './src/models/Transaction.js'; import PlatformTransaction from './src/models/PlatformTransaction.js'; mongoose.connect(process.env.MONGO_URI).then(async () => { console.log('Connected to DB'); await AiCreditTransaction.deleteMany({}); console.log('Deleted all AiCreditTransaction'); await Transaction.deleteMany({}); console.log('Deleted all Transaction'); await PlatformTransaction.deleteMany({}); console.log('Deleted all PlatformTransaction'); await User.updateMany({}, { $set: { 'ai_tokens.ai_credits_balance': 0, 'ai_tokens.promotion_credits_balance': 0, 'ai_tokens.total_ai_credits_purchased': 0, 'ai_tokens.total_promotion_credits_granted': 0, 'ai_tokens.promotion_credit_pools': [], 'ai_tokens.ai_credit_pools': [] } }); console.log('Reset all AI token balances on Users'); process.exit(0); });
