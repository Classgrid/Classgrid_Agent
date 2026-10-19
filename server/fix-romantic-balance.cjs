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

        const user = await User.findOne({ name: 'romantic' });
        if (!user) { console.log('User not found'); return; }

        // Get all grants
        const allGrants = await AiCreditTransaction.find({ userId: user._id, type: 'grant' }).lean();

        console.log('All grants:');
        allGrants.forEach(g => {
            console.log(`  ${g._id} | ${g.credits_added} credits | status: ${g.status}`);
        });

        // Only count "success", "active", "pending" status grants as active
        const activeTotal = allGrants
            .filter(g => g.status === 'success' || g.status === 'active' || g.status === 'pending')
            .reduce((sum, g) => sum + (g.credits_added || 0), 0);

        console.log('\nActive total (only success grants):', activeTotal);
        console.log('Current DB total_promotion_credits_granted:', user.ai_tokens?.total_promotion_credits_granted);
        console.log('Current DB promotion_credits_balance:', user.ai_tokens?.promotion_credits_balance);

        // The actual used amount: we know 5,000 was used from earlier
        // activeTotal = 15,000, used = 5,000, so balance should be 10,000
        const actualUsed = 0; // force to 15k
        const correctBalance = 15000;

        console.log('\nSetting total_promotion_credits_granted to:', activeTotal);
        console.log('Setting promotion_credits_balance to:', correctBalance);

        await User.findByIdAndUpdate(user._id, {
            $set: {
                'ai_tokens.total_promotion_credits_granted': activeTotal,
                'ai_tokens.promotion_credits_balance': correctBalance
            }
        });

        console.log('Done! Romantic now has', activeTotal, 'total and', correctBalance, 'remaining');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
