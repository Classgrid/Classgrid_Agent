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
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error("No MONGO_URI found"); process.exit(1); }

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const userId = "6a30f80aa7923b64993a4823";

    // Delete all old duplicate rows (type: revoke, pause, resume, extend) for this user
    const result = await mongoose.connection.db.collection("aicredittransactions").deleteMany({
        userId: new mongoose.Types.ObjectId(userId),
        type: { $in: ["revoke", "pause", "resume", "extend"] }
    });

    console.log(`Deleted ${result.deletedCount} old duplicate transaction rows`);

    // Show what's left
    const remaining = await mongoose.connection.db.collection("aicredittransactions").find({
        userId: new mongoose.Types.ObjectId(userId)
    }).toArray();

    console.log(`Remaining transactions for user:`);
    remaining.forEach(t => {
        console.log(`  ${t.type} | +${t.credits_added} | ${t.status}`);
    });

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
