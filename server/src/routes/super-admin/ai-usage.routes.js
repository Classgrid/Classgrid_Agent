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
