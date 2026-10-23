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

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import accessLogger from './logger.js';
import { asyncContext } from '../utils/async-context.js';

// Parse environment variables
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'classgrid-storage';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-96a564393c0440f2bab37ad8bbe92398.r2.dev';

if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error('⚠️ Missing Cloudflare R2 credentials. R2 uploads will fail.');
}

// Initialize the AWS S3 client specifically pointing to Cloudflare R2
export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
    },
});

/**
 * Uploads a Multer buffer to Cloudflare R2
 * @param {Buffer} buffer - The file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type (e.g., 'image/jpeg')
 * @param {string} customPath - Optional custom object Key (e.g., 'banners/123.png')
 * @returns {Promise<string>} The public URL of the uploaded file
 */
export async function uploadBufferToR2(buffer, originalName, mimeType, customPath = null) {
    let uniqueFilename = customPath;
    if (!uniqueFilename) {
        // Generate a unique filename: timestamp-uuid.ext
        const ext = path.extname(originalName || '') || '';
        uniqueFilename = `assets/${Date.now()}-${uuidv4()}${ext}`;
    }

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: mimeType,
    });

    await r2Client.send(command);

    // Track the upload audit log
    const context = asyncContext.getStore();
    const userId = context?.userId;
    const orgId = context?.orgId;
    
    accessLogger.info("File uploaded to R2/S3 (Buffer)", {
        action: "file_upload",
        fileName: originalName,
        mimeType,
        sizeBytes: buffer ? buffer.length : 0,
        s3Key: uniqueFilename,
        userId: userId,
        organizationId: orgId
    });

    // Return the public URL for DB storage
    return `${R2_PUBLIC_URL}/${uniqueFilename}`;
}

export async function uploadPrivateBufferToR2(buffer, objectKey, mimeType) {
    if (!objectKey || objectKey.startsWith("/") || objectKey.includes("..")) {
        throw new Error("A safe private R2 object key is required");
    }
    await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
    }));
    return objectKey;
}

export async function getPrivateDownloadUrl(objectKey, expiresInSeconds = 300) {
    if (!objectKey || objectKey.startsWith("/") || objectKey.includes("..")) {
        throw new Error("A safe private R2 object key is required");
    }
    const expiresIn = Math.min(Math.max(Number(expiresInSeconds) || 300, 60), 900);
    return getSignedUrl(
        r2Client,
        new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: objectKey }),
        { expiresIn },
    );
}

/**
 * Deletes a file from Cloudflare R2 using its URL or Key
 * @param {string} fileIdentifier - The public URL or the object Key
 */
export async function deleteFromR2(fileIdentifier) {
    let key = fileIdentifier;
    
    // If a full URL is passed, extract just the key (the path after the domain)
    if (fileIdentifier.startsWith('http')) {
        const urlObj = new URL(fileIdentifier);
        key = urlObj.pathname.replace(/^\/+/, ''); // Remove leading slash
    }

    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });

    await r2Client.send(command);
    return true;
}

/**
 * Gets a presigned URL allowing the client browser to PUT a file directly
 * @param {string} fileName - The intended filename
 * @param {string} mimeType - The file's MIME type
 * @param {number} expiresInSeconds - Link validity duration
 * @param {string} customPath - Optional custom object Key
 */
export async function getPresignedUploadUrl(fileName, mimeType, expiresInSeconds = 3600, customPath = null) {
    let uniqueFilename = customPath;
    if (!uniqueFilename) {
        const ext = path.extname(fileName || '') || '';
        uniqueFilename = `assets/${Date.now()}-${uuidv4()}${ext}`;
    }

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: uniqueFilename,
        ContentType: mimeType,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
    
    // Track the presigned URL generation (implies upload)
    const context = asyncContext.getStore();
    const userId = context?.userId;
    const orgId = context?.orgId;
    
    accessLogger.info("Presigned URL generated for R2/S3 Upload", {
        action: "file_upload_presigned",
        fileName: fileName,
        mimeType,
        s3Key: uniqueFilename,
        userId: userId,
        organizationId: orgId
    });

    return {
        uploadUrl: url,
        publicUrl: `${R2_PUBLIC_URL}/${uniqueFilename}` // This is what the frontend will save after success
    };
}
