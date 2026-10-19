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
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
/**
 * Seed script: Create / upgrade the admin@classgrid.in account to PRO plan.
 * 
 * Usage: node scripts/seed-pro-account.js
 * 
 * If the org already exists, it upgrades its plan to PRO.
 * If not, it creates a new organization + org_admin.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
}

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Check if admin@classgrid.in exists
    const adminEmail = 'admin@classgrid.in';
    const password = 'dummy_pass_123';
    const passwordHash = await bcrypt.hash(password, 12);

    let user = await db.collection('users').findOne({ email: adminEmail });

    if (user) {
        console.log(`✅ User ${adminEmail} already exists (ID: ${user._id})`);
        // Update password
        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { password: passwordHash } }
        );
        console.log('✅ Password updated');
    } else {
        // Create user
        const result = await db.collection('users').insertOne({
            name: 'Classgrid Admin',
            email: adminEmail,
            password: passwordHash,
            role: 'org_admin',
            isVerified: true,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        user = { _id: result.insertedId };
        console.log(`✅ Created user ${adminEmail} (ID: ${user._id})`);
    }

    // 2. Find or create org linked to this user
    let org = await db.collection('organizations').findOne({ owner_id: user._id });

    if (!org) {
        // Also check if user has organization_id
        const u = await db.collection('users').findOne({ email: adminEmail });
        if (u && u.organization_id) {
            org = await db.collection('organizations').findOne({ _id: u.organization_id });
        }
    }

    if (org) {
        console.log(`✅ Organization found: ${org.name} (ID: ${org._id})`);
        // Upgrade to PRO
        await db.collection('organizations').updateOne(
            { _id: org._id },
            {
                $set: {
                    plan: 'PRO',
                    studentLimit: 150,
                    planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                },
            }
        );
        console.log('✅ Organization upgraded to PRO plan');
    } else {
        console.log('⚠️  No organization found for this user.\n    Login to the super admin portal and assign a PRO plan to their org,\n    or approve their pending org application first.');
    }

    // 3. Ensure user role is org_admin
    await db.collection('users').updateOne(
        { email: adminEmail },
        { $set: { role: 'org_admin', isVerified: true, status: 'active' } }
    );

    console.log('\n🎯 Done! admin@classgrid.in is ready:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${password}`);
    console.log(`   Plan:     PRO`);

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
