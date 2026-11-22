// Google Play purchases from the Android app. Mounted at /api/billing/google-play (api/index.js).
// A payment receipt: never behind a feature flag (services/feature-flag.service.js), so a paid purchase is always given.
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { generalLimiter } from "../middleware/rateLimiter.js";
import { verifyGooglePlayPurchase } from "../controllers/google-play.controller.js";

const router = express.Router();

router.post("/verify", generalLimiter, isAuthenticated, verifyGooglePlayPurchase);

export default router;
