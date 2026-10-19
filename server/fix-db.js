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
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const User = (await import('./src/models/User.js')).default;
  const AiCreditTransaction = (await import('./src/models/AiCreditTransaction.js')).default;

  const user = await User.findOne({ name: 'Nikhil (Test)' });
  if (user) {
     const topups = await AiCreditTransaction.find({ userId: user._id, type: 'topup', status: 'success' });
     const total = topups.reduce((acc, curr) => acc + curr.credits_added, 0);
     
     console.log('Found topups for Nikhil (Test). Total:', total);
     
     if (total > 0) {
       await User.findByIdAndUpdate(user._id, {
           $set: { 'ai_tokens.total_ai_credits_purchased': total }
       });
       console.log('Fixed total_ai_credits_purchased to', total);
     }
  }
  process.exit(0);
};
run();
