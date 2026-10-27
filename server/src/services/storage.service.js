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

import { primarySupabaseClient } from "../config/supabaseClient.js";
import { v4 as uuidv4 } from "uuid";
import accessLogger from "../config/logger.js";

/**
 * StorageService — Wrapper for Supabase Storage operations.
 * Handles secure student document uploads for the Admission Engine.
 */
class StorageService {
    constructor() {
        this.bucket = "admission-documents";
    }

    /**
     * Upload a file to Cloudflare R2
     * @param {Buffer} fileBuffer - The file content
     * @param {string} fileName - Original file name
     * @param {string} mimeType - File MIME type
     * @param {string} folderPath - Path within bucket (e.g. "org_id/app_id")
     * @returns {Promise<Object>} { url, path, fullPath }
     */
    async uploadDocument(fileBuffer, fileName, mimeType, folderPath, targetBucket = null) {
        try {
            const { uploadBufferToR2 } = await import("../config/r2Client.js");
            const fileExt = fileName.split('.').pop() || '';
            const uniqueFileName = `${uuidv4()}.${fileExt}`;
            const filePath = `${folderPath}/${uniqueFileName}`;
            const bucketToUse = targetBucket || this.bucket; // R2 ignores targetBucket if we just use our default, but let's keep the signature.

            const publicUrl = await uploadBufferToR2(fileBuffer, fileName, mimeType, filePath);

            return {
                id: uuidv4(),
                name: fileName,
                mimeType: mimeType,
                size: fileBuffer ? fileBuffer.length : 0,
                path: filePath,
                fullPath: `${bucketToUse}/${filePath}`,
                storage_path: publicUrl, // We return the R2 public URL directly!
                uploadedAt: new Date()
            };
        } catch (error) {
            accessLogger.error(`StorageService.uploadDocument Error: ${error.message}`, { provider: 'storage', fileName });
            throw new Error(`Failed to upload document: ${error.message}`);
        }
    }

    /**
     * Generate a temporary signed URL for viewing private documents
     * Backward compatible: New R2 files have full URLs, old Supabase files have relative paths.
     * @param {string} path - Path within the bucket or full URL
     * @param {number} expiresIn - Expiry in seconds (default 1 hour)
     */
    async getSignedUrl(path, expiresIn = 3600) {
        try {
            // If it's already a full HTTP url (New R2 format), return it directly.
            if (path && path.startsWith('http')) return path;
            
            // If it's a relative path, it's an OLD file still living in Supabase!
            // We must generate a Supabase signed URL so old files don't break.
            const { data, error } = await primarySupabaseClient.storage
                .from(this.bucket)
                .createSignedUrl(path, expiresIn);

            if (error) throw error;
            return data.signedUrl;
        } catch (error) {
            accessLogger.error(`StorageService.getSignedUrl Error: ${error.message}`, { provider: 'storage', path });
            return null;
        }
    }

    /**
     * Delete a file from storage
     * @param {string} path 
     */
    async deleteDocument(path) {
        try {
            const { deleteFromR2 } = await import("../config/r2Client.js");
            await deleteFromR2(path);
            accessLogger.info(`Deleted document from storage`, { provider: 'storage', path });
            return true;
        } catch (error) {
            accessLogger.error(`StorageService.deleteDocument Error: ${error.message}`, { provider: 'storage', path });
            return false;
        }
    }
}

export default new StorageService();
