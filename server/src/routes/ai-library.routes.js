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
import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import multer from 'multer';
import { uploadToLibrary, getLibrary, deleteFromLibrary, getQuota } from '../controllers/ai-library.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB per file
const router = express.Router();

router.post('/upload', isAuthenticated, upload.single('file'), uploadToLibrary);
router.get('/', isAuthenticated, getLibrary);
router.delete('/:id', isAuthenticated, deleteFromLibrary);
router.get('/quota', isAuthenticated, getQuota);

export default router;
