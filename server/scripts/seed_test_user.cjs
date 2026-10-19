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
require('dotenv').config();

async function run() {
    const email = process.argv[2];
    const name = process.argv[3] || "Test Teacher";

    if (!email) {
        console.error("Please provide an email address. Example: node seed_test_user.cjs test@example.com 'John Doe'");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        
        // Create or update the test user as a Teacher
        await db.collection('users').updateOne(
            { email: email.toLowerCase() },
            { 
                $set: { 
                    name: name,
                    email: email.toLowerCase(),
                    role: "teacher",
                    status: "active",
                    organization_id: new mongoose.Types.ObjectId('6a2d45442e720333c3ab5bb7')
                } 
            },
            { upsert: true }
        );
        
        console.log(`✅ Successfully seeded ${name} (${email}) as a Teacher in the database!`);
    } catch (e) {
        console.error("Error seeding user:", e);
    } finally {
        process.exit(0);
    }
}
run();
