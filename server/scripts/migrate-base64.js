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
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log("MongoDB URI is: ", mongoUri ? "Found" : "Missing");
    await mongoose.connect(mongoUri || 'mongodb://localhost:27017/classgrid');
    console.log('Connected to MongoDB');

    const s3Client = new S3Client({
        region: process.env.AWS_S3_REGION || process.env.AWS_S3_ERP_REGION || 'eu-north-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_S3_ERP_ACCESS_KEY || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_S3_ERP_SECRET_KEY || ''
        }
    });
    
    const BUCKET_NAME = process.env.AWS_S3_BUCKET || process.env.AWS_S3_ERP_BUCKET_NAME || 'erp-classgrid';
    const CDN_BASE_URL = process.env.CDN_BASE_URL || process.env.AWS_CLOUDFRONT_ERP_DOMAIN || 'https://cdn.classgrid.in';

    async function uploadBase64ToS3(base64String, folder, filenamePrefix) {
        if (!base64String || typeof base64String !== 'string' || !base64String.startsWith('data:image')) return base64String;
        try {
            const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) return base64String;
            const contentType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const extension = contentType.split('/')[1] || 'png';
            const key = `${folder}/${filenamePrefix}-${Date.now()}.${extension}`;
            
            const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: buffer, ContentType: contentType });
            await s3Client.send(command);
            return `${CDN_BASE_URL.replace(/\/+$/, '')}/${key}`;
        } catch (err) {
            console.error('Failed to upload', err);
            return base64String;
        }
    }

    const db = mongoose.connection.db;

    // Migrate Users
    const users = await db.collection('users').find({ profilePicture: { $regex: '^data:image' } }).toArray();
    console.log(`Found ${users.length} users with base64 images.`);
    for (const user of users) {
        console.log(`Migrating user ${user.email}...`);
        const url = await uploadBase64ToS3(user.profilePicture, 'profile_pictures', user._id.toString());
        await db.collection('users').updateOne({ _id: user._id }, { $set: { profilePicture: url } });
        console.log(`Updated ${user.email} -> ${url}`);
    }

    // Migrate Organizations
    const orgs = await db.collection('organizations').find({ logo_url: { $regex: '^data:image' } }).toArray();
    console.log(`Found ${orgs.length} orgs with base64 logos.`);
    for (const org of orgs) {
        console.log(`Migrating org ${org.name}...`);
        const url = await uploadBase64ToS3(org.logo_url, 'organization_logos', org._id.toString());
        await db.collection('organizations').updateOne({ _id: org._id }, { $set: { logo_url: url } });
        console.log(`Updated ${org.name} -> ${url}`);
    }

    console.log('Migration complete!');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
