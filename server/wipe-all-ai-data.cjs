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
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = (await import('./src/models/User.js')).default;
        const AiCreditTransaction = (await import('./src/models/AiCreditTransaction.js')).default;
        
        console.log('Deleting all AiCreditTransactions...');
        await AiCreditTransaction.deleteMany({});
        
        console.log('Resetting all user AI tokens and global flags...');
        await User.updateMany({}, {
            $set: {
                'ai_tokens.ai_credits_balance': 0,
                'ai_tokens.total_ai_credits_purchased': 0,
                'ai_tokens.total_ai_tokens_used': 0,
                'ai_tokens.promotion_credits_balance': 0,
                'ai_tokens.total_promotion_credits_granted': 0,
                'ai_tokens.used_this_week': 0,
                'ai_tokens.promotion_credits_paused': false,
                'ai_tokens.promotion_credits_revoked': false,
                'ai_tokens.promotion_credits_start_date': null,
                'ai_tokens.promotion_credits_end_date': null,
                'ai_tokens.ai_credits_start_date': null,
                'ai_tokens.ai_credits_end_date': null,
                'ai_tokens.paid_credit_pools': [],
                'ai_tokens.promotion_credit_pools': []
            }
        });
        
        console.log('All billing history, AI grants, and usage have been completely wiped.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
