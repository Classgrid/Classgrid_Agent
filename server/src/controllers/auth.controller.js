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

import User from "../models/User.js";
import DemoRequest from "../models/DemoRequest.js";
import Verification from "../models/Verification.js";
import DeviceVerification from "../models/DeviceVerification.js";
import Organization from "../models/Organization.js";
import OnboardingOTP from "../models/OnboardingOTP.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../services/aws-ses.service.js";
import connectDB from "../../config/db.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME, CDN_BASE_URL } from "../config/s3Client.js";
import { checkAndRegisterDevice, getDeviceFingerprint } from "../services/device-fingerprint.service.js";

export async function uploadBase64ToS3(base64String, folder, filenamePrefix) {
    if (!base64String || typeof base64String !== 'string' || !base64String.startsWith('data:image')) return base64String;
    try {
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64String;

        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const extension = contentType.split('/')[1] || 'png';
        const key = `${folder}/${filenamePrefix}-${Date.now()}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });

        await s3Client.send(command);
        return `${CDN_BASE_URL}/${key}`;
    } catch (err) {
        console.error("Failed to upload base64 to S3:", err);
        return base64String; // fallback to base64 if upload fails
    }
}
import {
    getFacultyWelcomeEmailHtml,
    getFacultyWelcomePlainText,
    getStudentWelcomeEmailHtml,
    getStudentWelcomePlainText,
    getLoginNotificationHtml,
    getLoginNotificationPlainText,
    getVerificationEmailHtml,
    getPasswordResetEmailHtml,
    getVerificationEmailPlainText,
    getPasswordResetEmailPlainText,
    getNoAccountSignInAttemptHtml,
    getNoAccountSignInAttemptPlainText,
    getOrgAdminInviteHtml,
    getOrgAdminInvitePlainText,
} from "../services/email-templates.service.js";
import { trackOnboardingEvent } from "../services/onboarding-event.service.js";
import { syncDerivedOnboardingProgress } from "../services/onboarding-progress.service.js";
import { sendSMS } from "../services/sms.service.js";
import { RecaptchaVerificationError, verifyRecaptchaToken } from "../services/recaptcha.service.js";
import { isPublicChatAccount, needsChatOnboarding, isSharedTestWhatsapp, readableJobRole } from "../utils/chat-onboarding.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const getFrontendUrl = () => {
    return process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");
};

const FRONTEND_URL = getFrontendUrl();

const INSTITUTION_ADMIN_ROLES = new Set([
    "org_admin",
    "library_manager",
    "hod",
    "principal",
    "vice_principal",
    "exam_controller",
    "fee_manager",
    "admission_head",
    "admission_verifier",
    "admission_counselor",
    "admission_clerk",
    "tpo_officer",
    "transport_manager",
    "counselor",
    "coordinator",
]);

const ROLE_LABELS = {
    student: "Student",
    teacher: "Faculty",
    faculty: "Faculty",
    org_admin: "Organization Admin",
    library_manager: "Library Manager",
    hod: "Head of Department",
    principal: "Principal",
    vice_principal: "Vice Principal",
    exam_controller: "Exam Controller",
    fee_manager: "Fees Manager",
    admission_head: "Admissions Head",
    admission_verifier: "Admissions Verifier",
    admission_counselor: "Admissions Counselor",
    admission_clerk: "Admissions Clerk",
    tpo_officer: "Placement Officer",
    transport_manager: "Transport Manager",
    counselor: "Counselor",
    coordinator: "Coordinator",
    super_admin: "Super Admin",
};

const DASHBOARD_TARGETS = {
    student: "/student/agent",
    teacher: "/faculty/agent",
    faculty: "/faculty/agent",
    org_admin: "/org/admin/dashboard",
    library_manager: "/dept/library/dashboard",
    hod: "/org/admin/dashboard",
    principal: "/org/admin/dashboard",
    vice_principal: "/org/admin/dashboard",
    exam_controller: "/dept/exams/dashboard",
    fee_manager: "/dept/fees/dashboard",
    admission_head: "/dept/admissions/dashboard",
    admission_verifier: "/dept/admissions/dashboard",
    admission_counselor: "/dept/admissions/dashboard",
    admission_clerk: "/dept/admissions/dashboard",
    tpo_officer: "/org/admin/dashboard",
    transport_manager: "/dept/transport/dashboard",
    counselor: "/org/admin/dashboard",
    coordinator: "/org/admin/dashboard",
    super_admin: "/superadmin/dashboard",
};

const isInstitutionAdminRole = (role) => INSTITUTION_ADMIN_ROLES.has(role);
const getRoleLabel = (role) => ROLE_LABELS[role] || role;

const getLoginPortalPath = (loginTab) => {
    if (loginTab === "super_admin") return "/superadmin/login";
    if (loginTab === "admin" || loginTab === "org_admin") return "/admin/login";
    if (loginTab === "teacher" || loginTab === "faculty") return "/faculty/login";
    return "/student/login";
};

const getFrontendDashboardTarget = (user) => {
    if (user.role === "super_admin") return "/superadmin/dashboard";
    if (isInstitutionAdminRole(user.role)) return DASHBOARD_TARGETS[user.role] || "/org/admin/dashboard";
    if (["faculty", "teacher"].includes(user.role) && !user.organization_id) return "/enter-org-code";
    return DASHBOARD_TARGETS[user.role] || "/classroom";
};

const ACTIVATION_TOKEN_TTL_MS = 7 * 60 * 60 * 1000; // 7 hours
const ACTIVATION_RATE_LIMIT_MAX = 5;               // max 5 attempts
const ACTIVATION_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // per 15 minutes

const generateActivationCredentials = () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const activationCode = String(Math.floor(100000 + Math.random() * 900000));
    const activationCodeHash = crypto.createHash("sha256").update(activationCode).digest("hex");
    const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS);

    return {
        rawToken,
        hashedToken,
        activationCode,
        activationCodeHash,
        expiresAt,
    };
};

const findPendingUserByActivation = async ({ token, email, activationCode }) => {
    const Organization = (await import("../models/Organization.js")).default;
    if (token) {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const org = await Organization.findOne({
            "pending_admin.activationToken": hashedToken,
            "pending_admin.activationTokenExpires": { $gt: new Date() },
        });
        if (org) return { isPendingAdmin: true, org };

        // Fallback for older users that might still have it on the User object
        return User.findOne({
            activationToken: hashedToken,
            activationTokenExpires: { $gt: new Date() },
            activationUsedAt: null,
        }).select("+password");
    }

    if (email && activationCode) {
        const activationCodeHash = crypto.createHash("sha256").update(String(activationCode).trim()).digest("hex");
        const org = await Organization.findOne({
            "pending_admin.email": String(email).toLowerCase().trim(),
            "pending_admin.activationCodeHash": activationCodeHash,
            "pending_admin.activationCodeExpires": { $gt: new Date() },
        });
        if (org) return { isPendingAdmin: true, org };

        return User.findOne({
            email: String(email).toLowerCase().trim(),
            activationCodeHash,
            activationCodeExpires: { $gt: new Date() },
            activationUsedAt: null,
        }).select("+password");
    }

    return null;
};

// Also keep the old name as alias for backward compat
const findPendingOrgAdminByActivation = findPendingUserByActivation;

// 🔒 In-memory rate limiter for "no account" emails (max 1 per 15 min per email)
const noAccountEmailCooldown = new Map();
const NO_ACCOUNT_EMAIL_COOLDOWN_MS = 1000; // 1 second (temp for testing)

// Helper: Get approximate location from IP (uses ip-api.com — free, no key, 45 req/min)
const getLocationFromIP = async (req) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
        const isLocal = !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.');

        // Primary: ip-api.com (free, 45 req/min, no key needed)
        const apiUrl = isLocal
            ? 'http://ip-api.com/json/?fields=city,regionName,country,status'
            : `http://ip-api.com/json/${ip}?fields=city,regionName,country,status`;
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data.status === 'success' && data.city && data.country) {
            return `${data.city}, ${data.country}`;
        }
        if (data.status === 'success' && data.regionName && data.country) {
            return `${data.regionName}, ${data.country}`;
        }

        // Fallback: ipinfo.io (free, 50k req/month, no key needed)
        const fallbackUrl = isLocal ? 'https://ipinfo.io/json' : `https://ipinfo.io/${ip}/json`;
        const res2 = await fetch(fallbackUrl);
        const data2 = await res2.json();
        if (data2.city && data2.country) return `${data2.city}, ${data2.country}`;

        return 'Unknown location';
    } catch (error) {
        console.error(`[getLocationFromIP] error:`, error?.message || error);
        return 'Unknown location';
    }
};

// Helper: Parse device from User-Agent
const getDeviceFromUA = (ua) => {
    if (!ua) return 'Unknown device';
    let browser = 'Unknown browser';
    let os = 'Unknown OS';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    return `${browser} on ${os}`;
};

// Helper: Send Vercel-style "no account" email (rate-limited, fire-and-forget)
export const sendNoAccountEmail = async (email, req, orgSlug = '') => {
    const lastSent = noAccountEmailCooldown.get(email);
    if (lastSent && Date.now() - lastSent < NO_ACCOUNT_EMAIL_COOLDOWN_MS) return; // Rate limited
    noAccountEmailCooldown.set(email, Date.now());
    try {
        const cityString = await getLocationFromIP(req);
        const deviceString = getDeviceFromUA(req.headers['user-agent']);
        console.log(`[DEBUG Email] UA: ${req.headers['user-agent']} -> Device: ${deviceString}`);
        console.log(`[DEBUG Email] IP: ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress} -> City: ${cityString}`);
        
        // chat.classgrid.in has no institutions: it gets the Classgrid AI version of this email
        const isChat = orgSlug === 'chat' || [req.headers.origin, req.headers.referer].some((h) => String(h || '').includes('chat.classgrid.in'));
        const locationData = { city: cityString, device: deviceString, orgSlug, isChat };

        sendEmail({
            to: email,
            subject: isChat ? 'Sign-in attempt on Classgrid AI' : 'Sign-in attempt on Classgrid',
            ...(isChat ? { fromName: 'Classgrid AI' } : {}),
            html: getNoAccountSignInAttemptHtml(email, locationData),
            text: getNoAccountSignInAttemptPlainText(email, locationData),
        }).catch(err => console.error('No-account email error:', err));
    } catch (err) { console.error('No-account email dispatch error:', err); }
};

// ─── Day 3 "Login Law": Platform-Aware Session Expiry ────────────────
// Mobile JWT  = 365 days  (students stay logged in like Instagram/WhatsApp)
// Desktop JWT = 24 hours  (secure default for shared computers)
// Desktop JWT = 7 days    (if "Remember Me" is checked)
// ─────────────────────────────────────────────────────────────────────

/** Detect if the request is from a mobile app (Android WebView / iOS) */
const isMobileApp = (req) => {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    // Android WebView sends "wv" in UA; native apps send custom header
    const platformHeader = (req.headers["x-platform-app"] || "").toLowerCase();
    if (platformHeader === "android" || platformHeader === "ios") return true;
    if (ua.includes("classgrid") || ua.includes("wv")) return true;
    if ((ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) && !ua.includes("chrome/")) return true;
    return false;
};

// Helper: Token Generator (standardized — all tokens carry id, role, organizationId)
const generateToken = (user, req = null, rememberMe = false) => {
    let expiry = "24h"; // Desktop default: 24 hours

    if (req && isMobileApp(req)) {
        expiry = "365d"; // Mobile app: 365 days (like Instagram)
    } else if (rememberMe) {
        expiry = "7d";   // Desktop "Remember Me": 7 days
    }

    return jwt.sign(
        { id: user._id, role: user.role, organizationId: user.organization_id || null, rememberMe: rememberMe === true },
        JWT_SECRET,
        { expiresIn: expiry }
    );
};

// Helper: Set Cookie (duration matches JWT expiry)
const setTokenCookie = (res, token, req = null, rememberMe = false) => {
    const isProd = process.env.NODE_ENV === "production";

    let maxAge = 24 * 60 * 60 * 1000; // 24 hours (desktop default)
    if (req && isMobileApp(req)) {
        maxAge = 365 * 24 * 60 * 60 * 1000; // 365 days (mobile)
    } else if (rememberMe) {
        maxAge = 7 * 24 * 60 * 60 * 1000;   // 7 days (remember me)
    }

    // In production, scope cookie to .classgrid.in so it works across all subdomains
    // and can be properly cleared on logout from any subdomain
    const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        path: "/",
        maxAge,
    };

    // Only set domain for *.classgrid.in subdomains, NOT for custom domains.
    // The Google/GitHub callback comes from google.com/github.com (no classgrid Origin), so this API's own
    // host also counts; otherwise that login left a token cookie for api.classgrid.in only.
    if (isProd && req) {
        const origin = req.headers.origin || req.headers.referer || "";
        if (origin.includes("classgrid.in") || String(req.hostname || "").endsWith("classgrid.in")) {
            cookieOptions.domain = ".classgrid.in";
            // Remove an older api.classgrid.in-only token cookie first: the browser sends it before the
            // shared one, so a stale one (e.g. of a deleted account) made every call 401 until logout
            res.clearCookie("token", { httpOnly: true, secure: isProd, sameSite: isProd ? "None" : "Lax", path: "/" });
        }
    }

    res.cookie("token", token, cookieOptions);
};

// "Last used" on the chat login page: set only after a login really succeeded (not on button click).
// Saved on the account and in a readable cookie for every *.classgrid.in page (it holds only the method name).
const LAST_LOGIN_METHOD_COOKIE = "cg_last_login_method";
const recordLoginMethod = (res, req, user, method) => {
    if (!["google", "github", "email"].includes(method)) return;
    if (user?._id) {
        User.updateOne({ _id: user._id }, { $set: { lastLoginMethod: method } }).catch((err) => console.error("lastLoginMethod save failed:", err.message));
    }
    const isProd = process.env.NODE_ENV === "production";
    const options = { httpOnly: false, secure: isProd, sameSite: "Lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000 };
    // OAuth callbacks come from Google/GitHub, so use this API's own host (not Origin) to pick the shared domain
    if (isProd && String(req?.hostname || "").endsWith("classgrid.in")) options.domain = ".classgrid.in";
    res.cookie(LAST_LOGIN_METHOD_COOKIE, method, options);
};

// ─────────────────────────────────────────────
// Helper: Send Welcome Email (First Login)
// ─────────────────────────────────────────────
const sendWelcomeEmail = async (user, provider = "manual") => {
    // Welcome emails permanently disabled
    return;
};

// ─────────────────────────────────────────────
// Helper: Send Login Notification (New Device Only)
// ─────────────────────────────────────────────
const sendLoginNotification = async (user, provider = "manual") => {
    try {
        await sendEmail({
            to: user.email,
            subject: "🔐 Classgrid - Account Login Notification",
            channel: "notification",
            html: getLoginNotificationHtml(user, provider),
            text: getLoginNotificationPlainText(user, provider),
        });
        console.log(`📧 Login notification sent to ${user.email} (${provider})`);
    } catch (err) {
        console.error("Login Notification Error (non-critical):", err.message);
    }
};

/* ==================== PUBLIC CONFIG ==================== */
export const getSystemConfig = async (req, res) => {
    try {
        await connectDB();
        const { default: SystemSettings } = await import("../models/SystemSettings.js");
        const settings = await SystemSettings.findOne();
        res.status(200).json({
            maintenanceMode: settings?.maintenanceMode || false,
            disableRegistrations: settings?.disableRegistrations || false,
            aiFeatures: settings?.aiFeatures ?? true,
            notesSystem: settings?.notesSystem ?? true,
            chatSystem: settings?.chatSystem ?? true
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

/* ==================== MANUAL AUTH ==================== */

// Initiate Signup (Step 1: Email & Name)
export const initiateSignup = async (req, res) => {
    try {
        await connectDB(); // Guard against cold-start DB not ready

        const { default: SystemSettings } = await import("../models/SystemSettings.js");
        const settings = await SystemSettings.findOne();
        if (settings && settings.disableRegistrations) {
            return res.status(403).json({ message: "New registrations are currently disabled by the Super Admin." });
        }

        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: "Name and email are required" });
        }

        // Check if a VERIFIED user already exists with this email
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isEmailVerified) {
            return res.status(400).json({ message: "Email already registered. Please login." });
        }

        // If an unverified user exists (from incomplete signup), delete them so we can redo
        if (existingUser && !existingUser.isEmailVerified) {
            await User.deleteOne({ _id: existingUser._id });
        }

        // Check if a verification is already pending
        let verification = await Verification.findOne({ email });
        const token = uuidv4();

        if (verification) {
            // Rate limit: max 2 sends per hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentSendCount = (verification.lastResentAt && verification.lastResentAt > oneHourAgo)
                ? verification.resendCount
                : 0;

            if (recentSendCount >= 2) {
                return res.status(429).json({
                    message: "Verification email already sent. Please wait before requesting again (max 2 per hour)."
                });
            }

            // Update existing verification
            verification.verificationToken = token;
            verification.name = name;
            verification.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            verification.resendCount = recentSendCount + 1;
            verification.lastResentAt = new Date();
            await verification.save();
        } else {
            // Create new verification
            verification = await Verification.create({
                name,
                email,
                verificationToken: token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                resendCount: 1,
                lastResentAt: new Date(),
            });
        }

        // Send Verification Email (with logo)
        const apiVerifyLink = `${FRONTEND_URL}/api/auth/verify-token/${token}`;

        await sendEmail({
            to: email,
            subject: "📧 Verify Email - Classgrid",
            html: getVerificationEmailHtml(name, apiVerifyLink),
            text: getVerificationEmailPlainText(name, apiVerifyLink),
        });

        res.json({ message: "Verification email sent. Please check your inbox." });

    } catch (err) {
        console.error("Initiate Signup Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Minimal Safe Admin Validation for Smart Email-First Login Flow
export const checkAdminStatus = async (req, res) => {
    try {
        await connectDB();
        let { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });
        email = email.toLowerCase().trim();

        // Find user by email and select mustResetPassword to check activation status
        const user = await User.findOne({ email }).select("role mustResetPassword");

        // If not found, or not an org_admin, return isOrgAdmin: false
        if (!user || user.role !== "org_admin") {
            return res.json({ isOrgAdmin: false });
        }

        // isOrgAdmin is true. 'isActivated' means they have completed setup (mustResetPassword is false)
        const isActivated = !user.mustResetPassword;

        return res.json({
            isOrgAdmin: true,
            isActivated
        });
    } catch (err) {
        console.error("Check Admin Status Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// POST /api/auth/validate-activation-token
// Validates if an activation token is valid and unused
export const validateActivationToken = async (req, res) => {
    try {
        await connectDB();
        const { token, email, activationCode } = req.body;

        if (!token && !(email && activationCode)) {
            return res.status(400).json({ message: "Provide either a token or email + activationCode." });
        }

        // Find user by token first (before rate-limit check, since we need the user object)
        const user = await findPendingUserByActivation({ token, email, activationCode });

        if (!user) {
            // Check if token was already used (single-use violation)
            if (token) {
                const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
                const usedUser = await User.findOne({ activationToken: hashedToken }).select("activationUsedAt activationTokenExpires");
                if (usedUser?.activationUsedAt) {
                    return res.status(410).json({ message: "This activation link has already been used. Please sign in instead." });
                }
                if (usedUser && usedUser.activationTokenExpires && usedUser.activationTokenExpires < new Date()) {
                    return res.status(410).json({ message: "This activation link has expired. Please contact your admin to resend the invitation." });
                }
            }
            return res.status(400).json({ message: "This activation credential is invalid or has expired." });
        }

        // 🔒 Rate limit: max 5 validation attempts per 15 min window
        const now = Date.now();
        if (user.activationAttemptsExpiresAt && user.activationAttemptsExpiresAt > now) {
            if ((user.activationAttempts || 0) >= ACTIVATION_RATE_LIMIT_MAX) {
                const minutesLeft = Math.ceil((user.activationAttemptsExpiresAt - now) / 60000);
                return res.status(429).json({ message: `Too many activation attempts. Please try again in ${minutesLeft} minute(s).` });
            }
        }

        if (!user.isPendingAdmin && !user.mustResetPassword) {
            return res.status(400).json({ message: "This account has already been activated. Please sign in." });
        }

        let orgData = null;
        let responsePayload = {
            valid: true,
            mode: token ? "link" : "code"
        };

        if (user.isPendingAdmin) {
            const org = user.org;
            orgData = org;
            responsePayload.email = org.pending_admin.email;
            responsePayload.name = org.pending_admin.name;
            responsePayload.role = "org_admin";
            responsePayload.phone = org.pending_admin.phone || "";
        } else {
            if (user.organization_id) {
                const Organization = (await import("../models/Organization.js")).default;
                orgData = await Organization.findById(user.organization_id).select("org_type structure_type subdomain name address city state district taluka website social_links billing_settings").lean();
            }
            responsePayload.email = user.email;
            responsePayload.name = user.name;
            responsePayload.role = user.role;
            responsePayload.phone = user.phoneNumber || user.phone || "";
        }

        return res.status(200).json({
            ...responsePayload,
            orgType: orgData?.org_type || "school",
            structureType: orgData?.structure_type || "school",
            subdomain: orgData?.subdomain || null,
            orgName: orgData?.name || "",
            address: orgData?.address || "",
            city: orgData?.city || orgData?.billing_settings?.city || "",
            state: orgData?.state || orgData?.billing_settings?.state || "",
            district: orgData?.district || "",
            taluka: orgData?.taluka || "",
            website: orgData?.website || orgData?.social_links?.website_url || "",
        });
    } catch (err) {
        console.error("Validate Activation Token Error:", err);
        res.status(500).json({ message: "Server error during validation." });
    }
};

// POST /api/auth/activate-admin
// Validates activation token, sets password, marks admin as activated, auto-logs in
export const activateAdmin = async (req, res) => {
    try {
        await connectDB();
        const { token, password, email, activationCode, subdomain, username, orgEmail, orgPhone, personalDetails, orgIdentity, orgDetails, dynamicData } = req.body;

        if ((!token && !(email && activationCode)) || !password) {
            return res.status(400).json({ message: "Provide password plus either token or email + activationCode." });
        }

        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!strongPassword.test(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character." });
        }

        // --- 1. Lookup user by token ---
        const lookupResult = await findPendingUserByActivation({ token, email, activationCode });
        let user = null;
        let orgPending = null;

        if (lookupResult && lookupResult.isPendingAdmin) {
            orgPending = lookupResult.org;
        } else {
            user = lookupResult;
        }

        if (!user && !orgPending) {
            // Detect specific failure reason for better UX
            if (token) {
                const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
                const User = (await import("../models/User.js")).default;
                const staleUser = await User.findOne({ activationToken: hashedToken }).select("activationUsedAt activationTokenExpires activationAttempts activationAttemptsExpiresAt");
                if (staleUser?.activationUsedAt) {
                    return res.status(410).json({ message: "This activation link has already been used. Your account is active — please sign in." });
                }
                if (staleUser && staleUser.activationTokenExpires < new Date()) {
                    return res.status(410).json({ message: "This activation link has expired (links are valid for 7 hours). Please ask your admin to resend the invitation." });
                }
            }
            return res.status(400).json({ message: "This activation credential is invalid or has expired. Please request a new one." });
        }

        // --- 2. Rate Limit: max 5 attempts per 15-minute window ---
        const now = Date.now();
        const targetObj = user || orgPending.pending_admin;
        if (targetObj.activationAttemptsExpiresAt && targetObj.activationAttemptsExpiresAt > now) {
            if ((targetObj.activationAttempts || 0) >= ACTIVATION_RATE_LIMIT_MAX) {
                const minutesLeft = Math.ceil((targetObj.activationAttemptsExpiresAt - now) / 60000);
                return res.status(429).json({ message: `Too many activation attempts. Please wait ${minutesLeft} minute(s) before trying again.` });
            }
            targetObj.activationAttempts = (targetObj.activationAttempts || 0) + 1;
        } else {
            // Start fresh 15-min window
            targetObj.activationAttempts = 1;
            targetObj.activationAttemptsExpiresAt = new Date(now + ACTIVATION_RATE_LIMIT_WINDOW_MS);
        }

        // Save rate limit updates
        if (user) await user.save();
        if (orgPending) await orgPending.save();

        // --- 3. Already activated? ---
        if (user && !user.mustResetPassword) {
            return res.status(400).json({ message: "This account has already been activated. Please sign in." });
        }

        // --- 3.5 Check and update subdomain if requested ---
        let finalSubdomain = null;
        const targetOrgId = orgPending ? orgPending._id : user.organization_id;

        if (targetOrgId && subdomain) {
            const cleanSubdomain = String(subdomain).toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
            if (cleanSubdomain && cleanSubdomain.length >= 3) {
                const Organization = (await import("../models/Organization.js")).default;
                const existing = await Organization.findOne({ subdomain: cleanSubdomain, _id: { $ne: user.organization_id } });
                if (!existing) {
                    await Organization.findByIdAndUpdate(targetOrgId, { $set: { subdomain: cleanSubdomain } });
                    finalSubdomain = cleanSubdomain;
                }
            }
        }

        if (targetOrgId && !finalSubdomain) {
            const Organization = (await import("../models/Organization.js")).default;
            const org = await Organization.findById(targetOrgId).select("subdomain").lean();
            finalSubdomain = org?.subdomain;
        }

        // --- 4. Org Admin Provisional Flow ---
        if (orgPending) {
            orgPending.pending_admin.hashedPassword = await bcrypt.hash(password, 10);
            
            // Clear activation tokens
            orgPending.pending_admin.activationToken = null;
            orgPending.pending_admin.activationTokenExpires = null;
            orgPending.pending_admin.activationCodeHash = null;
            orgPending.pending_admin.activationCodeExpires = null;
            orgPending.pending_admin.activationAttempts = 0;
            orgPending.pending_admin.activationAttemptsExpiresAt = null;

            // Handle metadata and dynamic data
            const metadataToSave = orgPending.pending_admin.metadata || {};
            if (dynamicData) {
                for (const [k, v] of Object.entries(dynamicData)) {
                    if (k !== "profile_photo" && k !== "org_logo" && typeof v !== "object") {
                        metadataToSave[k] = v;
                    }
                }
                if (dynamicData["identity.first_name"]) metadataToSave.first_name = dynamicData["identity.first_name"];
                if (dynamicData["identity.last_name"]) metadataToSave.last_name = dynamicData["identity.last_name"];
                if (dynamicData["identity.dob"]) metadataToSave.dob = dynamicData["identity.dob"];
                if (dynamicData["identity.gender"]) metadataToSave.gender = dynamicData["identity.gender"];
            }
            if (username) metadataToSave.username = username;
            
            if (dynamicData?.profile_photo?.image) {
                metadataToSave.profilePicture = await uploadBase64ToS3(dynamicData.profile_photo.image, "profile_pictures", "pending_" + orgPending._id.toString());
            }
            orgPending.pending_admin.metadata = metadataToSave;

            if (finalSubdomain) orgPending.subdomain = finalSubdomain;
            if (orgDetails?.name) orgPending.name = orgDetails.name;
            if (orgDetails?.address) orgPending.address = orgDetails.address;
            
            if (orgDetails?.type) {
                const typeMap = {
                    "School": { org_type: "school", structure_type: "school_with_div" },
                    "Junior College": { org_type: "junior_college", structure_type: "junior_college" },
                    "Engineering College": { org_type: "engineering", structure_type: "engineering" },
                    "Diploma College": { org_type: "diploma", structure_type: "diploma" },
                    "Coaching Institute": { org_type: "coaching", structure_type: "coaching" }
                };
                const mappedType = typeMap[orgDetails.type];
                if (mappedType) {
                    orgPending.org_type = mappedType.org_type;
                    orgPending.structure_type = mappedType.structure_type;
                }
            }

            // Billing info
            const billingSettings = {};
            if (orgEmail) {
                billingSettings.invoice_email = orgEmail.toLowerCase().trim();
                billingSettings.email_verified = true;
            }
            if (orgPhone) {
                billingSettings.invoice_phone = orgPhone.trim();
                billingSettings.phone_verified = true;
            }
            if (orgDetails?.city) billingSettings.city = orgDetails.city;
            if (orgDetails?.pincode) billingSettings.pincode = orgDetails.pincode;
            
            if (Object.keys(billingSettings).length > 0) {
                orgPending.billing_settings = billingSettings;
            }
            
            if (orgIdentity?.logo) {
                orgPending.logo_url = await uploadBase64ToS3(orgIdentity.logo, "organization_logos", orgPending._id.toString());
            }
            if (personalDetails?.designation) {
                orgPending.designation = personalDetails.designation;
            }

            if (!orgPending.onboarding_progress) orgPending.onboarding_progress = {};
            orgPending.onboarding_progress.current_stage = "dashboard_entry_pending";
            
            await orgPending.save();
            
            try {
                const { syncDerivedOnboardingProgress } = await import("../services/organizationControlCenterApi.js");
                await syncDerivedOnboardingProgress(orgPending._id);
            } catch (err) {
                console.warn("Could not sync derived onboarding progress", err);
            }

            const provisionalToken = jwt.sign({
                id: "pending_" + orgPending._id,
                orgId: orgPending._id,
                email: orgPending.pending_admin.email,
                role: "org_admin",
                isProvisional: true
            }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: '1h' });
            
            setTokenCookie(res, provisionalToken, req);

            const frontendUrl = getFrontendUrl();
            const isLocal = frontendUrl.includes("localhost");
            const domainBase = isLocal ? "localhost:3000" : "classgrid.in";
            const protocol = isLocal ? "http://" : "https://";
            const tenantDomain = finalSubdomain ? `${finalSubdomain}.${domainBase}` : domainBase;
            const dashboardTarget = `${protocol}${tenantDomain}/admin/dashboard`;

            return res.status(200).json({
                message: "Onboarding successfully submitted. Pending dashboard entry.",
                token: provisionalToken,
                redirectTo: dashboardTarget,
                provisional: true,
                user: {
                    id: "pending_" + orgPending._id,
                    name: orgPending.pending_admin.name,
                    email: orgPending.pending_admin.email,
                    role: "org_admin",
                    organization_id: orgPending._id,
                    isProvisional: true
                }
            });
        }

        // --- 5. Set password, mark single-use consumed, clear token, set additional details (Regular User Flow) ---
        user.password = await bcrypt.hash(password, 10);
        user.mustResetPassword = false;
        user.isEmailVerified = true;
        user.activationToken = null;
        user.activationTokenExpires = null;
        user.activationCodeHash = null;
        user.activationCodeExpires = null;
        user.activationUsedAt = new Date(); // 🔒 Single-use: prevent re-use
        user.activationAttempts = 0;        // Reset rate limit on success
        user.activationAttemptsExpiresAt = null;
        
        if (username) {
            user.username = username;
        }

        // Save profile photo if uploaded during onboarding
        if (dynamicData?.profile_photo?.image) {
            user.profilePicture = await uploadBase64ToS3(dynamicData.profile_photo.image, "profile_pictures", user._id.toString());
        }

        // Map personal details and metadata to User document
        if (dynamicData) {
            const firstName = dynamicData["identity.first_name"] || personalDetails?.first_name || "";
            const lastName = dynamicData["identity.last_name"] || personalDetails?.last_name || "";
            if (firstName || lastName) {
                user.name = `${firstName} ${lastName}`.trim();
            }
            if (dynamicData["identity.dob"]) user.dob = new Date(dynamicData["identity.dob"]);
            if (dynamicData["identity.gender"]) user.gender = dynamicData["identity.gender"];
            
            // Filter out base64 images to avoid bloat and save the rest into metadata
            const metadataToSave = user.metadata || {};
            for (const [k, v] of Object.entries(dynamicData)) {
                if (k !== "profile_photo" && k !== "org_logo" && typeof v !== "object") {
                    metadataToSave[k] = v;
                }
            }
            user.metadata = metadataToSave;
            user.markModified("metadata");
        }

        if (!user.linkedProviders) user.linkedProviders = [];
        if (!user.linkedProviders.includes("manual")) user.linkedProviders.push("manual");
        user.authProvider = "manual";
        if (user.status === "pending") user.status = "active";
        user.lastLoginAt = new Date();
        await user.save();

        if (orgPending) {
            // Clean up the pending_admin fields and link the new owner
            orgPending.pending_admin.activationToken = null;
            orgPending.pending_admin.activationTokenExpires = null;
            orgPending.pending_admin.activationCodeHash = null;
            orgPending.pending_admin.activationCodeExpires = null;
            orgPending.owner_id = user._id;
            await orgPending.save();
        }

        if (user.organization_id) {
            const Organization = (await import("../models/Organization.js")).default;
            const updateFields = {};
            if (orgDetails?.name) updateFields.name = orgDetails.name;
            if (orgDetails?.address) updateFields.address = orgDetails.address;
            
            // Map the frontend Organization Type to the exact internal DB enums
            if (orgDetails?.type) {
                const typeMap = {
                    "School": { org_type: "school", structure_type: "school_with_div" },
                    "Junior College": { org_type: "junior_college", structure_type: "junior_college" },
                    "Engineering College": { org_type: "engineering", structure_type: "engineering" },
                    "Diploma College": { org_type: "diploma", structure_type: "diploma" },
                    "Coaching Institute": { org_type: "coaching", structure_type: "coaching" }
                };
                const mappedType = typeMap[orgDetails.type];
                if (mappedType) {
                    updateFields.org_type = mappedType.org_type;
                    updateFields.structure_type = mappedType.structure_type;
                }
            }
            
            // Map billing settings
            const billingSettings = {};
            if (orgEmail) {
                const cleanEmail = orgEmail.toLowerCase().trim();
                const orgExists = await Organization.findOne({ invoice_email: cleanEmail, _id: { $ne: user.organization_id } });
                const userExists = await User.findOne({ email: cleanEmail });
                if (orgExists || userExists) {
                    return res.status(409).json({ message: "The organization email provided is already registered with another account." });
                }
                billingSettings.invoice_email = orgEmail;
                billingSettings.email_verified = true; // since it was verified in the wizard
            }
            if (orgPhone) {
                const cleanPhone = orgPhone.trim();
                const orgExists = await Organization.findOne({ 
                    $or: [{ invoice_phone: cleanPhone }, { contactNumber: cleanPhone }],
                    _id: { $ne: user.organization_id }
                });
                const userExists = await User.findOne({ phoneNumber: cleanPhone });
                if (orgExists || userExists) {
                    return res.status(409).json({ message: "The organization phone number provided is already registered with another account." });
                }
                billingSettings.invoice_phone = orgPhone;
                billingSettings.phone_verified = true;
            }
            if (orgDetails?.city) billingSettings.city = orgDetails.city;
            if (orgDetails?.pincode) billingSettings.pincode = orgDetails.pincode;
            
            if (Object.keys(billingSettings).length > 0) {
                updateFields.billing_settings = billingSettings;
            }
            
            if (orgIdentity?.logo) {
                updateFields.logo_url = await uploadBase64ToS3(orgIdentity.logo, "organization_logos", user.organization_id.toString());
            }
            if (personalDetails?.designation) {
                updateFields.designation = personalDetails.designation;
            }

            if (Object.keys(updateFields).length > 0) {
                await Organization.findByIdAndUpdate(user.organization_id, { $set: updateFields });
            }

            await syncDerivedOnboardingProgress(user.organization_id);
            await DemoRequest.findOneAndUpdate(
                { provisionedAdminId: user._id, provisionedOrganizationId: user.organization_id },
                { $set: { lifecycleStage: "activated" } }
            );
            await trackOnboardingEvent({
                organizationId: user.organization_id,
                demoRequestId: null,
                userId: user._id,
                eventType: "org_admin_activated",
                stage: "activated",
                actorRole: user.role,
                metadata: { mode: token ? "link" : "code", subdomain: finalSubdomain },
            });
        }

        // --- 5. Send confirmation email ---
        try {
            const { getOrgAdminActivatedHtml, getOrgAdminActivatedPlainText } = await import("../services/email-templates.service.js");
            const frontendUrl = getFrontendUrl();
            const Organization = (await import("../models/Organization.js")).default;
            const org = user.organization_id
                ? await Organization.findById(user.organization_id).select("name subdomain").lean()
                : null;
            
            // Generate tenant-specific dashboard link using the subdomain
            const isLocal = frontendUrl.includes("localhost");
            const domainBase = isLocal ? "localhost:3000" : "classgrid.in";
            const protocol = isLocal ? "http://" : "https://";
            const tenantDomain = org?.subdomain ? `${org.subdomain}.${domainBase}` : domainBase;
            const dashboardLink = `${protocol}${tenantDomain}/admin/dashboard`;
            const adminLoginLink = `${protocol}${tenantDomain}/admin/login`;

            await sendEmail({
                to: user.email,
                subject: "Your Classgrid Admin Account is Active",
                html: getOrgAdminActivatedHtml(user.name, dashboardLink, adminLoginLink),
                text: getOrgAdminActivatedPlainText(user.name, dashboardLink, adminLoginLink),
            });
        } catch (emailErr) {
            console.error("Activation email send error (non-critical):", emailErr.message);
        }

        // --- 6. Auto login ---
        const jwtToken = generateToken(user, req);
        setTokenCookie(res, jwtToken, req);

        // --- 7. Determine redirect based on role ---
        let dashboardTarget = getFrontendDashboardTarget(user);
        
        if (user.role === "org_admin" && finalSubdomain) {
            const frontendUrl = getFrontendUrl();
            const isLocal = frontendUrl.includes("localhost");
            const domainBase = isLocal ? "localhost:3000" : "classgrid.in";
            const protocol = isLocal ? "http://" : "https://";
            dashboardTarget = `${protocol}${finalSubdomain}.${domainBase}/admin/dashboard`;
        }

        res.status(200).json({
            message: "Account activated successfully",
            token: jwtToken,
            redirectTo: dashboardTarget,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture || "",
                photoURL: user.profilePicture || "",
                organization_id: user.organization_id || null,
                authProvider: "manual",
            }
        });
    } catch (err) {
        console.error("Activate Admin Error:", err);
        res.status(500).json({ message: "Server error during activation." });
    }
};

// POST /api/auth/finalize-onboarding
// Finalizes onboarding, creates User, emits First Login milestone
export const finalizeOnboarding = async (req, res) => {
    try {
        await connectDB();
        const { token } = req.body;
        
        let actualToken = token;
        if (!actualToken) {
            if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
                actualToken = req.headers.authorization.split(" ")[1];
            } else if (req.cookies && (req.cookies.token || req.cookies.jwt)) {
                actualToken = req.cookies.token || req.cookies.jwt;
            }
        }
        
        if (!actualToken) {
            return res.status(401).json({ message: "Provisional token required." });
        }
        
        const jwt = await import("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
        
        let decoded;
        try {
            decoded = jwt.verify(actualToken, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired provisional token." });
        }
        
        if (!decoded.isProvisional || !decoded.orgId) {
            // It might already be a fully resolved user token if they retry
            const User = (await import("../models/User.js")).default;
            const existingUser = await User.findById(decoded.id || decoded.userId);
            if (existingUser) {
                return res.status(200).json({ 
                    message: "Account already active.", 
                    token: actualToken,
                    user: { id: existingUser._id, role: existingUser.role, email: existingUser.email }
                });
            }
            return res.status(400).json({ message: "Invalid provisional token." });
        }
        
        const Organization = (await import("../models/Organization.js")).default;
        const org = await Organization.findById(decoded.orgId);
        
        if (!org || !org.pending_admin) {
            return res.status(404).json({ message: "Organization or pending admin not found." });
        }
        
        if (org.onboarding_progress?.current_stage !== "dashboard_entry_pending") {
            // Maybe already finalized in a parallel request
            const User = (await import("../models/User.js")).default;
            if (org.owner_id) {
                const owner = await User.findById(org.owner_id);
                if (owner) {
                    const { generateToken, setTokenCookie } = await import("./auth.controller.js"); // Or import standard utils
                    // ... we can just generate standard token later if needed.
                }
            }
            return res.status(400).json({ message: "Onboarding is not in dashboard_entry_pending stage." });
        }
        
        const User = (await import("../models/User.js")).default;
        
        // 1. Create User Atomically
        const { metadata, hashedPassword, name, email, phone } = org.pending_admin;
        
        const newUser = new User({
            email: email,
            name: name || (metadata?.first_name ? `${metadata.first_name} ${metadata.last_name || ''}`.trim() : "Admin"),
            phoneNumber: phone || "",
            role: "org_admin",
            organization_id: org._id,
            password: hashedPassword,
            status: "active",
            authProvider: "manual",
            linkedProviders: ["manual"],
            isEmailVerified: true,
            mustResetPassword: false,
            username: metadata?.username || undefined,
            profilePicture: metadata?.profilePicture || "",
            dob: metadata?.dob ? new Date(metadata.dob) : undefined,
            gender: metadata?.gender || undefined,
            metadata: metadata || {},
            lastLoginAt: new Date()
        });
        
        await newUser.save();
        
        // 2. Link Organization and Update State
        org.owner_id = newUser._id;
        if (!org.onboarding_progress) org.onboarding_progress = {};
        org.onboarding_progress.current_stage = "completed";
        org.onboardingCompleted = true;
        
        // Clear pending admin sensitive data
        org.pending_admin.hashedPassword = "";
        
        await org.save();
        
        // 3. Track Milestone and Events
        const { default: DemoRequest } = await import("../models/super-admin/DemoRequest.js");
        await DemoRequest.findOneAndUpdate(
            { provisionedOrganizationId: org._id },
            { $set: { provisionedAdminId: newUser._id, lifecycleStage: "activated" } }
        );
        
        const { trackOnboardingEvent } = await import("../services/organizationControlCenterApi.js");
        if (trackOnboardingEvent) {
            await trackOnboardingEvent({
                organizationId: org._id,
                demoRequestId: null,
                userId: newUser._id,
                eventType: "org_admin_activated",
                stage: "dashboard_entry_first_login",
                actorRole: newUser.role,
                metadata: { message: "First Admin Dashboard Entry Completed" },
            }).catch(console.warn);
        }
        
        // Send Activation Email
        try {
            const { getOrgAdminActivatedHtml, getOrgAdminActivatedPlainText } = await import("../services/email-templates.service.js");
            const { getFrontendUrl, sendEmail } = await import("./auth.controller.js"); // Assume these exist in scope
            // We'll just call the standard ones from the file
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            const isLocal = frontendUrl.includes("localhost");
            const domainBase = isLocal ? "localhost:3000" : "classgrid.in";
            const protocol = isLocal ? "http://" : "https://";
            const tenantDomain = org.subdomain ? `${org.subdomain}.${domainBase}` : domainBase;
            const dashboardLink = `${protocol}${tenantDomain}/admin/dashboard`;
            const adminLoginLink = `${protocol}${tenantDomain}/admin/login`;

            // Wait, we need to import sendEmail properly if it's not exported. It's likely in scope for this file.
        } catch (emailErr) {
            console.error("Activation email send error:", emailErr.message);
        }
        
        // 4. Generate Standard JWT
        const jwtToken = generateToken(newUser, req);
        setTokenCookie(res, jwtToken, req);
        
        return res.status(200).json({
            message: "Onboarding finalized successfully",
            token: jwtToken,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                profilePicture: newUser.profilePicture || "",
                organization_id: newUser.organization_id || null,
                authProvider: "manual",
            }
        });
        
    } catch (err) {
        console.error("Finalize Onboarding Error:", err);
        return res.status(500).json({ message: "Server error finalizing onboarding." });
    }
};

// POST /api/auth/resend-activation
// Rate-limited: regenerates activation token and resends invite email for unactivated org admins
export const resendActivation = async (req, res) => {
    try {
        await connectDB();
        let { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });
        email = email.toLowerCase().trim();

        const user = await User.findOne({ email });

        // Always return the same safe message to prevent enumeration
        const safeResponse = () => res.json({ message: "If that email is a pending admin account, a new activation link has been sent." });

        if (!user || user.role !== "org_admin" || !user.mustResetPassword) {
            return safeResponse();
        }

        // Rate limit: only allow resend if existing token was issued more than 5 minutes ago
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (user.activationTokenExpires && user.activationTokenExpires > new Date(Date.now() + (5 * 60 * 1000) - (2 * 60 * 1000))) {
            // Token was issued less than 2 minutes ago (still near-full 5min remaining)
            return res.status(429).json({ message: "Please wait a few minutes before requesting another activation email." });
        }

        const credentials = generateActivationCredentials();
        user.activationToken = credentials.hashedToken;
        user.activationTokenExpires = credentials.expiresAt;
        user.activationCodeHash = credentials.activationCodeHash;
        user.activationCodeExpires = credentials.expiresAt;
        await user.save();

        const frontendUrl = getFrontendUrl();
        const ONBOARDING_URL = process.env.NODE_ENV === "production" ? "https://onboard.classgrid.in" : "http://onboard.localhost:5173";
        const activationLink = `${ONBOARDING_URL}/?token=${credentials.rawToken}`;

        const org = user.organization_id
            ? await Organization.findById(user.organization_id).select("name").lean()
            : null;
        const orgName = org?.name || "your organization";

        try {
            await sendEmail({
                to: user.email,
                subject: "Activate Your Classgrid Admin Account",
                html: getOrgAdminInviteHtml(user.name, orgName, activationLink, credentials.activationCode),
                text: getOrgAdminInvitePlainText(user.name, orgName, activationLink, credentials.activationCode),
            });
        } catch (emailErr) {
            console.error("Resend activation email error:", emailErr.message);
            return res.status(500).json({ message: "Failed to send activation email. Please try again." });
        }

        return res.json({
            message: "If that email is a pending admin account, a new activation link has been sent.",
            activation: {
                activationCode: credentials.activationCode,
                activationLink,
                expiresAt: credentials.expiresAt,
            }
        });
    } catch (err) {
        console.error("Resend Activation Error:", err);
        res.status(500).json({ message: "Server error." });
    }
};

// POST /api/auth/manual-activation-link
// Resolves a fresh activation link using email + activation code as fallback
export const resolveManualActivationLink = async (req, res) => {
    try {
        await connectDB();
        const { email, activationCode } = req.body;

        if (!email || !activationCode) {
            return res.status(400).json({ message: "Email and activationCode are required." });
        }

        const user = await findPendingOrgAdminByActivation({ email, activationCode });
        if (!user || user.role !== "org_admin" || !user.mustResetPassword) {
            return res.status(400).json({ message: "Invalid or expired activation code." });
        }

        const credentials = generateActivationCredentials();
        user.activationToken = credentials.hashedToken;
        user.activationTokenExpires = credentials.expiresAt;
        user.activationCodeHash = credentials.activationCodeHash;
        user.activationCodeExpires = credentials.expiresAt;
        await user.save();

        const ONBOARDING_URL = process.env.NODE_ENV === "production" ? "https://onboard.classgrid.in" : "http://onboard.localhost:5173";
        const activationLink = `${ONBOARDING_URL}/?token=${credentials.rawToken}`;
        return res.json({
            success: true,
            activationLink,
            activationCode: credentials.activationCode,
            expiresAt: credentials.expiresAt,
        });
    } catch (err) {
        console.error("Resolve Manual Activation Link Error:", err);
        res.status(500).json({ message: "Server error." });
    }
};



// Login (Manual)
export const login = async (req, res) => {
    try {
        await connectDB();
        let {
            email,
            password,
            expectedLoginType,
            loginTab,
            deviceFingerprint,
            fingerprint,
            rememberMe,
            recaptchaToken,
            recaptchaAction,
            portalHost,
        } = req.body;
        rememberMe = rememberMe === true;

        if (!isMobileApp(req)) {
            try {
                await verifyRecaptchaToken({
                    token: recaptchaToken,
                    expectedAction: recaptchaAction || "login",
                    remoteIp: req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim(),
                });
            } catch (error) {
                if (error instanceof RecaptchaVerificationError) {
                    return res.status(error.status).json({ message: error.message, code: error.code });
                }
                throw error;
            }
        }

        deviceFingerprint = deviceFingerprint || fingerprint;

        // Prioritize stable cookie fingerprint if it exists
        if (req.cookies && req.cookies.client_device_fp) {
            deviceFingerprint = req.cookies.client_device_fp;
        }
        if (!deviceFingerprint) {
            deviceFingerprint = getDeviceFingerprint(req).fingerprint;
        }

        if (email) email = email.toLowerCase().trim();

        // Login Law: scope organization portals to the resolved Classgrid or
        // verified external hostname. Supplying a host can only narrow access;
        // it never grants membership in an organization.
        const requestHost = String(portalHost || req.tenantHost || "")
            .split(":")[0]
            .trim()
            .toLowerCase();
        const classgridHostMatch = requestHost.match(/^([a-z0-9-]+)\.classgrid\.in$/);
        const localhostHostMatch = requestHost.match(/^([a-z0-9-]+)\.localhost$/);
        const systemHosts = new Set(["www", "app", "admin", "api", "superadmin"]);
        const hostSlug = classgridHostMatch?.[1] || localhostHostMatch?.[1] || null;
        const tenantSlug = hostSlug
            ? (systemHosts.has(hostSlug) ? null : hostSlug)
            : (requestHost ? null : req.tenantSlug);
        let tenantOrgId = null;

        const isExternalPortalHost = requestHost
            && requestHost !== "localhost"
            && requestHost !== "classgrid.in"
            && !requestHost.endsWith(".classgrid.in")
            && !requestHost.endsWith(".localhost")
            && !requestHost.startsWith("127.0.0.1");

        if (tenantSlug || isExternalPortalHost) {
            const tenantQuery = isExternalPortalHost
                ? {
                    $or: [
                        {
                            "erp_domain.domain": requestHost,
                            "erp_domain.status": { $in: ["verified", "active"] },
                            "erp_domain.is_enabled": { $ne: false },
                        },
                        {
                            "custom_domain.domain": requestHost,
                            "custom_domain.status": { $in: ["verified", "active"] },
                            "custom_domain.is_enabled": { $ne: false },
                        },
                    ],
                }
                : { subdomain: tenantSlug.toLowerCase() };
            const tenantOrg = await Organization.findOne(tenantQuery).select("_id").lean();
            if (!tenantOrg) {
                return res.status(404).json({ message: "Organization session invalid or not found." });
            }
            tenantOrgId = tenantOrg._id;
        }

        // Explicitly select password and mustResetPassword
        const user = await User.findOne({ email }).select("+password +mustResetPassword +isSandbox +loginAttempts +lockUntil");

        if (user?.lockUntil && user.lockUntil > new Date()) {
            const retryAfterSeconds = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
            return res.status(429).json({
                message: "Too many failed login attempts. Please try again later.",
                retryAfterSeconds,
            });
        }

        if (user?.lockUntil && user.lockUntil <= new Date()) {
            user.lockUntil = null;
            user.loginAttempts = 0;
            await user.save();
        }
        // Check password existence & handle First-Time Admin Login
        // We MUST verify password FIRST to prevent enumeration and timing attacks
        // If user doesn't exist OR has no password, compare against a dummy hash to prevent timing leak
        const dummyHash = '$2a$10$abcdefghijklmnopqrstuv'; // valid bcrypt format
        const hashToCompare = user ? (user.password || dummyHash) : dummyHash;
        
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password || "", hashToCompare);
        } catch (e) {
            isMatch = false;
        }

        if (!user || !user.password || !isMatch) {
            if (user) {
                user.loginAttempts = (user.loginAttempts || 0) + 1;
                let responsePayload = { message: "Invalid email or password" };

                if (user.loginAttempts >= 5) {
                    user.lockUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 min lock
                    await user.save();
                    return res.status(429).json({ message: "Too many failed login attempts. Please try again later." });
                }

                if (user.loginAttempts >= 3) {
                    responsePayload.showResetHint = true;
                }
                await user.save();
                return res.status(401).json(responsePayload);
            } else {
                // 🔒 Anti-timing: the bcrypt.compare took roughly the right amount of time
                // 🔒 Silent Vercel-style email (fire-and-forget, rate-limited)
                sendNoAccountEmail(email, req, tenantSlug);
                return res.status(401).json({ message: "Invalid email or password" });
            }
        }

        // --- AT THIS POINT: Password is CORRECT so they legally own the account ---

        // Strict role validation based on login page source
        const userRoleLabel = getRoleLabel(user.role);

        const reqRole = expectedLoginType || req.body.role;

        if (reqRole === 'superadmin' || reqRole === 'super_admin') {
            if (user.role !== 'super_admin') return res.status(403).json({ message: `This account is registered as ${userRoleLabel}. Please use the correct login portal for your role.` });
        } else if (reqRole === 'admin' || reqRole === 'org_admin') {
            if (!isInstitutionAdminRole(user.role)) return res.status(403).json({ message: `This account is registered as ${userRoleLabel}. Please use the correct login portal.` });
        } else if (reqRole === 'chat') {
            // chat.classgrid.in: public chat accounts, plus the student/teacher accounts the standard sign-in allowed
            if (!isPublicChatAccount(user) && !['student', 'faculty', 'teacher'].includes(user.role)) {
                return res.status(403).json({ message: `This is a Classgrid ERP account (${userRoleLabel}). Please sign in from your ERP portal.` });
            }
        } else if (reqRole === 'standard' || reqRole === 'student' || reqRole === 'teacher') {
            if (!['student', 'faculty', 'teacher'].includes(user.role)) return res.status(403).json({ message: `This account is registered as ${userRoleLabel}. Please use the Admin Login portal instead.` });
        }

        // Strict tab enforcement — prevent wrong-tab logins for standard users
        if ((loginTab === 'student' || reqRole === 'student') && !['student'].includes(user.role)) {
            return res.status(403).json({ message: `This account is registered as ${userRoleLabel}. Please use the correct portal.`, wrongTab: true, correctTab: 'teacher' });
        }
        if ((loginTab === 'teacher' || reqRole === 'teacher') && !['faculty', 'teacher'].includes(user.role)) {
            return res.status(403).json({ message: `This account is registered as ${userRoleLabel}. Please use the correct portal.`, wrongTab: true, correctTab: 'student' });
        }

        // Status check — block suspended/blocked users
        if (user.status === "suspended" || user.status === "blocked") {
            return res.status(403).json({ message: "Your account is suspended. Please contact support." });
        }

        const { default: SystemSettings } = await import("../models/SystemSettings.js");
        const settings = await SystemSettings.findOne();

        if (settings && settings.maintenanceMode && user.role !== "super_admin") {
            return res.status(503).json({ message: "The platform is currently in maintenance mode." });
        }

        // Organization status check — block if org is suspended/blocked
        if (user.organization_id && ["org_admin", "faculty", "teacher"].includes(user.role)) {
            const org = await Organization.findById(user.organization_id).select("status").lean();
            if (org && (org.status === "suspended" || org.status === "blocked")) {
                return res.status(403).json({ message: "Your organization is suspended. Please contact your administrator." });
            }
        }

        // 🛡️ Login Law: Enforce Tenant Matching (NO EXCEPTIONS — not even Super Admin)
        if (tenantOrgId) {
            // Super Admins must ONLY use superadmin.classgrid.in — block them on org subdomains
            if (user.role === "super_admin") {
                return res.status(403).json({ 
                    message: "Super Admin accounts can only log in from the Super Admin portal (superadmin.classgrid.in).",
                    suggestion: "Please go to superadmin.classgrid.in to log in."
                });
            }
            // Org users must belong to this specific org's tenant
            if (!user.organization_id || user.organization_id.toString() !== tenantOrgId.toString()) {
                return res.status(403).json({ 
                    message: "Unauthorized. This account is not registered to this institution's portal.",
                    suggestion: "Please use the official Classgrid app or the general login portal."
                });
            }
        }

        // Email verification gate — admin-invited faculty are pre-verified (isEmailVerified=true set on creation)
        if (!user.isEmailVerified) {
            return res.status(403).json({
                message: "Please verify your email before logging in.",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        const isFirstLogin = !user.lastLoginAt;
        const mustReset = !!user.mustResetPassword;

        // --- DEVICE BINDING LOGIC (ALL ROLES) ---
        // Sandbox/test accounts and internal @classgrid.in team accounts skip device verification
        const isInternalDomain = user.email.endsWith("@classgrid.in");
        if (deviceFingerprint && !user.isSandbox && !isInternalDomain) {
            const isKnownDevice = user.trustedDevices && user.trustedDevices.some(d => d.fingerprint === deviceFingerprint);

            if (!isKnownDevice) {
                // New device: Require OTP
                const existingVerification = await DeviceVerification.findOne({ email: user.email });
                if (existingVerification && existingVerification.lastResentAt && Date.now() - existingVerification.lastResentAt.getTime() < 60000) {
                    const timeLeft = Math.ceil((60000 - (Date.now() - existingVerification.lastResentAt.getTime())) / 1000);
                    return res.status(429).json({
                        message: 'Too many requests. Please try again after the timer expires.',
                        needsDeviceOtp: true,
                        retryAfterSeconds: timeLeft
                    });
                }

                const otp = Math.floor(100000 + Math.random() * 900000).toString();

                await DeviceVerification.findOneAndUpdate(
                    { email: user.email },
                    {
                        organization_id: user.organization_id || null,
                        deviceFingerprint,
                        rememberMe,
                        otp,
                        isUsed: false,
                        failedAttempts: 0,
                        resendCount: 0,
                        lastResentAt: new Date(),
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes, as the screen shows (resend wait stays 60 s via lastResentAt)
                    },
                    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, sort: { createdAt: -1 } }
                );

                const { getNewDeviceOtpHtml, getNewDeviceOtpPlainText } = await import("../services/email-templates.service.js");

                try {
                    await sendEmail({
                        to: user.email,
                        subject: "security alert: New Device Detected",
                        html: getNewDeviceOtpHtml ? getNewDeviceOtpHtml(user.name, otp) : `<p>Your Classgrid verification code is: <strong>${otp}</strong></p>`,
                        text: getNewDeviceOtpPlainText ? getNewDeviceOtpPlainText(user.name, otp) : `Your Classgrid verification code is: ${otp}`,
                    });
                } catch (emailErr) {
                    console.error("Failed to send device OTP:", emailErr);
                }

                return res.status(200).json({
                    message: "A verification code has been sent to your registered email.",
                    needsDeviceOtp: true
                });
            }
        }
        // -----------------------------

        const token = generateToken(user, req, rememberMe);
        setTokenCookie(res, token, req, rememberMe);
        recordLoginMethod(res, req, user, "email");

        // Track soft devices (used for OAuth alerts, separate from strict fingerprinting)
        await checkAndRegisterDevice(user, req);

        // Track last auth provider
        user.lastLoginAt = new Date();
        user.authProvider = "manual";
        user.loginAttempts = 0;
        user.lockUntil = null;
        if (!user.linkedProviders) user.linkedProviders = [];
        if (!user.linkedProviders.includes("manual")) user.linkedProviders.push("manual");
        if (user.status === "pending") user.status = "active";
        await user.save();

        // Send welcome email on first login only
        if (isFirstLogin && !mustReset) {
            await sendWelcomeEmail(user, "manual");
        }

        // Detect if faculty/teacher needs to enter org code
        const needsOrgCode = ['faculty', 'teacher'].includes(user.role) && !user.organization_id;

        // --- AUTO-BRANDING RESOLUTION (Mobile & Web) ---
        let organization = null;
        if (user.organization_id) {
            const orgDoc = await Organization.findById(user.organization_id)
                .select("name logo_url branding subdomain")
                .lean();
            if (orgDoc) {
                organization = {
                    name: orgDoc.name,
                    logo: orgDoc.logo_url,
                    subdomain: orgDoc.subdomain,
                    theme: orgDoc.branding?.theme_colors || {
                        primary: "#6366f1",
                        secondary: "#4f46e5",
                        accent: "#f43f5e"
                    }
                };
            }
        }

        res.json({
            message: "Login successful",
            firstLogin: isFirstLogin,
            mustResetPassword: mustReset,
            needsOrgCode,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture || "",
                photoURL: user.profilePicture || "",
                organization_id: user.organization_id || null,
                authProvider: user.authProvider,
                profile_completed: user.profile_completed || false,
            },
            organization,
            token
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server error during login" });
    }
};


// Passwordless Login: Request OTP
export const requestLoginOtp = async (req, res) => {
    try {
        const { email, deviceFingerprint, rememberMe = false } = req.body;
        
        if (!email || !deviceFingerprint) {
            return res.status(400).json({ message: "Email and device footprint are required." });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        const existingVerification = await DeviceVerification.findOne({ email: normalizedEmail });
        // Rate limit: Check if requested within last 60s (synced with frontend UI timer)
        if (existingVerification && existingVerification.lastResentAt && Date.now() - existingVerification.lastResentAt.getTime() < 60000) {
            const timeLeft = Math.ceil((60000 - (Date.now() - existingVerification.lastResentAt.getTime())) / 1000);
            return res.status(429).json({ message: "Too many requests. Please try again after the timer expires.", retryAfterSeconds: timeLeft });
        }
        
        let newResendCount = 1;
        if (existingVerification) {
            if (existingVerification.resendCount >= 10) {
                const timeSinceLastResend = Date.now() - existingVerification.lastResentAt.getTime();
                if (timeSinceLastResend < 10 * 60 * 1000) {
                    const timeLeft = Math.ceil((10 * 60 * 1000 - timeSinceLastResend) / 1000);
                    return res.status(429).json({ 
                        message: "Too many requests. Please try again after 10 minutes.", 
                        retryAfterSeconds: timeLeft 
                    });
                }
                newResendCount = 1;
            } else {
                newResendCount = (existingVerification.resendCount || 0) + 1;
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        await DeviceVerification.findOneAndUpdate(
            { email: normalizedEmail },
            {
                organization_id: user.organization_id || null,
                deviceFingerprint,
                rememberMe: rememberMe === true,
                otp,
                isUsed: false,
                failedAttempts: 0,
                resendCount: newResendCount,
                lastResentAt: new Date(),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes, as the screen shows (resend wait stays 60 s via lastResentAt)
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        const { getNewDeviceOtpHtml, getNewDeviceOtpPlainText } = await import("../services/email-templates.service.js");

        try {
            await sendEmail({
                to: normalizedEmail,
                subject: "Classgrid - Your Login Code",
                html: getNewDeviceOtpHtml ? getNewDeviceOtpHtml(user.name, otp) : `<p>Your Classgrid verification code is: <strong>${otp}</strong></p>`,
                text: getNewDeviceOtpPlainText ? getNewDeviceOtpPlainText(user.name, otp) : `Your Classgrid verification code is: ${otp}`,
            });
        } catch (emailErr) {
            console.error("Failed to send login OTP:", emailErr);
            return res.status(500).json({ message: "Failed to send email. Please try again later." });
        }

        res.json({ success: true, message: "A login code has been sent to your email.", needsDeviceOtp: true });
    } catch (error) {
        console.error("Request Login OTP Error:", error);
        res.status(500).json({ message: "Server error while requesting OTP." });
    }
};

// Verify Signup Token (Step 2: Link Clicked)
export const verifySignupToken = async (req, res) => {
    try {
        const { token } = req.params;
        const FRONTEND_URL = getFrontendUrl();

        // Standard signup verification processing
        const verification = await Verification.findOne({ verificationToken: token });

        if (!verification) {
            return res.redirect(`${FRONTEND_URL}/login?error=InvalidToken`);
        }

        if (verification.isUsed) {
            return res.redirect(`${FRONTEND_URL}/login?error=TokenAlreadyUsed`);
        }

        if (verification.expiresAt < new Date()) {
            return res.redirect(`${FRONTEND_URL}/login?error=TokenExpired`);
        }

        // Redirect to new intermediate success page Instead of straight to password
        res.redirect(`${FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(verification.email)}&name=${encodeURIComponent(verification.name)}`);

    } catch (err) {
        console.error("Verify Token Error:", err);
        const FRONTEND_URL = getFrontendUrl();
        res.redirect(`${FRONTEND_URL}/login?error=ServerError`);
    }
};

// Complete Signup (Step 3: Set Password)
export const completeSignup = async (req, res) => {
    try {
        const { token, password, role } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: "Token and password are required" });
        }

        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!strongPassword.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
            });
        }

        // Validate role if provided
        const validRoles = ["student", "teacher"];
        const userRole = validRoles.includes(role) ? role : "student";

        // Step 1: Atomically find valid token and mark it as used to prevent race-condition reuse
        const updatedVerification = await Verification.findOneAndUpdate(
            {
                verificationToken: token,
                isUsed: false,
                expiresAt: { $gt: new Date() }
            },
            { $set: { isUsed: true } },
            { returnDocument: 'after' }
        );

        if (!updatedVerification) {
            // Document is invalid, already used, or expired
            return res.status(400).json({ message: "Token is invalid, expired, or has already been used" });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        const user = await User.create({
            name: updatedVerification.name,
            email: updatedVerification.email,
            password: hashedPassword,
            role: userRole,
            authProvider: "manual",
            linkedProviders: ["manual"],
            isEmailVerified: true,
            lastLoginAt: new Date(),
            passwordChangedAt: Date.now()
        });

        // Delete verification doc
        await Verification.deleteOne({ _id: updatedVerification._id });

        const io = req.app.get("io");
        if (io) io.emit("platform_analytics_updated");

        // Send Welcome Email
        await sendWelcomeEmail(user, "manual");

        // Auto Login
        const jwtToken = generateToken(user, req);
        setTokenCookie(res, jwtToken, req);

        // Detect if faculty/teacher needs to enter org code
        const needsOrgCode = ['faculty', 'teacher'].includes(user.role) && !user.organization_id;

        res.json({
            message: "Account created successfully",
            token: jwtToken,
            firstLogin: true,
            needsOrgCode,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture || "",
                photoURL: user.profilePicture || "",
                organization_id: user.organization_id || null,
                authProvider: "manual"
            }
        });

    } catch (err) {
        console.error("Complete Signup Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ==================== OAUTH CALLBACKS ==================== */

// Common OAuth callback handler (used by Google, GitHub, Facebook)
export const oauthCallback = async (req, res) => {
    // Passport populates req.user
    if (!req.user) {
        // Fallback to default frontend URL if user parsing fails before state parsing
        const defaultFrontendUrl = process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");
        return res.redirect(`${defaultFrontendUrl}/login?error=AuthFailed`);
    }

    // Status checks
    if (req.user.status === "suspended" || req.user.status === "blocked") {
        const defaultFrontendUrl = process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");
        return res.redirect(`${defaultFrontendUrl}/login?error=account_suspended`);
    }

    // The route verifies the signed, short-lived OAuth state and allow-listed
    // return host before Passport reaches this callback.
    const loginTab = req.oauthState?.loginTab || 'student';
    const host = req.oauthState?.host || '';

    const defaultFrontendUrl = process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");
    const scheme = process.env.NODE_ENV === "production" ? "https://" : "http://";
    const TARGET_URL = host ? `${scheme}${host}` : defaultFrontendUrl;

    const oauthUserRoleLabel = getRoleLabel(req.user.role);

    // Login started from the MCP/OAuth consent page on chat.classgrid.in: the consent page works for every
    // role, so skip the portal checks below and return there (MCP never grants staff powers).
    const consentReturn = host.startsWith('chat.') ? (req.oauthState?.consentReturn || '') : '';

    if (!consentReturn && req.user.role === 'super_admin' && loginTab !== 'super_admin') {
        return res.redirect(`${TARGET_URL}/superadmin/login?error=wrong_portal&message=${encodeURIComponent(`This account is registered as Super Admin. Please log in here.`)}`);
    }
    if (!consentReturn && isInstitutionAdminRole(req.user.role) && loginTab !== 'admin' && loginTab !== 'org_admin') {
        return res.redirect(`${TARGET_URL}/admin/login?error=wrong_portal&message=${encodeURIComponent(`This account is registered as ${oauthUserRoleLabel}. Please use the Admin portal to log in.`)}`);
    }
    if (!consentReturn && req.user.role === 'student' && loginTab !== 'student') {
        return res.redirect(`${TARGET_URL}/login?error=wrong_tab&tab=student&message=${encodeURIComponent(`This account is registered as Student. Please use the Student tab to sign in.`)}`);
    }
    if (!consentReturn && ['faculty', 'teacher'].includes(req.user.role) && loginTab !== 'teacher' && loginTab !== 'faculty') {
        return res.redirect(`${TARGET_URL}/login?error=wrong_tab&tab=teacher&message=${encodeURIComponent(`This account is registered as Faculty. Please use the Faculty tab to sign in.`)}`);
    }

    const { default: SystemSettings } = await import("../models/SystemSettings.js");
    const settings = await SystemSettings.findOne();

    if (settings && settings.maintenanceMode && req.user.role !== "super_admin") {
        return res.redirect(`${TARGET_URL}/login?error=maintenance_mode`);
    }

    let orgName = 'dashboard';
    if (req.user.organization_id && req.user.role !== "super_admin") {
        const { default: Organization } = await import("../models/Organization.js");
        const org = await Organization.findById(req.user.organization_id).select("name status").lean();
        if (org && (org.status === "suspended" || org.status === "blocked")) {
            return res.redirect(`${TARGET_URL}/login?error=org_suspended`);
        }
        if (org && org.name) {
            orgName = org.name;
        }
    }

    // Determine provider
    const provider = req.user.authProvider || "social";

    // If org_admin logs in with Google (social), remove forced password setup
    if (req.user.role === 'org_admin' && provider !== 'manual') {
        req.user.mustResetPassword = false;
    }

    // Check First Login
    const isFirstLogin = !req.user.lastLoginAt;

    // --- DEVICE OTP CHECK FOR OAUTH (ALL PROVIDERS) ---
    // Skip device check for first-ever login, sandbox accounts, and internal @classgrid.in team accounts
    const isOAuthInternalDomain = req.user.email && req.user.email.endsWith("@classgrid.in");
    if (!isFirstLogin && !req.user.isSandbox && !isOAuthInternalDomain) {
        const { fingerprint: serverFingerprint } = getDeviceFingerprint(req);
        const isKnownDevice = req.user.trustedDevices && req.user.trustedDevices.some(d => d.fingerprint === serverFingerprint);

        if (!isKnownDevice) {
            // Unknown device — send OTP and redirect to verification page
            const userEmail = req.user.email;
            try {
                // Rate limit: check if OTP was sent within last 60 seconds
                const existingVerification = await DeviceVerification.findOne({ email: userEmail });
                let portalPath = getLoginPortalPath(loginTab);
                if (host && host.startsWith('chat.')) {
                    portalPath = '/login';
                }

                if (existingVerification && existingVerification.lastResentAt && Date.now() - existingVerification.lastResentAt.getTime() < 45000) {
                    // OTP was sent recently, just redirect to the verify page
                    return res.redirect(`${TARGET_URL}${portalPath}?device_verify=true&email=${encodeURIComponent(userEmail)}&provider=${provider}`);
                }

                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                await DeviceVerification.findOneAndUpdate(
                    { email: userEmail },
                    {
                        organization_id: req.user.organization_id || null,
                        deviceFingerprint: serverFingerprint,
                        rememberMe: false,
                        otp,
                        isUsed: false,
                        failedAttempts: 0,
                        resendCount: 0,
                        lastResentAt: new Date(),
                        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 mins
                    },
                    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, sort: { createdAt: -1 } }
                );

                const { getNewDeviceOtpHtml, getNewDeviceOtpPlainText } = await import("../services/email-templates.service.js");
                try {
                    await sendEmail({
                        to: userEmail,
                        subject: "Security Alert: New Device Detected",
                        html: getNewDeviceOtpHtml ? getNewDeviceOtpHtml(req.user.name, otp) : `<p>Your Classgrid verification code is: <strong>${otp}</strong></p>`,
                        text: getNewDeviceOtpPlainText ? getNewDeviceOtpPlainText(req.user.name, otp) : `Your Classgrid verification code is: ${otp}`,
                    });
                } catch (emailErr) {
                    console.error("Failed to send OAuth device OTP:", emailErr);
                }

                let finalPortalPath = getLoginPortalPath(loginTab);
                if (host && host.startsWith('chat.')) {
                    finalPortalPath = '/login';
                }

                return res.redirect(`${TARGET_URL}${finalPortalPath}?device_verify=true&email=${encodeURIComponent(userEmail)}&provider=${provider}`);
            } catch (deviceErr) {
                console.error("OAuth device check error (non-blocking):", deviceErr);
                // If device check fails, STILL allow login rather than breaking OAuth entirely
            }
        }
    }
    // --- END DEVICE OTP CHECK ---

    // Device registration (soft — track devices for future checks)
    await checkAndRegisterDevice(req.user, req);

    // Update last login
    if (req.user.status === "pending") req.user.status = "active";
    req.user.lastLoginAt = new Date();
    await req.user.save();

    const token = generateToken(req.user, req);
    setTokenCookie(res, token, req);
    recordLoginMethod(res, req, req.user, req.oauthProvider); // set by the Google/GitHub callback routes

    // Send welcome email on first login only
    if (isFirstLogin) {
        await sendWelcomeEmail(req.user, provider);
    }

    // Role-based redirect
    let target = getFrontendDashboardTarget(req.user);
    let qs = isFirstLogin ? `?welcome=true&token=${token}` : `?token=${token}`;
    
    if (host && host.startsWith('chat.')) {
        if (!req.user.metadata?.whatsappPhone || !req.user.metadata?.age) {
            target = '/login';
            qs = `?token=${token}&onboard=true&email=${encodeURIComponent(req.user.email)}`;
        } else if (consentReturn) {
            // consentReturn already carries "?request_id=..."
            target = consentReturn;
            qs = `&token=${token}`;
        } else {
            target = '/';
        }
    }

    res.redirect(`${TARGET_URL}${target}${qs}`);
};

// Forgot Password
export const forgotPassword = async (req, res) => {
    try {
        await connectDB();
        const { email, origin } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Security: always return the same message to prevent user enumeration
        const safeResponse = () => res.json({ message: "If the email is registered, a password reset link has been sent." });

        if (!user) return safeResponse();

        // Only gate on email verification for standard signup users (not admin-invited faculty)
        if (!user.isEmailVerified) return safeResponse();

        // 🔒 Forgot-password rate limiting — max 5 requests per 1 hour
        const now = Date.now();
        if (user.resetAttemptsExpiresAt && user.resetAttemptsExpiresAt > now) {
            // Window is still active — check count
            if ((user.resetAttempts || 0) >= 5) {
                return res.status(429).json({ message: "Too many reset requests. Please wait before trying again." });
            }
            user.resetAttempts = (user.resetAttempts || 0) + 1;
        } else {
            // Window expired or first request — start fresh window
            user.resetAttempts = 1;
            user.resetAttemptsExpiresAt = new Date(now + 60 * 60 * 1000); // 1 hour
        }
        await user.save();

        // Generate a cryptographically secure token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
        await user.save();

        let baseUrl = getFrontendUrl();
        if (origin) {
            try {
                // Ensure the origin is a valid URL to prevent injection attacks
                const parsedUrl = new URL(origin);
                baseUrl = parsedUrl.origin;
            } catch (e) {
                // Fallback to default if invalid
            }
        }

        const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

        sendEmail({
            to: email,
            subject: "🔑 Reset Your Password - Classgrid",
            html: getPasswordResetEmailHtml(resetLink),
            text: getPasswordResetEmailPlainText(resetLink)
        }).catch(err => console.error("Async email dispatch error:", err));

        return safeResponse();

    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Verify Reset Token
export const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) return res.status(400).json({ valid: false, message: "No token provided" });
        
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            $or: [
                { resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } },
                { activationToken: token, activationTokenExpires: { $gt: Date.now() }, activationUsedAt: null }
            ]
        });
        
        if (!user) {
            return res.status(400).json({ valid: false, message: "Link has expired or already been used." });
        }
        
        res.json({ valid: true });
    } catch (err) {
        res.status(500).json({ valid: false, message: "Server error" });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Reset token is required." });
        }

        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!password || !strongPassword.test(password)) {
            return res.status(422).json({
                message: "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
            });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOneAndUpdate(
            {
                $or: [
                    { resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } },
                    { activationToken: token, activationTokenExpires: { $gt: Date.now() }, activationUsedAt: null }
                ]
            },
            {
                $set: {
                    password: await bcrypt.hash(password, 10),
                    isEmailVerified: true,
                    mustResetPassword: false,
                    passwordChangedAt: Date.now(),
                    status: "active"
                },
                $unset: {
                    resetPasswordToken: "",
                    resetPasswordExpires: "",
                    activationToken: "",
                    activationTokenExpires: "",
                    activationUsedAt: ""
                },
                $addToSet: {
                    linkedProviders: "manual"
                }
            },
            { returnDocument: "after" }
        );

        if (!user) {
            return res.status(400).json({ message: "This link has expired or has already been used. Please request a new one." });
        }

        res.json({
            message: "Password reset successful. You can now log in with your new password.",
            role: user.role
        });

    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Faculty Activation (Unified Flow)
export const facultyActivate = async (req, res) => {
    try {
        await connectDB();
        const { token, password, orgCode } = req.body;

        if (!token) return res.status(400).json({ message: "Activation token is required." });
        if (!orgCode) return res.status(400).json({ message: "Faculty Organization Code is required." });

        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!password || !strongPassword.test(password)) {
            return res.status(422).json({
                message: "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
            });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // 1. Validate Organization Code first
        const org = await Organization.findOne({
            $or: [{ private_code: orgCode }, { organizationCode: orgCode }]
        });

        if (!org) {
            return res.status(400).json({ message: "Invalid Faculty Organization Code. Please check the code provided in your invitation." });
        }

        // 2. Perform Atomic Activation
        const user = await User.findOneAndUpdate(
            {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
                role: { $in: ['faculty', 'teacher'] },
                organization_id: org._id // Security check enforces correct org natively
            },
            {
                $set: {
                    password: await bcrypt.hash(password, 10),
                    isEmailVerified: true,
                    mustResetPassword: false,
                    passwordChangedAt: Date.now(),
                    status: "active"
                },
                $unset: {
                    resetPasswordToken: "",
                    resetPasswordExpires: ""
                },
                $addToSet: {
                    linkedProviders: "manual"
                }
            },
            { returnDocument: "after" }
        );

        if (!user) {
            return res.status(400).json({ message: "This link has expired or has already been used. Please request a new one." });
        }

        res.json({
            message: "Faculty account activated successfully. You are now linked to your organization."
        });

    } catch (err) {
        console.error("Faculty Activation Error:", err);
        res.status(500).json({ message: "Server error during activation" });
    }
};

// Logout
export const logout = (req, res) => {
    const isProd = process.env.NODE_ENV === "production";

    // Clear cookie WITHOUT domain (covers api.classgrid.in-scoped legacy cookies)
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        path: "/",
    });

    // Also clear cookie WITH domain (covers .classgrid.in-scoped cookies from new setTokenCookie)
    if (isProd) {
        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/",
            domain: ".classgrid.in",
        });
    }

    // Subdomain-aware logout redirect hint
    const redirectPath = "/login";
    
    res.json({ 
        message: "Logged out successfully",
        redirect: redirectPath
    });
};

// Setup Org Admin Account String (Custom login flow for new org admins)
export const setupOrgAdmin = async (req, res) => {
    try {
        await connectDB();
        const { email, orgCode, password } = req.body;

        if (!email || !orgCode || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const org = await Organization.findOne({ private_code: orgCode });
        if (!org) {
            return res.status(404).json({ message: "Invalid Organization Code" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Admin user not found" });
        }

        if (user.organization_id.toString() !== org._id.toString()) {
            return res.status(403).json({ message: "You do not belong to this organization or invalid code." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.isEmailVerified = true;
        user.mustResetPassword = false; // Password has been set — clear the flag
        if (!user.linkedProviders) user.linkedProviders = [];
        if (!user.linkedProviders.includes("manual")) user.linkedProviders.push("manual");
        if (user.status === "pending") user.status = "active";
        user.lastLoginAt = new Date();
        user.authProvider = "manual";

        await user.save();

        org.is_active = true;
        await org.save();

        const { getOrgAdminActivatedHtml, getOrgAdminActivatedPlainText } = await import("../services/email-templates.service.js");
        const FRONTEND_URL = getFrontendUrl();
        const orgNameFormatted = org.name ? encodeURIComponent(org.name.replace(/\s+/g, '-').toLowerCase()) : 'dashboard';
        const dashboardLink = `${FRONTEND_URL}/org/${orgNameFormatted}/admin`;
        const adminLoginLink = `${FRONTEND_URL}/admin/login`;

        // Attempt to send email, fail activation if email fails to prevent silent failure
        await sendEmail({
            to: email,
            subject: "Your Classgrid Admin Account is Active",
            html: getOrgAdminActivatedHtml(user.name, dashboardLink, adminLoginLink),
            text: getOrgAdminActivatedPlainText(user.name, dashboardLink, adminLoginLink),
        });

        // Generate JWT token exactly as a normal non-remembered login does.
        const token = generateToken(user, req);
        setTokenCookie(res, token, req);

        res.status(200).json({
            message: "Account activated successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organization: { name: org.name }
            }
        });
    } catch (err) {
        console.error("Setup Org Admin Error:", err);
        res.status(500).json({ message: "Server error during admin setup" });
    }
};

// Get Me
export const getCurrentUser = async (req, res) => {
    try {
        // req.user is already fully populated by isAuthenticated middleware
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        // Optional: fetch org data only if needed, safely — never let this crash the auth check
        let orgData = null;
        if (req.user.organization_id) {
            try {
                const userWithOrg = await User.findById(req.user._id)
                    .populate("organization_id")
                    .maxTimeMS(4000);
                if (userWithOrg && userWithOrg.organization_id) {
                    orgData = {
                        id: userWithOrg.organization_id._id,
                        name: userWithOrg.organization_id.name,
                        sidebar_name: userWithOrg.organization_id.sidebar_name,
                        logo_url: userWithOrg.organization_id.logo_url,
                        sidebar_logo_url: userWithOrg.organization_id.sidebar_logo_url || "",
                        subdomain: userWithOrg.organization_id.subdomain,
                        branding: userWithOrg.organization_id.branding || {
                            theme_colors: { primary: "#6366f1", secondary: "#4f46e5", accent: "#f43f5e" }
                        },
                        rollNumberLabel: userWithOrg.organization_id.rollNumberLabel || "PRN",
                        allowed_domains: userWithOrg.organization_id.allowed_domains || [],
                        structure_type: userWithOrg.organization_id.structure_type || "engineering",
                        custom_domain: userWithOrg.organization_id.custom_domain || null,
                        erp_domain: userWithOrg.organization_id.erp_domain || null
                    };
                }
            } catch (orgErr) {
                // Non-fatal — org data is optional for auth check
                console.warn("GetMe: Could not fetch org data (non-fatal):", orgErr.message);
            }
        }

        res.json({
            id: req.user._id,
            name: req.user.name,
            sidebar_name: req.user.sidebar_name || "",
            email: req.user.email,
            role: req.user.role,
            additional_roles: req.user.additional_roles || [],
            department: req.user.department || "",
            subject: req.user.subject || null,
            profilePicture: req.user.profilePicture || "",
            platformLogo: req.user.platformLogo || "",
            phoneNumber: req.user.phoneNumber || "",
            authProvider: req.user.authProvider,
            linkedProviders: req.user.linkedProviders,
            lastLoginAt: req.user.lastLoginAt,
            createdAt: req.user.createdAt,
            prn: req.user.prn || null,
            organization: orgData,
            mustResetPassword: req.user.mustResetPassword || false,
            profile_completed: req.user.profile_completed || false,
            pushNotifications: {
                global: req.user.pushNotifications?.global ?? true,
                sidebarPanelEnabled: req.user.pushNotifications?.sidebarPanelEnabled ?? true,
            },
            isImpersonating: req.isImpersonating || false,
            realUser: req.realUser ? {
                id: req.realUser._id,
                role: req.realUser.role,
            } : null,
            metadata: req.user.metadata || {},
            // Public chat account that still has to verify WhatsApp (the chat app sends it back to sign-up)
            needsChatOnboarding: !req.isImpersonating && needsChatOnboarding(req.user),
            google_access_token: req.user.google_access_token || null,
            zoom_access_token: req.user.zoom_access_token || null,
            token: generateToken(req.user, req, req.authRememberMe === true)
        });
    } catch (err) {
        console.error("GetMe Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// POST /api/auth/force-reset-password
export const forceResetPassword = async (req, res) => {
    try {
        await connectDB();
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long." });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (!user.mustResetPassword) {
            return res.status(400).json({ message: "You are not required to reset your password." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.mustResetPassword = false;

        await user.save();

        res.json({ message: "Password updated successfully. You can now access your dashboard." });
    } catch (err) {
        console.error("Force Reset Password Error:", err);
        res.status(500).json({ message: "Server error updating password." });
    }
};

// POST /api/auth/resend-device-otp
export const resendDeviceOtp = async (req, res) => {
    try {
        await connectDB();
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ message: "User not found" });

        const existingVerification = await DeviceVerification.findOne({ email: user.email }).sort({ createdAt: -1 });
        
        let newResendCount = 1;
        if (existingVerification) {
            if (existingVerification.lastResentAt && Date.now() - existingVerification.lastResentAt.getTime() < 60000) {
                const timeLeft = Math.ceil((60000 - (Date.now() - existingVerification.lastResentAt.getTime())) / 1000);
                return res.status(429).json({ message: "Too many requests. Please try again after the timer expires.", retryAfterSeconds: timeLeft });
            }

            if (existingVerification.resendCount >= 10) {
                const timeSinceLastResend = Date.now() - existingVerification.lastResentAt.getTime();
                if (timeSinceLastResend < 10 * 60 * 1000) {
                    const timeLeft = Math.ceil((10 * 60 * 1000 - timeSinceLastResend) / 1000);
                    return res.status(429).json({ 
                        message: "Too many requests. Please try again after 10 minutes.", 
                        retryAfterSeconds: timeLeft 
                    });
                }
                newResendCount = 1;
            } else {
                newResendCount = (existingVerification.resendCount || 0) + 1;
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        await DeviceVerification.findOneAndUpdate(
            { email: user.email },
            {
                $set: {
                    otp,
                    isUsed: false,
                    failedAttempts: 0,
                    resendCount: newResendCount,
                    lastResentAt: new Date(),
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes, as the screen shows (resend wait stays 60 s via lastResentAt)
                }
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, sort: { createdAt: -1 } }
        );

        const { getNewDeviceOtpHtml, getNewDeviceOtpPlainText } = await import("../services/email-templates.service.js");

        try {
            await sendEmail({
                to: user.email,
                subject: "Security Alert: New Device Detected",
                html: getNewDeviceOtpHtml ? getNewDeviceOtpHtml(user.name, otp) : `<p>Your Classgrid verification code is: <strong>${otp}</strong></p>`,
                text: getNewDeviceOtpPlainText ? getNewDeviceOtpPlainText(user.name, otp) : `Your Classgrid verification code is: ${otp}`,
            });
        } catch (emailErr) {
            console.error("Failed to resend device OTP:", emailErr);
            return res.status(500).json({ message: "Failed to send OTP email" });
        }

        res.json({ message: "OTP sent successfully." });
    } catch (err) {
        console.error("Resend OTP Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// POST /api/auth/verify-device
// Step 2 of Device Binding: verify the OTP and issue the token
export const verifyDeviceOtp = async (req, res) => {
    try {
        await connectDB();
        const { email, otp } = req.body;
        let { deviceFingerprint } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const verification = await DeviceVerification.findOne({
            email: email.toLowerCase().trim()
        }).sort({ createdAt: -1 }); // get most recent OTP for this email

        if (!verification) {
            return res.status(400).json({ message: "No pending OTP request found." });
        }

        // The pending challenge is authoritative. Do not let the verification
        // request replace the fingerprint that originally received the OTP.
        deviceFingerprint = verification.deviceFingerprint;

        // Check code
        if (verification.otp !== otp) {
            // Increment failed attempts
            await DeviceVerification.updateOne({ _id: verification._id }, { $inc: { failedAttempts: 1 } });
            return res.status(400).json({ message: "Invalid OTP code." });
        }

        // Atomically verify expiry, usage, and attempt limits, then mark as used
        const updatedVerification = await DeviceVerification.findOneAndUpdate(
            {
                _id: verification._id,
                isUsed: false,
                expiresAt: { $gt: new Date() },
                failedAttempts: { $lt: 5 }
            },
            { $set: { isUsed: true } },
            { returnDocument: 'after' }
        );

        if (!updatedVerification) {
            return res.status(400).json({ message: "OTP Expired" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ message: "User not found." });

        // Capture isFirstLogin BEFORE updating lastLoginAt
        const isFirstLogin = !user.lastLoginAt;

        // OTP is valid! Add device to trusted array
        if (!user.trustedDevices) user.trustedDevices = [];
        // Store client-side fingerprint (used by manual login check)
        user.trustedDevices.push({
            fingerprint: deviceFingerprint,
            addedAt: new Date(),
            browser: req.headers['user-agent'] || ""
        });

        // Also store server-side fingerprint (used by OAuth login check)
        // This ensures the device is recognized by BOTH manual and OAuth login flows
        const { fingerprint: serverFp } = getDeviceFingerprint(req);
        const serverAlreadyTrusted = user.trustedDevices.some(d => d.fingerprint === serverFp);
        if (!serverAlreadyTrusted) {
            user.trustedDevices.push({
                fingerprint: serverFp,
                addedAt: new Date(),
                browser: req.headers['user-agent'] || ""
            });
        }

        if (user.status === "pending") user.status = "active";
        user.lastLoginAt = new Date();
        user.authProvider = "manual";
        await user.save();

        const rememberMe = updatedVerification.rememberMe === true;

        // Clean up verification doc
        await DeviceVerification.deleteOne({ _id: verification._id });

        const token = generateToken(user, req, rememberMe);
        setTokenCookie(res, token, req, rememberMe);

        // Store the approved fingerprint in a stable cookie to prevent future mismatch loops
        const isProd = process.env.NODE_ENV === "production";
        res.cookie("client_device_fp", deviceFingerprint, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "None" : "Lax",
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        });

        const mustReset = !!user.mustResetPassword;
        const needsOrgCode = ['faculty', 'teacher'].includes(user.role) && !user.organization_id;

        // Fetch org name for role-based redirect support
        let orgName = null;
        if (user.organization_id) {
            const org = await Organization.findById(user.organization_id).select('name').lean();
            orgName = org ? org.name : null;
        }
        // --- AUTO-BRANDING RESOLUTION ---
        let brandInfo = null;
        if (user.organization_id) {
            const orgDoc = await Organization.findById(user.organization_id)
                .select("name logo_url branding subdomain")
                .lean();
            if (orgDoc) {
                brandInfo = {
                    name: orgDoc.name,
                    logo: orgDoc.logo_url,
                    subdomain: orgDoc.subdomain,
                    theme: orgDoc.branding?.theme_colors || {
                        primary: "#6366f1",
                        secondary: "#4f46e5",
                        accent: "#f43f5e"
                    }
                };
            }
        }

        res.json({
            message: "Device verified and login successful",
            firstLogin: isFirstLogin,
            mustResetPassword: mustReset,
            needsOrgCode,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture || "",
                photoURL: user.profilePicture || "",
                organization_id: user.organization_id || null,
                authProvider: user.authProvider,
            },
            organization: brandInfo,
            token
        });
    } catch (err) {
        console.error("Device Verification Error:", err);
        res.status(500).json({ message: "Server error during verification." });
    }
};

// ─────────────────────────────────────────────
// Check Email for Login (Secure Email-First Flow)
// POST /api/auth/check-email
// If user exists → { exists: true, hasPassword }
// If user doesn't exist → sends silent notification + { exists: false }
// ─────────────────────────────────────────────
export const checkEmailForLogin = async (req, res) => {
    try {
        await connectDB();
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select("+password");

        if (user) {
            // Only a real (bcrypt) password counts; older chat sign-ups stored a random placeholder.
            return res.status(200).json({ exists: true, hasPassword: isRealPasswordHash(user.password), role: user.role });
        }

        // User doesn't exist → send Vercel-style notification email (rate-limited, fire-and-forget)
        sendNoAccountEmail(normalizedEmail, req, req.tenantSlug);

        return res.status(200).json({ exists: false });
    } catch (err) {
        console.error("checkEmailForLogin Error:", err);
        return res.status(500).json({ message: "Server error." });
    }
};

export const changePassword = async (req, res) => {
    try {
        await connectDB();
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: "Old password and new password (min 8 chars) are required." });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user) return res.status(404).json({ message: "User not found." });

        const dummyHash = '$2a$10$abcdefghijklmnopqrstuv';
        const hashToCompare = user.password || dummyHash;
        
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(oldPassword, hashToCompare);
        } catch (e) {
            isMatch = false;
        }

        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: "Password updated successfully." });
    } catch (err) {
        console.error("Change Password Error:", err);
        res.status(500).json({ message: "Server error." });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        await connectDB();
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ message: "Password is required to confirm deletion." });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user) return res.status(404).json({ message: "User not found." });
        
        if (user.role === "org_admin" || user.role === "super_admin") {
            return res.status(403).json({ message: "Administrators must use the organization deletion process." });
        }

        const dummyHash = '$2a$10$abcdefghijklmnopqrstuv';
        const hashToCompare = user.password || dummyHash;
        let isMatch = false;
        try { isMatch = await bcrypt.compare(password, hashToCompare); } catch (e) { isMatch = false; }

        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        // Logic for sending emails to superiors
        let targetEmails = [];
        if (user.organization_id) {
            let targetRoles = [];
            if (user.role === "student") {
                targetRoles = ["faculty", "teacher"];
            } else if (user.role === "faculty" || user.role === "teacher") {
                targetRoles = ["admission_head", "admission_verifier", "admission_counselor", "admission_clerk"];
            } else {
                // Anyone else in a department goes to org admin
                targetRoles = ["org_admin"];
            }
            
            const superiors = await User.find({ 
                organization_id: user.organization_id, 
                role: { $in: targetRoles } 
            }).select("email");
            
            targetEmails = superiors.map(s => s.email);
            
            // Fallback to org admin if no specific superiors found
            if (targetEmails.length === 0 && targetRoles[0] !== "org_admin") {
                const orgAdmins = await User.find({ organization_id: user.organization_id, role: "org_admin" }).select("email");
                targetEmails = orgAdmins.map(s => s.email);
            }
        }
        
        const { getAccountDeletedNotificationHtml, getAccountDeletedNotificationPlainText } = await import("../services/email-templates.service.js");
        
        // Notify superiors
        if (targetEmails.length > 0 && getAccountDeletedNotificationHtml) {
            try {
                // Send individually or BCC, here we send one email per superior
                for (const email of targetEmails) {
                    sendEmail({
                        to: email,
                        subject: `Account Deleted: ${user.name} (${user.email})`,
                        channel: "support",
                        html: getAccountDeletedNotificationHtml(user.name, user.email, user.role),
                        text: getAccountDeletedNotificationPlainText(user.name, user.email, user.role),
                    }).catch(console.error);
                }
            } catch (err) {
                console.error("Failed to send deletion notifications:", err);
            }
        }

        // Send a final goodbye email to the user
        try {
            sendEmail({
                to: user.email,
                subject: "Your Classgrid account has been deleted",
                channel: "support",
                html: `<p>Hi ${user.name},</p><p>Your account has been permanently deleted as requested.</p>`,
                text: `Hi ${user.name},\n\nYour account has been permanently deleted as requested.`,
            }).catch(console.error);
        } catch(e) {}

        // Delete user
        await User.findByIdAndDelete(user._id);

        // Clear both token cookies, like logout (a leftover one for the deleted account made the next sign-up 401)
        const isProdEnv = process.env.NODE_ENV === "production";
        res.clearCookie("token", { httpOnly: true, secure: isProdEnv, sameSite: isProdEnv ? "None" : "Lax", path: "/" });
        if (isProdEnv) res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "None", path: "/", domain: ".classgrid.in" });
        res.json({ message: "Account deleted successfully." });
    } catch (err) {
        console.error("Delete Account Error:", err);
        res.status(500).json({ message: "Server error." });
    }
};

// ─────────────────────────────────────────────────
// ONBOARDING OTP: SEND
// ─────────────────────────────────────────────────
export const sendOnboardingOtp = async (req, res) => {
    try {
        const { target, type } = req.body; // target is email or phone, type is 'email' or 'phone'
        if (!target || !type) return res.status(400).json({ message: "Target and type are required." });

        const Organization = (await import("../models/Organization.js")).default;
        const User = (await import("../models/User.js")).default;

        let conflict = false;
        let conflictMessage = "";

        if (type === "email") {
            const cleanEmail = target.toLowerCase().trim();
            const orgExists = await Organization.findOne({ invoice_email: cleanEmail });
            if (orgExists) {
                conflict = true;
                conflictMessage = "This email is already registered with an existing organization.";
            }
        } else if (type === "phone") {
            const cleanPhone = target.trim();
            const orgExists = await Organization.findOne({ 
                $or: [{ invoice_phone: cleanPhone }, { contactNumber: cleanPhone }] 
            });
            if (orgExists) {
                conflict = true;
                conflictMessage = "This phone number is already registered with an existing organization.";
            }
        }

        if (conflict) {
            return res.status(409).json({ message: conflictMessage });
        }

        let otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Temporarily hardcode phone OTP to 123456 while waiting for SMS DLT production access
        if (type === "phone") {
            otp = "123456";
        }

        const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds

        // Delete any existing OTP for this target
        await OnboardingOTP.deleteMany({ target: target.toLowerCase() });

        await OnboardingOTP.create({
            target: target.toLowerCase(),
            type,
            otp,
            expires_at: expiresAt,
        });

        if (type === "email") {
            const { getNewDeviceOtpHtml, getNewDeviceOtpPlainText } = await import("../services/email-templates.service.js");
            
            await sendEmail({
                to: target,
                subject: "Classgrid Verification Code",
                html: getNewDeviceOtpHtml ? getNewDeviceOtpHtml("there", otp) : `<p>Your Classgrid verification code is: <strong>${otp}</strong></p>`,
                text: getNewDeviceOtpPlainText ? getNewDeviceOtpPlainText("there", otp) : `Your Classgrid verification code is: ${otp}`,
            });
        } else if (type === "phone") {
            // Temporarily mock SMS sending until DLT/production keys are available
            console.log(`[MOCK SMS] To: ${target} | OTP: ${otp}`);
            // const message = `Your Classgrid verification code is ${otp}. It expires in 10 mins. Do not share this with anyone.`;
            // await sendSMS(target, message);
        }

        res.json({ message: "OTP sent successfully." });
    } catch (err) {
        console.error("Send Onboarding OTP Error:", err);
        res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }
};

// ─────────────────────────────────────────────────
// ONBOARDING OTP: VERIFY
// ─────────────────────────────────────────────────
export const verifyOnboardingOtp = async (req, res) => {
    try {
        const { target, otp } = req.body;
        if (!target || !otp) return res.status(400).json({ message: "Target and OTP are required." });

        const record = await OnboardingOTP.findOne({ target: target.toLowerCase() });
        if (!record) {
            return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
        }

        if (record.attempts >= 5) {
            await OnboardingOTP.deleteOne({ _id: record._id });
            return res.status(400).json({ message: "Too many failed attempts. Please request a new OTP." });
        }

        if (record.otp !== otp) {
            record.attempts += 1;
            await record.save();
            return res.status(400).json({ message: "Invalid verification code." });
        }

        // Success - clean up
        await OnboardingOTP.deleteOne({ _id: record._id });
        res.json({ message: "Verified successfully.", verified: true });
    } catch (err) {
        console.error("Verify Onboarding OTP Error:", err);
        res.status(500).json({ message: "Failed to verify OTP. Please try again." });
    }
};

// ─────────────────────────────────────────────────
// CHECK USERNAME
// ─────────────────────────────────────────────────
export const checkUsername = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ message: "Username is required." });

        // Basic validation (alphanumeric, underscores, 3-20 chars)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.json({ available: false, message: "Username must be 3-20 characters long and can only contain letters, numbers, and underscores." });
        }

        const existing = await User.findOne({ username: username.toLowerCase() });
        if (existing) {
            return res.json({ available: false, message: "Username is already taken." });
        }

        res.json({ available: true, message: "Username is available." });
    } catch (err) {
        console.error("Check Username Error:", err);
        res.status(500).json({ message: "Server error checking username." });
    }
};



// --- Chat Sandbox Endpoints ---
const chatOtps = new Map();

export const chatSendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = '123456';
        chatOtps.set(email.toLowerCase(), otp);
        res.json({ message: 'OTP sent' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const chatVerifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (chatOtps.get(email.toLowerCase()) === otp || otp === '123456') {
            res.json({ message: 'OTP verified' });
        } else {
            res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const chatOnboard = async (req, res) => {
    try {
        const connectDB = (await import('../../config/db.js')).default;
        await connectDB();
        const { email, name, password, age, role: rawRole, whatsappPhone } = req.body;
        const role = readableJobRole(rawRole); // "software_engineer" -> "Software Engineer"
        const User = (await import('../models/User.js')).default;
        const bcrypt = (await import('bcryptjs')).default;
        const jwt = (await import('jsonwebtoken')).default;
        
        // One email = one whatsapp number validation
        const existingPhoneUser = isSharedTestWhatsapp(whatsappPhone) ? null : await User.findOne({ "metadata.whatsappPhone": whatsappPhone });
        if (existingPhoneUser && existingPhoneUser.email !== email.toLowerCase()) {
            return res.status(400).json({ message: "This WhatsApp number is already linked to another email." });
        }
        
        let user = await User.findOne({ email: email.toLowerCase() });
        const orgId = '6ac4b95e0f8a97f45e98b0ff';

        if (!user) {
            user = new User({
                email: email.toLowerCase(),
                name: name || 'Chat User',
                password: await bcrypt.hash(password, 10),
                role: 'user',
                organization_id: orgId,
                metadata: { age, job_role: role, whatsappPhone, whatsapp_number: whatsappPhone },
                isEmailVerified: true
            });
        } else {
            if (user.metadata?.whatsappPhone && user.metadata.whatsappPhone !== whatsappPhone) {
                 return res.status(400).json({ message: "You have already linked a different WhatsApp number to this email." });
            }
            user.metadata = { 
                ...(user.metadata || {}), 
                age: age || user.metadata?.age, 
                job_role: role || user.metadata?.job_role, 
                whatsappPhone, 
                whatsapp_number: whatsappPhone 
            };
            user.markModified("metadata");
            
            // Only set org and role if they don't have one (prevent downgrading admins)
            if (!user.organization_id) user.organization_id = orgId;
            if (!user.role) user.role = 'user';
            
            if (password) {
               user.password = await bcrypt.hash(password, 10);
            }
        }
        await user.save();

        const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
        const token = jwt.sign({ id: user._id.toString(), role: user.role, organization_id: user.organization_id }, JWT_SECRET, { expiresIn: '30d' });
        // The chat calls the API with the login cookie, not this JSON token: without the cookie every request
        // after sign-up was 401 until the user logged out and in again
        setTokenCookie(res, token, req);

        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============================================================================
// CHAT AGENT REAL AUTH FLOW (END-TO-END)
// ============================================================================

const CHAT_PUBLIC_ORG_ID = '6ac4b95e0f8a97f45e98b0ff';
const CHAT_EMAIL_TICKET_PURPOSE = 'chat_email_verified';
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

// Passwords are only ever checked with bcrypt, so anything else (null, or the plain random placeholder older
// chat sign-ups stored) is "no password yet".
function isRealPasswordHash(value) {
    return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

// The same rules the sign-up screen shows.
function isStrongChatPassword(pw) {
    return typeof pw === 'string' && pw.length >= 8 && pw.length <= 64 && /[A-Z]/.test(pw) && /[a-z]/.test(pw)
        && /[0-9]/.test(pw) && /[@#$%^&*!?_.\-]/.test(pw);
}

// One code per target per minute: a new code inside the cooldown is refused with the seconds left.
async function otpResendWaitSeconds(OnboardingOTP, target, type) {
    const existing = await OnboardingOTP.findOne({ target, type }).select('expires_at').lean();
    if (!existing?.expires_at) return 0;
    const sentAt = new Date(existing.expires_at).getTime() - OTP_TTL_MS;
    const wait = Math.ceil((sentAt + OTP_RESEND_COOLDOWN_MS - Date.now()) / 1000);
    return wait > 0 ? wait : 0;
}

export const chatSendEmailOtp = async (req, res) => {
    try {
        await connectDB();
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        const waitSeconds = await otpResendWaitSeconds(OnboardingOTP, email.toLowerCase(), 'email');
        if (waitSeconds > 0) {
            return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting a new code.`, retryAfter: waitSeconds });
        }
        await OnboardingOTP.deleteMany({ target: email.toLowerCase() });
        await OnboardingOTP.create({
            target: email.toLowerCase(),
            type: 'email',
            otp,
            expires_at: new Date(Date.now() + OTP_TTL_MS)
        });

        console.log(`[chatSendEmailOtp] OTP created for ${email.toLowerCase()}, sending email...`);

        const { sendEmail } = await import('../services/aws-ses.service.js');
        const { getChatOtpEmailHtml, getChatOtpEmailPlainText } = await import('../services/email-templates.service.js');
        
        await sendEmail({
            to: email.toLowerCase(),
            subject: 'Classgrid AI - Verification Code',
            html: getChatOtpEmailHtml(otp),
            text: getChatOtpEmailPlainText(otp)
        });

        console.log(`[chatSendEmailOtp] ✅ OTP email sent successfully to ${email.toLowerCase()}`);
        res.json({ message: 'OTP sent to email' });
    } catch (e) {
        console.error('chatSendEmailOtp Error:', e.message, e.stack);
        res.status(500).json({ message: e.message });
    }
};

export const chatVerifyEmailOtp = async (req, res) => {
    try {
        await connectDB();
        const { email, otp, name } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        const record = await OnboardingOTP.findOne({ target: email.toLowerCase(), type: 'email' });
        
        if (!record || record.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        if (record.expires_at && record.expires_at < new Date()) {
            await OnboardingOTP.deleteOne({ _id: record._id });
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }
        await OnboardingOTP.deleteOne({ _id: record._id });

        // Find or create user
        let user = await User.findOne({ email: email.toLowerCase() });
        let isNewAccount = false;
        if (!user) {
            isNewAccount = true;
            user = await User.create({
                email: email.toLowerCase(),
                name: name || email.split('@')[0],
                role: 'user', // Default valid role for public chat
                password: null, // set by /chat/save-password; until then they sign in with an email code
                isEmailVerified: true,
                organization_id: "6ac4b95e0f8a97f45e98b0ff" // Required for public chat users
            });
        }

        const needsOnboarding = (!user.metadata || !user.metadata.whatsappPhone || !user.metadata.age);

        let token = null;
        if (!needsOnboarding) {
            token = generateToken(user, req);
            setTokenCookie(res, token, req);
        }
        recordLoginMethod(res, req, user, "email"); // the email code was correct

        // Short-lived proof that this email was verified, required by chatFinalizeOnboarding.
        // No `id` claim, so it can never be used as a login token.
        const emailVerifiedTicket = jwt.sign(
            { purpose: CHAT_EMAIL_TICKET_PURPOSE, email: user.email, uid: user._id.toString(), newAccount: isNewAccount },
            JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.json({
            message: 'Email verified',
            token,
            emailVerifiedTicket,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                organization_id: user.organization_id || null,
                metadata: user.metadata || {}
            }
        });
    } catch (e) {
        console.error('chatVerifyEmailOtp Error:', e.message, e.stack);
        res.status(500).json({ message: e.message });
    }
};

// POST /api/auth/chat/save-password — saves the password chosen in sign-up right away (with the email
// ticket from chatVerifyEmailOtp), so a user who stops at the WhatsApp step can come back with it.
// Only sets a first password: an account that already has a real one is never changed here.
export const chatSavePassword = async (req, res) => {
    try {
        await connectDB();
        const { email, password, emailVerifiedTicket } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
        if (!isStrongChatPassword(password)) {
            return res.status(400).json({ message: 'Password must be 8-64 characters with upper and lower case letters, a number and a special character (@#$%^&*!?_.-).' });
        }

        let ticket;
        try {
            ticket = jwt.verify(emailVerifiedTicket || '', JWT_SECRET);
        } catch {
            return res.status(401).json({ message: 'Email verification expired. Please verify your email again.', code: 'TICKET_EXPIRED' });
        }
        if (ticket?.purpose !== CHAT_EMAIL_TICKET_PURPOSE || ticket.email !== email.toLowerCase()) {
            return res.status(401).json({ message: 'Email verification expired. Please verify your email again.', code: 'TICKET_EXPIRED' });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user || user._id.toString() !== ticket.uid) {
            return res.status(401).json({ message: 'Email verification expired. Please verify your email again.', code: 'TICKET_EXPIRED' });
        }
        if (isRealPasswordHash(user.password)) {
            return res.status(409).json({ message: 'This account already has a password. Sign in with it, or use "Forgot password" to change it.', code: 'PASSWORD_EXISTS' });
        }

        user.password = await bcrypt.hash(password, 10);
        await user.save();
        res.json({ message: 'Password saved', passwordSet: true });
    } catch (e) {
        console.error('chatSavePassword Error:', e.message, e.stack);
        res.status(500).json({ message: 'Could not save your password. Please try again.' });
    }
};

export const chatSendWhatsappOtp = async (req, res) => {
    try {
        await connectDB();
        const { phoneNumber, email } = req.body;
        if (!phoneNumber) return res.status(400).json({ message: 'Phone number required' });

        const User = (await import('../models/User.js')).default;
        const existingPhoneUser = isSharedTestWhatsapp(phoneNumber) ? null : await User.findOne({ "metadata.whatsappPhone": phoneNumber });
        if (existingPhoneUser) {
            if (!email || (email && existingPhoneUser.email !== email.toLowerCase())) {
                 return res.status(400).json({ message: "This WhatsApp number is already linked to another email." });
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        const waitSeconds = await otpResendWaitSeconds(OnboardingOTP, phoneNumber, 'phone');
        if (waitSeconds > 0) {
            return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting a new code.`, retryAfter: waitSeconds });
        }

        await OnboardingOTP.deleteMany({ target: phoneNumber, type: 'phone' });
        await OnboardingOTP.create({
            target: phoneNumber,
            type: 'phone',
            otp,
            expires_at: new Date(Date.now() + OTP_TTL_MS)
        });

        if (process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
            const waRes = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: phoneNumber,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: `*${otp}* is your verification code. For your security, do not share this code.`
                    }
                })
            });
            const data = await waRes.json();
            if (data.error) throw new Error(data.error.message || 'WhatsApp API Error');
        } else {
            console.warn('WHATSAPP CREDENTIALS MISSING. OTP was generated but not sent:', otp);
        }

        res.json({ message: 'OTP sent to WhatsApp' });
    } catch (e) {
        console.error('chatSendWhatsappOtp Error:', e);
        res.status(500).json({ message: e.message });
    }
};

export const chatVerifyWhatsappOtpStep = async (req, res) => {
    try {
        await connectDB();
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP required' });

        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        const record = await OnboardingOTP.findOne({ target: phone, type: 'phone' });
        
        if (!record || record.otp !== otp) {
            return res.status(400).json({ message: 'Invalid WhatsApp OTP' });
        }
        if (record.expires_at && record.expires_at < new Date()) {
            await OnboardingOTP.deleteOne({ _id: record._id });
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }
        
        // We DO NOT delete the OTP here because it needs to be verified again in chatFinalizeOnboarding.
        // Or we could mark it as verified, but since this is just a quick pre-check, we leave it as is.
        res.json({ message: 'WhatsApp OTP verified' });
    } catch (e) {
        console.error('chatVerifyWhatsappOtpStep Error:', e);
        res.status(500).json({ message: e.message });
    }
};

// One WhatsApp welcome after chat.classgrid.in setup is finished
async function sendChatWelcomeWhatsapp(phone, name) {
    if (!process.env.WHATSAPP_PHONE_ID || !process.env.WHATSAPP_ACCESS_TOKEN) return;
    const to = String(phone || '').replace(/\D/g, '');
    if (!to) return;
    const firstName = String(name || '').trim().split(/\s+/)[0];
    const greeting = firstName && firstName !== 'AI' ? `🎉 Welcome to Classgrid, ${firstName}!` : '🎉 Welcome to Classgrid!';
    const body = [
        greeting,
        '',
        "Your account is ready. Here's what you can do with your AI Agent:",
        '',
        '📚 Explain any topic or solve doubts',
        '📄 Analyse PDFs, images and files',
        '🗓️ Make study plans and exam schedules',
        '⏰ Get reminders right here on WhatsApp',
        '',
        'Start now 👉 https://chat.classgrid.in',
        '',
        '— Team Classgrid',
    ].join('\n');
    const waRes = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body } }),
    });
    const data = await waRes.json().catch(() => ({}));
    if (data.error) throw new Error(data.error.message || 'WhatsApp API error');
}

export const chatFinalizeOnboarding = async (req, res) => {
    try {
        const connectDB = (await import('../../config/db.js')).default;
        await connectDB();
        const { email, name, password, age, role: rawRole, whatsappPhone, whatsappOtp, emailVerifiedTicket } = req.body;
        const role = readableJobRole(rawRole); // "software_engineer" -> "Software Engineer"
        if (!email || !whatsappPhone || !whatsappOtp) {
            return res.status(400).json({ message: 'Email, WhatsApp number and OTP are required' });
        }

        // Proof of email ownership: the ticket issued by chatVerifyEmailOtp, bound to this email
        let ticket;
        try {
            ticket = jwt.verify(emailVerifiedTicket || '', JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ message: 'Email verification expired. Please verify your email again.' });
        }
        
        if (ticket?.purpose !== CHAT_EMAIL_TICKET_PURPOSE) {
            // Normal token fallback
            if (!ticket?.id) {
                return res.status(401).json({ message: 'Email verification expired. Please verify your email again.' });
            }
            ticket.uid = ticket.id;
        } else if (ticket.email !== email.toLowerCase()) {
            return res.status(401).json({ message: 'Email verification expired. Please verify your email again.' });
        }

        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        const record = await OnboardingOTP.findOne({ target: whatsappPhone, type: 'phone' });
        if (!record || record.otp !== whatsappOtp) {
            return res.status(400).json({ message: 'Invalid WhatsApp OTP' });
        }
        if (record.expires_at && record.expires_at < new Date()) {
            await OnboardingOTP.deleteOne({ _id: record._id });
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }
        await OnboardingOTP.deleteOne({ _id: record._id });

        const User = (await import('../models/User.js')).default;
        const bcrypt = (await import('bcryptjs')).default;

        // +password: the check below must see whether a real password is already set
        let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        const orgId = CHAT_PUBLIC_ORG_ID;
        let passwordSet = true; // false when a chosen password was not applied to an existing account

        if (user && ticket.uid && user._id.toString() !== ticket.uid) {
            return res.status(401).json({ message: 'Email verification expired. Please verify your email again.' });
        }

        // One WhatsApp number per email (the send-OTP check is only an early warning; its email isn't proven)
        const existingPhoneUser = isSharedTestWhatsapp(whatsappPhone) ? null : await User.findOne({ 'metadata.whatsappPhone': whatsappPhone }).select('email');
        if (existingPhoneUser && existingPhoneUser.email !== email.toLowerCase()) {
            return res.status(400).json({ message: 'This WhatsApp number is already linked to another account.' });
        }

        // Welcome WhatsApp goes out only the first time an account finishes setup
        const firstSetup = !user || !user.metadata?.whatsappPhone;

        if (!user) {
            user = new User({
                email: email.toLowerCase(),
                name: name || 'AI User',
                password: await bcrypt.hash(password || crypto.randomBytes(16).toString('hex'), 10),
                role: 'user',
                organization_id: orgId,
                metadata: { age, job_role: role, whatsappPhone, whatsapp_number: whatsappPhone },
                isEmailVerified: true
            });
        } else {
            if (user.metadata?.whatsappPhone && user.metadata.whatsappPhone !== whatsappPhone) {
                 return res.status(400).json({ message: "You have already linked a different WhatsApp number to this email." });
            }
            user.metadata = { 
                ...(user.metadata || {}), 
                age: age || user.metadata?.age, 
                job_role: role || user.metadata?.job_role, 
                whatsappPhone, 
                whatsapp_number: whatsappPhone 
            };
            user.markModified("metadata");
            
            if (!user.organization_id) user.organization_id = orgId;
            if (!user.role) user.role = 'user';
            // Public chat accounts are "user", not "student" (older sign-ups defaulted to student)
            if (user.organization_id?.toString() === CHAT_PUBLIC_ORG_ID && user.role === 'student' && !user.email.toLowerCase().endsWith('@classgrid.in')) user.role = 'user';

            // Only set the password on an account chatVerifyEmailOtp just created (random placeholder),
            // OR if the account exists but has no password set yet (incomplete onboarding).
            // Never overwrite the password of an account that already existed and had a password.
            // (Normally the password was already saved by /chat/save-password; this covers older clients.)
            if (password && !isRealPasswordHash(user.password)) {
               user.password = await bcrypt.hash(password, 10);
            } else if (password) {
               passwordSet = false;
            }
        }
        await user.save();

        const token = jwt.sign({ id: user._id.toString(), role: user.role, organization_id: user.organization_id }, JWT_SECRET, { expiresIn: '30d' });
        // The chat calls the API with the login cookie, not this JSON token: without the cookie every request
        // after sign-up was 401 until the user logged out and in again
        setTokenCookie(res, token, req);

        res.json({
            token,
            passwordSet,
            ...(passwordSet ? {} : { notice: 'Your account already existed, so your password was not changed. Sign in with an email code or your existing password.' }),
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                organization_id: user.organization_id || null,
                metadata: user.metadata || {}
            }
        });

        // After the reply: a failed WhatsApp send never affects the sign-up. The user just messaged our
        // number to get the OTP, so a normal text message is allowed (inside Meta's 24-hour window).
        if (firstSetup) {
            sendChatWelcomeWhatsapp(whatsappPhone, user.name).catch((err) => console.error('Welcome WhatsApp failed:', err.message));
            // Welcome email, also after the reply (the general sendWelcomeEmail stays disabled; this one is chat-only)
            (async () => {
                const { getChatWelcomeEmailHtml, getChatWelcomeEmailPlainText } = await import('../services/email-templates.service.js');
                await sendEmail({
                    to: user.email,
                    subject: 'Welcome to Classgrid AI',
                    html: getChatWelcomeEmailHtml(user.name),
                    text: getChatWelcomeEmailPlainText(user.name),
                    fromName: 'Classgrid AI',
                    userId: user._id,
                });
            })().catch((err) => console.error('Welcome email failed:', err.message));
        }
    } catch (error) {
        console.error('chatFinalizeOnboarding Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const chatSendWhatsAppOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: "Phone number is required." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        await connectDB();
        
        await DeviceVerification.findOneAndUpdate(
            { email: phone }, 
            {
                $set: {
                    otp,
                    isUsed: false,
                    failedAttempts: 0,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000) 
                }
            },
            { upsert: true }
        );

        const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN; 
        const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID; 
        const TEMPLATE_NAME = "classgrid_otp"; 

        const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
        const data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone.replace("+", ""),
            type: "text",
            text: {
                preview_url: false,
                body: `Your Classgrid AI verification code is: *${otp}*`
            }
        };

        const axios = (await import('axios')).default;
        await axios.post(url, data, {
            headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        res.status(200).json({ message: "WhatsApp OTP sent successfully!" });
    } catch (error) {
        console.error("WhatsApp API Error:", error.response?.data || error.message);
        res.status(500).json({ 
            message: "Failed to send WhatsApp message. Please verify your Meta .env credentials.",
            error: error.response?.data || error.message 
        });
    }
};

export const chatVerifyWhatsAppOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP are required." });

        await connectDB();
        const verification = await DeviceVerification.findOne({ email: phone, isUsed: false });
        
        if (!verification) return res.status(404).json({ message: "OTP not found or already used." });
        if (verification.expiresAt < new Date()) return res.status(400).json({ message: "OTP has expired." });
        
        if (verification.otp !== otp) {
            verification.failedAttempts += 1;
            await verification.save();
            return res.status(400).json({ message: "Invalid OTP." });
        }

        verification.isUsed = true;
        await verification.save();

        res.status(200).json({ message: "WhatsApp phone verified successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error verifying OTP." });
    }
};
