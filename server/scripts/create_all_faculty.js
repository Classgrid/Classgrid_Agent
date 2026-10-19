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
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const facultyList = [

    {
        name: 'Prof (Faculty)',
        email: 'physics@classgrid.in',
        subject: 'physics',
        password: 'dummy_pass_123'
    },
    {
        name: 'Prof. Math Faculty',
        email: 'math@classgrid.in',
        subject: 'mathematics',
        password: 'dummy_pass_123'
    },
    {
        name: 'Prof. CPP Faculty',
        email: 'cpp@classgrid.in',
        subject: 'cpp',
        password: 'dummy_pass_123'
    },
    {
        name: 'Prof. Amol Kharche',
        email: 'amol.kharche@classgrid.in',
        subject: 'science',
        password: 'dummy_pass_123'
    }
];

const createAllFaculty = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        for (const faculty of facultyList) {
            const hashedPassword = await bcrypt.hash(faculty.password, 12);
            let user = await User.findOne({ email: faculty.email.toLowerCase().trim() });

            if (user) {
                console.log(`🔄 Updating: ${faculty.email}`);
                user.name = faculty.name; // Added name update
                user.password = hashedPassword;
                user.role = 'teacher';
                user.subject = faculty.subject;
                user.isEmailVerified = true;
                user.authProvider = 'manual';
                if (!user.linkedProviders) user.linkedProviders = [];
                if (!user.linkedProviders.includes('manual')) user.linkedProviders.push('manual');
                await user.save();
                console.log(`   ✅ Updated → ${faculty.name} (${faculty.subject})`);
            } else {
                console.log(`🆕 Creating: ${faculty.email}`);
                user = new User({
                    name: faculty.name,
                    email: faculty.email.toLowerCase().trim(),
                    password: hashedPassword,
                    role: 'teacher',
                    subject: faculty.subject,
                    isEmailVerified: true,
                    authProvider: 'manual',
                    linkedProviders: ['manual']
                });
                await user.save();
                console.log(`   ✅ Created → ${faculty.name} (${faculty.subject})`);
            }
        }

        console.log('\n🎉 All faculty accounts ready!');
        console.log('================================');
        console.log('Login Credentials:');
        facultyList.forEach(f => {
            console.log(`  📧 ${f.email} → 🔑 ${f.password} → 📚 ${f.subject}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createAllFaculty();
