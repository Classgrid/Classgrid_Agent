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
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const AiUsageLog = require('./src/models/AiUsageLog.js').default || require('./src/models/AiUsageLog.js');
    const logMatch = { createdAt: { $gte: new Date(2026, 8, 1), $lt: new Date(2026, 9, 1) } };
    const modelData = await AiUsageLog.aggregate([{ $match: logMatch }, { $group: { _id: '$model', requests: { $sum: 1 }, tokens: { $sum: '$totalTokens' } } }]);
    console.log("DATA:");
    console.log(JSON.stringify(modelData, null, 2));
    process.exit(0);
});
