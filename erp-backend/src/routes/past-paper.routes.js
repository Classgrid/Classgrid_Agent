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
import {
    ingestPastPaper,
    analyzeMultiYear,
    generateMockFromPastPapers,
    listPastPapers
} from '../services/ai/past-paper-analysis.service.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per paper image
});

/**
 * POST /api/past-papers/ingest
 * Upload a question paper image → OCR → Extract → Store → Auto-classify
 */
router.post('/ingest', upload.single('file'), async (req, res) => {
    try {
        const { title, subject, year, month, semester, branch, university, examType } = req.body;
        const classroomId = req.body.classroomId;
        const organizationId = req.body.organizationId;
        const uploadedBy = req.body.userId;

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        if (!title || !subject || !year) {
            return res.status(400).json({ error: 'title, subject, and year are required' });
        }

        const paper = await ingestPastPaper({
            imageBuffer: req.file.buffer,
            mimeType: req.file.mimetype,
            title,
            subject,
            year: parseInt(year),
            month,
            semester: semester ? parseInt(semester) : null,
            branch,
            university,
            examType,
            classroomId,
            organizationId,
            uploadedBy,
            fileUrl: '', // Can be set after Supabase upload
        });

        res.json({
            success: true,
            paperId: paper._id,
            questionsExtracted: paper.totalQuestions,
            status: paper.status,
            message: `Extracted ${paper.totalQuestions} questions. AI topic classification running in background.`,
        });
    } catch (error) {
        console.error('[PastPaper] Ingest error:', error);
        res.status(500).json({ error: 'Failed to process paper', details: error.message });
    }
});

/**
 * GET /api/past-papers/analyze
 * Multi-year analysis — repeated questions + topic frequency
 * 
 * Query params: subject, yearWindow (2|3|4|5|7|10), classroomId, organizationId
 */
router.get('/analyze', async (req, res) => {
    try {
        const { subject, yearWindow, classroomId, organizationId } = req.query;

        if (!subject) return res.status(400).json({ error: 'subject is required' });

        const validWindows = [2, 3, 4, 5, 7, 10];
        const window = parseInt(yearWindow) || 5;
        if (!validWindows.includes(window)) {
            return res.status(400).json({ error: `yearWindow must be one of: ${validWindows.join(', ')}` });
        }

        const analysis = await analyzeMultiYear({
            classroomId,
            organizationId,
            subject,
            yearWindow: window,
        });

        res.json(analysis);
    } catch (error) {
        console.error('[PastPaper] Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed', details: error.message });
    }
});

/**
 * GET /api/past-papers/mock-test
 * Generate an AI mock test from repeated + important questions
 * 
 * Query params: subject, yearWindow, questionCount, classroomId, organizationId
 */
router.get('/mock-test', async (req, res) => {
    try {
        const { subject, yearWindow, questionCount, classroomId, organizationId } = req.query;

        if (!subject) return res.status(400).json({ error: 'subject is required' });

        const mock = await generateMockFromPastPapers({
            classroomId,
            organizationId,
            subject,
            yearWindow: parseInt(yearWindow) || 5,
            questionCount: parseInt(questionCount) || 20,
        });

        if (mock.error) return res.status(404).json(mock);
        res.json(mock);
    } catch (error) {
        console.error('[PastPaper] Mock test error:', error);
        res.status(500).json({ error: 'Mock test generation failed', details: error.message });
    }
});

/**
 * GET /api/past-papers/list
 * List all uploaded papers for a classroom/org
 * 
 * Query params: classroomId, organizationId, subject (optional)
 */
router.get('/list', async (req, res) => {
    try {
        const { classroomId, organizationId, subject } = req.query;
        const papers = await listPastPapers({ classroomId, organizationId, subject });
        res.json({ papers, total: papers.length });
    } catch (error) {
        console.error('[PastPaper] List error:', error);
        res.status(500).json({ error: 'Failed to list papers' });
    }
});

export default router;
