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
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import { validateHierarchyRequest, enforcePlanBoundary } from "../middleware/hierarchy-validator.middleware.js";
import {
    createNode,
    getTree,
    getChildren,
    updateNode,
    deleteNode,
    getOrgTerminology,
    getAllTerminology,
    getOrgRoles,
    seedHierarchy,
} from "../controllers/hierarchy.controller.js";

const router = express.Router();

// GET /api/hierarchy/terminology/all — Public endpoint for org type terminology & plan metadata
router.get("/terminology/all", getAllTerminology);

// All other routes require authentication
router.use(isAuthenticated);
router.use(attachInstitutionProfile());

// ============================================
// 📐 Academic Hierarchy CRUD
// ============================================

// GET /api/hierarchy/tree — Full hierarchy tree (nested or flat)
router.get("/tree", getTree);

// GET /api/hierarchy/terminology — Get org-specific labels
router.get("/terminology", getOrgTerminology);

// GET /api/hierarchy/roles — Get allowed roles based on org type
router.get("/roles", getOrgRoles);

// GET /api/hierarchy/children/:parentId — Direct children of a node
router.get("/children/:parentId", getChildren);

// POST /api/hierarchy/node — Create a new hierarchy node
// Validated by hierarchy-validator middleware (blocks invalid level_types per org plan)
router.post("/node", validateHierarchyRequest, createNode);

// POST /api/hierarchy/seed — Seed default structure (one-time during onboarding)
router.post("/seed", seedHierarchy);

// PATCH /api/hierarchy/node/:nodeId — Update a node
router.patch("/node/:nodeId", updateNode);

// DELETE /api/hierarchy/node/:nodeId — Soft-delete a node + descendants
router.delete("/node/:nodeId", deleteNode);

export default router;
