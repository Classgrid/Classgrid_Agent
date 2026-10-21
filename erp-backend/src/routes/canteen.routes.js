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
    createItem,
    getMenu,
    toggleAvailability,
    getDailySpecials,
    updateItem,
    deleteItem,
    bulkImportMenu,
    resetDailyStock,
    createRazorpayOrder,
    verifyPayment,
    getStudentHistory,
    rateOrderItems,
    getLiveQueue,
    updateOrderStatus,
    getCanteenAnalytics
} from "../controllers/canteen.controller.js";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// 🍔 MENU MANAGEMENT
router.get("/menu", isAuthenticated, getMenu);
router.get("/menu/specials", isAuthenticated, getDailySpecials);
router.post("/menu", isAuthenticated, requireRole("org_admin", "canteen_manager"), createItem);
router.put("/menu/:id", isAuthenticated, requireRole("org_admin", "canteen_manager"), updateItem);
router.delete("/menu/:id", isAuthenticated, requireRole("org_admin", "canteen_manager"), deleteItem);
router.put("/menu/:id/toggle-availability", isAuthenticated, requireRole("org_admin", "canteen_manager"), toggleAvailability);
router.post("/menu/bulk-import", isAuthenticated, requireRole("org_admin", "canteen_manager"), bulkImportMenu);
router.post("/menu/reset-stock", isAuthenticated, requireRole("org_admin", "canteen_manager"), resetDailyStock);

// 💳 ORDER & CHECKOUT
router.post("/order/create-razorpay-order", isAuthenticated, createRazorpayOrder);
router.post("/order/verify-payment", isAuthenticated, verifyPayment);

// 👩‍🎓 STUDENT API
router.get("/order/history/student", isAuthenticated, getStudentHistory);
router.post("/order/:id/rate", isAuthenticated, rateOrderItems);

// 🍳 KITCHEN DISPLAY / STAFF API
router.get("/order/queue/live", isAuthenticated, requireRole("org_admin", "canteen_manager", "kitchen_staff"), getLiveQueue);
router.patch("/order/:id/status", isAuthenticated, requireRole("org_admin", "canteen_manager", "kitchen_staff"), updateOrderStatus);

// 📊 ANALYTICS
router.get("/analytics", isAuthenticated, requireRole("org_admin", "canteen_manager"), getCanteenAnalytics);

export default router;
