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

import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { upload, singleUpload } from '../middleware/upload.middleware.js';
import { uploadBufferToR2, getPresignedUploadUrl } from '../config/r2Client.js';

const router = express.Router();

/**
 * @route   POST /api/upload/image
 * @desc    Uploads a single image to Cloudflare R2 and returns the public URL
 * @access  Private (Authenticated users only)
 */
router.post('/image', isAuthenticated, singleUpload('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        // Validate basic image types (optional but good for security)
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ message: 'Invalid file type' });
        }

        // Upload buffer directly to R2
        const publicUrl = await uploadBufferToR2(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        res.json({
            message: 'Upload successful',
            url: publicUrl
        });
    } catch (err) {
        console.error('[Upload Image Error]:', err);
        res.status(500).json({ message: 'Failed to upload image' });
    }
});

/**
 * @route   POST /api/upload/presigned-url
 * @desc    Generates a presigned URL for direct client-to-R2 uploads
 * @access  Private
 */
router.post('/presigned-url', isAuthenticated, async (req, res) => {
    try {
        const { fileName, mimeType } = req.body;

        if (!fileName || !mimeType) {
            return res.status(400).json({ message: 'fileName and mimeType are required' });
        }

        // Get upload URL (valid for 1 hour)
        const urls = await getPresignedUploadUrl(fileName, mimeType);

        res.json({
            message: 'Presigned URL generated',
            uploadUrl: urls.uploadUrl,
            publicUrl: urls.publicUrl
        });
    } catch (err) {
        console.error('[Presigned URL Error]:', err);
        res.status(500).json({ message: 'Failed to generate presigned URL' });
    }
});

export default router;
