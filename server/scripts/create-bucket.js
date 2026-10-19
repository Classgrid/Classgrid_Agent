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
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.CLASSROOM_SUPABASE_URL;
const key = process.env.CLASSROOM_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing CLASSROOM credentials!");
    process.exit(1);
}

const adminClient = createClient(url, key);

async function run() {
    try {
        console.log("Checking if bucket exists in CLASSROOM project...");
        const { data: buckets, error: listError } = await adminClient.storage.listBuckets();
        
        if (listError) {
            console.error("Error listing buckets:", listError);
            return;
        }

        const bucketExists = buckets.some(b => b.name === 'admission-documents');
        if (bucketExists) {
            console.log("Bucket 'admission-documents' already exists.");
            await adminClient.storage.updateBucket('admission-documents', { public: true });
        } else {
            console.log("Creating bucket 'admission-documents'...");
            const { data, error } = await adminClient.storage.createBucket('admission-documents', {
                public: true,
                fileSizeLimit: 10485760, // 10MB
            });

            if (error) {
                console.error("Error creating bucket:", error);
            } else {
                console.log("Bucket created successfully:", data);
            }
        }
    } catch (e) {
        console.error("Exception:", e);
    } finally {
        process.exit(0);
    }
}

run();
