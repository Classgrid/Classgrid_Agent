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
import multer from 'multer';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import NotePackage from '../models/NotePackage.js';
import { studentNotesClient } from '../config/supabaseClient.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";


const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB for PDFs
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * POST /api/marketplace/upload
 * Seller uploads a note package
 */
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        const { title, description, subject, branch, price } = req.body;
        const file = req.file;
        const userId = req.user._id;
        const orgId = req.user.organization_id;

        if (!file) return res.status(400).json({ error: "PDF file is required" });

        // 1. Upload to S3
        const storagePath = `marketplace/notes/${userId}/${Date.now()}_${file.originalname}`;
        const publicUrl = await uploadBufferToR2(file.buffer, file.buffer.originalname || 'upload.file', file.buffer.mimetype || 'application/octet-stream', storagePath);

        /* Error handled inside R2 */

        // 2. Create Note Entry
        const newNote = new NotePackage({
            sellerId: userId,
            orgId: orgId,
            title,
            description,
            subject,
            branch,
            price: parseFloat(price) || 0,
            fileUrl: storagePath,
            isApproved: true // Auto-approved for now in Dev
        });

        await newNote.save();
        res.status(201).json({ success: true, note: newNote });

    } catch (err) {
        console.error("[Marketplace upload] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/marketplace/list
 * Fetch all available notes in the organization
 */
router.get('/list', isAuthenticated, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const notes = await NotePackage.find({ orgId, isApproved: true })
            .populate('sellerId', 'name profilePicture')
            .sort({ createdAt: -1 });
        
        res.json({ notes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/marketplace/buy/:id
 * Generate Razorpay order for a note
 */
router.post('/buy/:id', isAuthenticated, async (req, res) => {
    try {
        const note = await NotePackage.findById(req.params.id);
        if (!note) return res.status(404).json({ error: "Note not found" });

        if (note.price === 0) {
            return res.json({ free: true, url: note.fileUrl });
        }

        const options = {
            amount: note.price * 100, // in paisa
            currency: "INR",
            receipt: `note_${note._id}_${Date.now()}`,
            notes: {
                type: "marketplace_order",
                noteId: note._id.toString(),
                buyerId: req.user._id.toString()
            }
        };

        const order = await razorpay.orders.create(options);
        res.json({ order, key_id: process.env.RAZORPAY_KEY_ID });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
