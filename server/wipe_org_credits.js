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
import mongoose from 'mongoose'; import dotenv from 'dotenv'; dotenv.config({ path: './.env' }); import OrganizationCreditAccount from './src/models/OrganizationCreditAccount.js'; import OrganizationCreditEntry from './src/models/OrganizationCreditEntry.js'; import Organization from './src/models/Organization.js'; mongoose.connect(process.env.MONGO_URI).then(async () => { console.log('Connected to DB'); await OrganizationCreditAccount.deleteMany({}); await OrganizationCreditEntry.deleteMany({}); console.log('Deleted all Org Credit Accounts and Entries'); await Organization.updateMany({}, { $set: { 'ai_config.total_ai_tokens_used': 0, 'ai_config.pro_used_this_period': 0 } }); console.log('Reset Org AI Usage'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
