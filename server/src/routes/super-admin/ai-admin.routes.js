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
import express from "express";
import { getAiUsageStats, resetCredits, toggleBlockAi } from "../../controllers/super-admin/ai-admin.controller.js";
import { requireAuth, requireSuperAdmin } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require Super Admin privileges
router.use(requireAuth);
router.use(requireSuperAdmin);

router.get("/usage", getAiUsageStats);
router.post("/reset-credits", resetCredits);
router.post("/block", toggleBlockAi);

export default router;
