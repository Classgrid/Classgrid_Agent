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
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

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
import { createClient } from '@supabase/supabase-js';

// Setup environment
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

// Simple schema to read old memberships
const classroomMembershipSchema = new mongoose.Schema({
    classroom: String,
    student: String,
    status: String,
    createdAt: Date,
    updatedAt: Date
});
const MongoMembership = mongoose.model('ClassroomMembership', classroomMembershipSchema);

// Supabase client using primary credentials
const supabaseUrl = process.env.SUPABASE_CHAT_URL;
const supabaseKey = process.env.SUPABASE_CHAT_KEY;
const sb = createClient(supabaseUrl, supabaseKey);

async function migrateMemberships() {
    console.log('Starting migration...');
    await connectDB();

    try {
        // Find all memberships in MongoDB
        const memberships = await MongoMembership.find().lean();
        console.log(`Found ${memberships.length} memberships in MongoDB.`);

        if (memberships.length === 0) {
            console.log('No memberships to migrate. Exiting.');
            process.exit(0);
        }

        let successCount = 0;
        let errorCount = 0;

        for (const [index, mem] of memberships.entries()) {
            if (!mem.classroom || !mem.student) {
               console.warn(`[${index + 1}/${memberships.length}] Skipping corrupted membership: missing student or classroom.`);
               errorCount++;
               continue;    
            }

            // check if it's already in Supabase
            const { data: existing, error: checkErr } = await sb
                .from('classroom_memberships')
                .select('id')
                .eq('classroom_id', mem.classroom.toString())
                .eq('student_id', mem.student.toString())
                .maybeSingle();

            if (checkErr) { // skip error check logging if we can
               console.error(`[${index + 1}/${memberships.length}] Error checking Supabase:`, checkErr.message);
               errorCount++;
               continue;
            }

            if (existing) {
                console.log(`[${index + 1}/${memberships.length}] Skiping ${mem.student} in ${mem.classroom} (Already exists in Supabase)`);
                continue;
            }

            // Insert into Supabase
            const { error: insertErr } = await sb
                .from('classroom_memberships')
                .insert({
                    classroom_id: mem.classroom.toString(),
                    student_id: mem.student.toString(),
                    status: mem.status || 'approved',
                    joined_at: mem.status === 'approved' ? mem.updatedAt || new Date() : null,
                    created_at: mem.createdAt || new Date()
                });

            if (insertErr) {
                console.error(`[${index + 1}/${memberships.length}] ❌ Failed to insert ${mem.student} in ${mem.classroom}:`, insertErr.message);
                errorCount++;
            } else {
                console.log(`[${index + 1}/${memberships.length}] ✅ Migrated ${mem.student} to ${mem.classroom} successfully.`);
                successCount++;
            }
        }

        console.log('\n--- Migration Summary ---');
        console.log(`Total checked: ${memberships.length}`);
        console.log(`Successfully migrated: ${successCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (error) {
        console.error('Fatal Migration Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

migrateMemberships();
