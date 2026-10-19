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
import { getMySchedules, getScheduleById, cancelSchedule, updateSchedule } from '../controllers/ai-schedule.controller.js';

const router = express.Router();

router.get('/', isAuthenticated, getMySchedules);
router.get('/:id', isAuthenticated, getScheduleById);
router.delete('/:id', isAuthenticated, cancelSchedule);
router.put('/:id', isAuthenticated, updateSchedule);

export default router;

