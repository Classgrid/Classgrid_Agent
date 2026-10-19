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
import passport from "passport";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import {
    loginLimiter,
    emailCheckLimiter,
    resetPasswordLimiter,
    otpSendLimiter
} from "../middleware/rateLimiter.js";
import {
    createOAuthState,
    oauthStateCookieOptions,
    OAUTH_STATE_COOKIE,
    verifyOAuthState,
} from "../services/oauth-state.service.js";

const router = express.Router();

const rescueCallback = (req, provider) => req.viaRescue
    ? { callbackURL: `https://${req.get("host")}/api/rescue/api/auth/${provider}/callback` }
    : {};

const githubStrategy = (req) => req.viaRescue && passport._strategy("github-chat-rescue") ? "github-chat-rescue" : "github-chat";

const getFrontendUrl = () => {
    return process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");
};

// Public System Config
router.get("/system-config", authController.getSystemConfig);

// Email-first login flow (secure check)
router.post("/check-email", emailCheckLimiter, authController.checkEmailForLogin);

// Manual Auth
router.post("/signup-init", authController.initiateSignup);
router.get("/verify-token/:token", authController.verifySignupToken);
router.post("/signup-complete", authController.completeSignup);
router.post("/check-admin-status", authController.checkAdminStatus);
router.post("/validate-activation-token", authController.validateActivationToken);
router.post("/activate-admin", authController.activateAdmin);
router.post("/finalize-onboarding", authController.finalizeOnboarding);
router.post("/resend-activation", authController.resendActivation);
router.post("/manual-activation-link", authController.resolveManualActivationLink);

router.post("/login", loginLimiter, authController.login);
router.post("/request-login-otp", loginLimiter, authController.requestLoginOtp);
router.post("/resend-device-otp", otpSendLimiter, authController.resendDeviceOtp);
router.post("/verify-device", authController.verifyDeviceOtp);

router.post("/onboarding-send-otp", otpSendLimiter, authController.sendOnboardingOtp);
router.post("/onboarding-verify-otp", authController.verifyOnboardingOtp);
router.post("/check-username", authController.checkUsername);

router.post("/setup-org-admin", authController.setupOrgAdmin); // kept for backward compat
router.post("/logout", authController.logout);

// --- Chat Agent Real Auth Flow ---
router.post("/chat/send-email-otp", authController.chatSendEmailOtp);
router.post("/chat/verify-email-otp", authController.chatVerifyEmailOtp);
router.post("/chat/save-password", authController.chatSavePassword);
router.post("/chat/send-whatsapp-otp", authController.chatSendWhatsappOtp);
router.post("/chat/verify-whatsapp-otp-step", authController.chatVerifyWhatsappOtpStep);
router.post("/chat/finalize-onboarding", authController.chatFinalizeOnboarding);

// Chat Agent Google OAuth
router.get(
    "/chat/google",
    async (req, res, next) => {
        const loginTab = req.query.loginTab || req.query.role || 'student';
        const host = req.query.host || '';
        try {
            const { state, nonce } = await createOAuthState({ loginTab, host, intent: req.query.intent, next: req.query.next });
            res.cookie(OAUTH_STATE_COOKIE, nonce, oauthStateCookieOptions());
            passport.authenticate("google-chat", {
                ...rescueCallback(req, "google"),
                scope: ["profile", "email"],
                state,
                prompt: 'select_account consent'
            })(req, res, next);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Invalid login portal." });
        }
    }
);
router.get(
    "/chat/google/callback",
    async (req, res, next) => {
        const stateRaw = req.query.state || null;
        const defaultFrontendUrl = process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");
        let oauthState;
        try {
            oauthState = await verifyOAuthState(stateRaw, req.cookies?.[OAUTH_STATE_COOKIE]);
        } catch (error) {
            res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions({ clear: true }));
            return res.redirect(`${defaultFrontendUrl}/login?error=invalid_oauth_state`);
        }
        res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions({ clear: true }));
        req.oauthState = oauthState;

        const { host, loginTab } = oauthState;
        const scheme = process.env.NODE_ENV === "production" ? "https://" : "http://";
        const TARGET_URL = host ? `${scheme}${host}` : defaultFrontendUrl;

        req.oauthProvider = "google"; // for the "Last used" login method
        passport.authenticate("google-chat", { session: false, ...rescueCallback(req, "google") }, (err, user) => {
            if (err) {
                if (err.code === "NO_ACCOUNT") {
                    return res.redirect(`${TARGET_URL}/login?error=no_account&email=${encodeURIComponent(err.email || "")}`);
                }
                console.error("Google Chat OAuth Error Trace:", err.stack || err);
                return res.redirect(`${TARGET_URL}/login?error=google_blocked&message=${encodeURIComponent(err.message)}`);
            }
            if (!user) {
                return res.redirect(`${TARGET_URL}/login?error=AuthFailed`);
            }
            req.user = user;
            return authController.oauthCallback(req, res);
        })(req, res, next);
    }
);

// Chat Agent GitHub OAuth
router.get(
    "/chat/github",
    async (req, res, next) => {
        const loginTab = req.query.loginTab || req.query.role || 'student';
        const host = req.query.host || '';
        try {
            const { state, nonce } = await createOAuthState({ loginTab, host, intent: req.query.intent, next: req.query.next });
            res.cookie(OAUTH_STATE_COOKIE, nonce, oauthStateCookieOptions());
            passport.authenticate(githubStrategy(req), {
                ...rescueCallback(req, "github"),
                scope: ["user:email"],
                state,
            })(req, res, next);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Invalid login portal." });
        }
    }
);
router.get(
    "/github/callback",
    async (req, res, next) => {
        const stateRaw = req.query.state || null;
        
        // Detect if this is a GitHub Integration request (which has base64 JSON state)
        if (stateRaw) {
            try {
                const decoded = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf8'));
                if (decoded && decoded.userId) {
                    // It's an integration request! Pass to auth.github.routes.js
                    return next();
                }
            } catch (e) {
                // Not base64 JSON. Proceed as Login.
            }
        }
        
        const defaultFrontendUrl = process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");
        let oauthState;
        try {
            oauthState = await verifyOAuthState(stateRaw, req.cookies?.[OAUTH_STATE_COOKIE]);
        } catch (error) {
            res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions({ clear: true }));
            return res.redirect(`${defaultFrontendUrl}/login?error=invalid_oauth_state`);
        }
        res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions({ clear: true }));
        req.oauthState = oauthState;

        const { host, loginTab } = oauthState;
        const scheme = process.env.NODE_ENV === "production" ? "https://" : "http://";
        const TARGET_URL = host ? `${scheme}${host}` : defaultFrontendUrl;

        req.oauthProvider = "github"; // for the "Last used" login method
        passport.authenticate(githubStrategy(req), { session: false, ...rescueCallback(req, "github") }, (err, user) => {
            if (err) {
                if (err.code === "NO_ACCOUNT") {
                    return res.redirect(`${TARGET_URL}/login?error=no_account&email=${encodeURIComponent(err.email || "")}`);
                }
                console.error("GitHub Chat OAuth Error Trace:", err.stack || err);
                return res.redirect(`${TARGET_URL}/login?error=google_blocked&message=${encodeURIComponent(err.message)}`);
            }
            if (!user) {
                return res.redirect(`${TARGET_URL}/login?error=AuthFailed`);
            }
            req.user = user;
            return authController.oauthCallback(req, res);
        })(req, res, next);
    }
);


    // Fake endpoints removed

router.get("/me", isAuthenticated, authController.getCurrentUser);

router.post("/forgot-password", resetPasswordLimiter, authController.forgotPassword);
router.get("/verify-reset-token/:token", authController.verifyResetToken);
router.post("/reset-password", resetPasswordLimiter, authController.resetPassword);
router.post("/faculty-activate", resetPasswordLimiter, authController.facultyActivate);
router.post("/force-reset-password", isAuthenticated, authController.forceResetPassword);
router.post("/change-password", isAuthenticated, authController.changePassword);
router.post("/delete-account", isAuthenticated, authController.deleteAccount);

// Google OAuth
router.get(
    "/google",
    async (req, res, next) => {
        const loginTab = req.query.loginTab || req.query.role || 'student';
        const host = req.query.host || '';
        try {
            const { state, nonce } = await createOAuthState({ loginTab, host, intent: req.query.intent, next: req.query.next });
            res.cookie(OAUTH_STATE_COOKIE, nonce, oauthStateCookieOptions());
            passport.authenticate("google", {
                ...rescueCallback(req, "google"),
                scope: ["profile", "email"],
                state,
                prompt: 'select_account consent'
            })(req, res, next);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Invalid login portal." });
        }
    }
);
router.get(
    "/google/callback",
    async (req, res, next) => {
        const stateRaw = req.query.state || null;
        const defaultFrontendUrl = process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");
        let oauthState;
        try {
            oauthState = await verifyOAuthState(stateRaw, req.cookies?.[OAUTH_STATE_COOKIE]);
        } catch (error) {
            res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions({ clear: true }));
            return res.redirect(`${defaultFrontendUrl}/login?error=invalid_oauth_state`);
        }
        res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions({ clear: true }));
        req.oauthState = oauthState;

        const { host, loginTab } = oauthState;
        const scheme = process.env.NODE_ENV === "production" ? "https://" : "http://";
        const TARGET_URL = host ? `${scheme}${host}` : defaultFrontendUrl;
        const errorPath = loginTab === 'super_admin' ? '/superadmin/login' : '/login';

        const strategy = (host && host.startsWith('chat.')) ? "google-chat" : "google";
        req.oauthProvider = "google"; // for the "Last used" login method
        passport.authenticate(strategy, { session: false, ...rescueCallback(req, "google") }, (err, user) => {
            if (err) {
                // Sign-in screen + no account (chat): back to the login page with the same red error as the email check
                if (err.code === "NO_ACCOUNT") {
                    return res.redirect(`${TARGET_URL}${errorPath}?error=no_account&email=${encodeURIComponent(err.email || "")}`);
                }
                console.error(`Google OAuth Error Trace (${strategy}):`, err.stack || err);
                return res.redirect(`${TARGET_URL}${errorPath}?error=google_blocked&message=${encodeURIComponent(err.message)}`);
            }
            if (!user) {
                return res.redirect(`${TARGET_URL}${errorPath}?error=AuthFailed`);
            }
            req.user = user;
            return authController.oauthCallback(req, res);
        })(req, res, next);
    }
);

export default router;
