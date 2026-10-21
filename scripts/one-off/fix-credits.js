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
import mongoose from 'mongoose';
import User from './server/src/models/User.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/classgrid');
  
  const usersToFix = await User.find({ 'ai_tokens.ai_credits_balance': { $gt: 0 } });
  
  for (let user of usersToFix) {
    if (!user.ai_tokens.total_ai_credits_purchased || user.ai_tokens.total_ai_credits_purchased === 0) {
       console.log('Fixing user:', user.email, 'balance:', user.ai_tokens.ai_credits_balance);
       user.ai_tokens.total_ai_credits_purchased = user.ai_tokens.ai_credits_balance;
       await user.save();
    }
  }
  
  console.log('Done fixing old records');
  process.exit(0);
}

run();
