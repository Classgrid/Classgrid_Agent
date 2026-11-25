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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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

import { S3Client, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const BUCKET_NAME = (
    process.env.AWS_S3_BUCKET
    || process.env.AWS_S3_ERP_BUCKET_NAME
    || "erp-classgrid"
).trim();
// The bucket the AI's own files are written to: the screenshots it takes (services/studio-browser-tools.js saveShot)
// and the files and videos it makes (ai-chat.controller.js upload_file_to_cdn, services/video-render.service.js
// uploadToCdn). Named the way those writers name it, so a delete always goes to the bucket the file was put in.
export const AI_FILES_BUCKET = process.env.AWS_S3_ERP_BUCKET_NAME || "erp-classgrid";
export const S3_REGION = (
    process.env.AWS_S3_REGION
    || process.env.AWS_S3_ERP_REGION
    || "eu-north-1"
).trim();

const configuredCdnBaseUrl = (
    process.env.CDN_BASE_URL
    || process.env.AWS_CLOUDFRONT_ERP_DOMAIN
    || "https://cdn.classgrid.in"
).trim();

export const CDN_BASE_URL = (
    /^https?:\/\//i.test(configuredCdnBaseUrl)
        ? configuredCdnBaseUrl
        : `https://${configuredCdnBaseUrl}`
).replace(/\/+$/, "");

const configuredProtectedPrefixes = (process.env.AWS_S3_PROTECTED_PREFIXES || "")
    .split(",")
    .map((prefix) => prefix.trim().replace(/^\/+/, ""))
    .filter(Boolean);

export const PROTECTED_PREFIXES = Object.freeze([
    ...configuredProtectedPrefixes,
]);

const standardAccessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
const standardSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();
const erpAccessKeyId = process.env.AWS_S3_ERP_ACCESS_KEY?.trim();
const erpSecretAccessKey = process.env.AWS_S3_ERP_SECRET_KEY?.trim();

const credentials = standardAccessKeyId && standardSecretAccessKey
    ? {
        accessKeyId: standardAccessKeyId,
        secretAccessKey: standardSecretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
    }
    : (
        erpAccessKeyId && erpSecretAccessKey
            ? {
                accessKeyId: erpAccessKeyId,
                secretAccessKey: erpSecretAccessKey,
            }
            : undefined
    );

export const s3Client = new S3Client({
    region: S3_REGION,
    ...(credentials ? { credentials } : {}),
});

/**
 * Deletes one object from the bucket by its key (not a link: a link may point anywhere).
 */
export async function deleteFromS3(key, bucket = BUCKET_NAME) {
    if (typeof key !== "string" || !key || key.startsWith("/") || key.includes("..")) throw new Error("deleteFromS3 needs an object key");
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
}

/**
 * Deletes every object whose key starts with `prefix` (a deleted account's own files, "studio-shots/<userId>/"),
 * 1000 at a time, like deletePrefixFromR2. Resolves the number of objects deleted. The prefix must end in "/" (a
 * folder) or "-" (files named "<id>-..."), so a short prefix can never empty the bucket, and a key the list gives
 * that does not start with the prefix is never deleted. Keys the bucket refuses to delete are not counted: once
 * every page is done they are reported as one error, whose `deleted` says how many did go.
 */
export async function deletePrefixFromS3(prefix, bucket = BUCKET_NAME) {
    if (typeof prefix !== "string" || prefix.length < 3 || !/[/-]$/.test(prefix)) throw new Error("deletePrefixFromS3 needs a folder prefix");
    let deleted = 0;
    let refused = 0;
    let why = "";
    let token;
    do {
        const page = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
        const keys = (page.Contents || []).map((o) => ({ Key: o.Key })).filter((o) => o.Key && o.Key.startsWith(prefix));
        if (keys.length) {
            const done = await s3Client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys, Quiet: true } }));
            const errors = done?.Errors || [];
            deleted += keys.length - errors.length;
            refused += errors.length;
            if (errors.length && !why) why = errors[0].Code || errors[0].Message || "refused";
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    if (refused) {
        const error = new Error(`${refused} object(s) under ${prefix} could not be deleted (${why})`);
        error.deleted = deleted;
        throw error;
    }
    return deleted;
}

export default s3Client;
