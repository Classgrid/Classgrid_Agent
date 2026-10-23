/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
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

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import accessLogger from './logger.js';
import { asyncContext } from '../utils/async-context.js';

// Parse AWS S3 ERP environment variables
const region = process.env.AWS_S3_ERP_REGION || 'eu-north-1';
const accessKeyId = process.env.AWS_S3_ERP_ACCESS_KEY;
const secretAccessKey = process.env.AWS_S3_ERP_SECRET_KEY;
const S3_BUCKET_NAME = process.env.AWS_S3_ERP_BUCKET_NAME || 'erp-classgrid';
const S3_PUBLIC_URL = process.env.AWS_CLOUDFRONT_ERP_DOMAIN || 'https://cdn.classgrid.in';

if (!accessKeyId || !secretAccessKey) {
    console.error('⚠️ Missing AWS S3 ERP credentials. S3 uploads will fail.');
}

// Initialize the AWS S3 client for ERP / Branding assets
export const awsS3Client = new S3Client({
    region,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
    },
});

/**
 * Gets a presigned URL allowing the client browser to PUT a file directly to AWS S3.
 * Used for white-labeled branding assets (logos, favicons) served via CloudFront.
 * 
 * @param {string} fileName - The intended filename
 * @param {string} mimeType - The file's MIME type
 * @param {number} expiresInSeconds - Link validity duration
 * @param {string} customPath - Optional custom object Key
 */
export async function getAwsS3PresignedUploadUrl(fileName, mimeType, expiresInSeconds = 3600, customPath = null) {
    let uniqueFilename = customPath;
    if (!uniqueFilename) {
        const ext = path.extname(fileName || '') || '';
        uniqueFilename = `assets/branding/${Date.now()}-${uuidv4()}${ext}`;
    }

    const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: uniqueFilename,
        ContentType: mimeType,
    });

    const url = await getSignedUrl(awsS3Client, command, { expiresIn: expiresInSeconds });
    
    // Track the presigned URL generation (implies upload)
    const context = asyncContext.getStore();
    const userId = context?.userId;
    const orgId = context?.orgId;
    
    accessLogger.info("Presigned URL generated for AWS S3 Upload (Branding/ERP)", {
        action: "file_upload_presigned_aws",
        fileName: fileName,
        mimeType,
        s3Key: uniqueFilename,
        userId: userId,
        organizationId: orgId
    });

    return {
        uploadUrl: url,
        publicUrl: `${S3_PUBLIC_URL}/${uniqueFilename}` // This is the CloudFront URL
    };
}
