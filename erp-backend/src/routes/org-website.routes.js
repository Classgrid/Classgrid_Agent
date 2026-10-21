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

import express from "express";
import {
  resolveTenantBySlug,
  getMyWebsiteContent,
  setupWebsiteContent,
  updateWebsiteContent,
  togglePublish,
  addNotice,
  deleteNotice,
  addGalleryImage,
  addGalleryVideo,
  listAllWebsites,
} from "../controllers/org-website.controller.js";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";

const protect       = isAuthenticated;
const requireOrgAdmin   = requireRole("org_admin");
const requireSuperAdmin = requireRole("super_admin");


const router = express.Router();

// ─── PUBLIC (no auth) ────────────────────────────────────────────────────────
// Called by Next.js marketing site tenant resolver
// GET /api/public/tenant/resolve?slug=riverview-jc
router.get("/resolve", resolveTenantBySlug);

export const publicTenantRouter = router;

// ─── ORG ADMIN (auth required) ───────────────────────────────────────────────
const orgRouter = express.Router();
orgRouter.use(protect);
orgRouter.use(requireOrgAdmin);

// Website setup & content management
orgRouter.get("/my-content",            getMyWebsiteContent);    // GET  /api/org-website/my-content
orgRouter.post("/setup",                setupWebsiteContent);    // POST /api/org-website/setup
orgRouter.patch("/update",              updateWebsiteContent);   // PATCH /api/org-website/update
orgRouter.patch("/publish",             togglePublish);          // PATCH /api/org-website/publish

// Notices
orgRouter.post("/notices",              addNotice);              // POST  /api/org-website/notices
orgRouter.delete("/notices/:noticeId",  deleteNotice);           // DELETE /api/org-website/notices/:id

// Gallery
orgRouter.post("/gallery",              addGalleryImage);        // POST /api/org-website/gallery
orgRouter.post("/gallery/video",        addGalleryVideo);        // POST /api/org-website/gallery/video

export const orgWebsiteRouter = orgRouter;

// ─── SUPER ADMIN ─────────────────────────────────────────────────────────────
const superRouter = express.Router();
superRouter.use(protect);
superRouter.use(requireSuperAdmin);

superRouter.get("/org-websites", listAllWebsites);               // GET /api/super-admin/org-websites

export const superAdminWebsiteRouter = superRouter;
