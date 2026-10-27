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
import express from "express";
import * as globalController from "../../controllers/super-admin/ai-usage-global.controller.js";
import * as orgController from "../../controllers/super-admin/ai-usage-orgs.controller.js";
import * as userController from "../../controllers/super-admin/ai-usage-users.controller.js";
import * as adminController from "../../controllers/super-admin/ai-credits-admin.controller.js";

const router = express.Router();

/**
 * PHASE 10: Super Admin AI Usage & Credits Routes
 * Mounted at: /api/super-admin/ai-usage
 * These routes are protected by Super Admin middleware.
 */

// 1. Global (Level 0)
router.get("/global/stats", globalController.getGlobalStats);
router.get("/global/models", globalController.getModelBreakdown);

// 2. Organizations (Level 1)
router.get("/orgs", orgController.listOrgsWithAiUsage);
router.get("/orgs/:orgId/detail", orgController.getOrgAiDetail);

// 3. Roles/Users (Level 2 & 3)
router.get("/orgs/:orgId/users", userController.listUsersInOrg);
router.get("/users/:userId/detail", userController.getUserAiDetail);

// 4. Admin Mutations
router.put("/users/:userId/block", adminController.blockAiUser);
router.put("/orgs/:orgId/block", adminController.blockAiOrg);
router.post("/users/:userId/reset", adminController.resetUserUsage);
router.post("/orgs/:orgId/reset", adminController.resetOrgUsage);
router.put("/orgs/:orgId/limits", adminController.updateOrgAiLimits);
router.post("/users/:userId/grant", adminController.grantCredits);
router.post("/users/:userId/credits/:transactionId/remove", adminController.removeGrantedCredits);
router.post("/users/:userId/credits/:transactionId/pause", adminController.pauseGrantedCredits);
router.put("/users/:userId/credits/extend", adminController.extendGrantedCredits);
router.post("/orgs/:orgId/grant", adminController.grantOrgCredits);
router.delete("/users/:userId/data", adminController.deleteUserAiData);

router.get("/global/granted-credits", globalController.listActiveGrantedCredits);

// 5. Security / OTP
router.post("/security-code/request", adminController.requestSecurityCode);
router.post("/security-code/verify", adminController.verifySecurityCode);

export default router;
