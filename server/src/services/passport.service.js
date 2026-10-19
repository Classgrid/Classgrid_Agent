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

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import axios from "axios";
import User from "../models/User.js";
import connectDB from "../../config/db.js";
import { sendNoAccountEmail } from "../controllers/auth.controller.js";
import { GITHUB_CLIENT_ID as GITHUB_PLUGIN_CLIENT_ID, GITHUB_CLIENT_SECRET as GITHUB_PLUGIN_CLIENT_SECRET } from "../routes/auth.github.routes.js";

// chat.classgrid.in sign-in with Google/GitHub and no account: the route redirects to ?error=no_account
function noChatAccountError(email, req) {
    sendNoAccountEmail(email, req, "chat"); // rate-limited, fire-and-forget
    const err = new Error("Account does not exist. Please sign up.");
    err.code = "NO_ACCOUNT";
    err.email = email;
    return err;
}

const getBackendUrl = () => {
    return process.env.BACKEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://api.classgrid.in" : "https://api.classgrid.in");
};

const BACKEND_URL = getBackendUrl();

/**
 * IMPORTANT: Provider Isolation Policy
 * ─────────────────────────────────────
 * Each auth provider is completely separate:
 *   - A GitHub user CANNOT login with Google using the same email
 *   - A Google user CANNOT login with GitHub using the same email
 *   - A Facebook user CANNOT login with Google/GitHub using the same email
 *   - A manual (email/password) user CANNOT login with any OAuth provider
 *   - Each provider creates its OWN user record matched by provider-specific ID
 * 
 * Matching logic:
 *   1. First, try to find user by provider-specific ID (googleId, githubId, facebookId)
 *   2. If not found by ID, check if email exists with a DIFFERENT provider → BLOCK
 *   3. If no user exists → create new user with this provider
 */

const passportConfig = () => {
    // Serialize user
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user
    passport.deserializeUser(async (id, done) => {
        try {
            await connectDB(); // Ensure DB is connected before querying
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // ═══════════════════════════════════════
    // 1. GOOGLE STRATEGY
    // ═══════════════════════════════════════
    if (process.env.GOOGLE_CLIENT_ID) {
        passport.use(
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL: process.env.NODE_ENV === "production"
                        ? "https://api.classgrid.in/api/auth/google/callback"
                        : "http://localhost:3000/api/auth/google/callback",
                    passReqToCallback: true,
                },
                async (req, accessToken, refreshToken, profile, done) => {
                    try {
                        await connectDB(); // Ensure DB ready before any query
                        let reqLoginTab = 'user';
                        let orgSlug = '';
                        if (req.query.state) {
                            try {
                                const stateObj = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf-8'));
                                if (stateObj.t) reqLoginTab = stateObj.t;
                                if (stateObj.h) {
                                    const hostParts = stateObj.h.split('.');
                                    if (hostParts.length >= 3 && !['www', 'app', 'api'].includes(hostParts[0])) {
                                        orgSlug = hostParts[0];
                                    }
                                }
                            } catch(e) {
                                reqLoginTab = req.query.state; // fallback for legacy
                            }
                        }

                        const email = profile.emails[0].value.toLowerCase();

                        // Step 1: Find by googleId OR email (to allow linking)
                        let user = await User.findOne({
                            $or: [{ googleId: profile.id }, { email: email }]
                        });

                        if (user) {
                            console.log("✅ Google: Updating existing user");

                            // Link Google if not already linked
                            if (!user.linkedProviders.includes("google")) {
                                user.linkedProviders.push("google");
                            }

                            // Capture real name from Google if current is a placeholder
                            const lowerName = user.name ? user.name.toLowerCase() : "";
                            const isPlaceholder = !user.name || lowerName.includes("admin") || lowerName.includes("student") || lowerName.includes("faculty") || lowerName.includes("teacher") || lowerName === "user";
                            
                            if (isPlaceholder && profile.displayName) {
                                user.name = profile.displayName;
                            }

                            // Capture profile picture from Google if missing
                            if (!user.profilePicture && profile.photos && profile.photos.length > 0) {
                                user.profilePicture = profile.photos[0].value;
                            }

                            user.googleId = profile.id;
                            if (!user.authProvider) {
                                user.authProvider = "google";
                            }
                            user.isEmailVerified = true;
                            await user.save();
                            return done(null, user);
                        }

                        // Step 2: No user exists → Block login
                        console.log(`🚫 Google: Blocked login for non-existent user: ${email}`);
                        sendNoAccountEmail(email, req, orgSlug); // Fire and forget the email notification
                        return done(new Error("We sent an message to your email"), null);
                    } catch (err) {
                        done(err, null);
                    }
                }
            )
        );
        console.log("✅ GoogleStrategy successfully registered with Passport");

        passport.use(
            'google-chat',
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL: process.env.NODE_ENV === "production"
                        ? "https://api.classgrid.in/api/auth/google/callback"
                        : "http://localhost:5000/api/auth/google/callback",
                    passReqToCallback: true,
                },
                async (req, accessToken, refreshToken, profile, done) => {
                    try {
                        const email = profile.emails[0].value;
                        let user = await User.findOne({
                            $or: [{ googleId: profile.id }, { email: email.toLowerCase() }]
                        });

                        if (user) {
                            if (!user.googleId) {
                                user.googleId = profile.id;
                                if (!user.authProvider) user.authProvider = "google";
                                user.isEmailVerified = true;
                                await user.save();
                            }
                            return done(null, user);
                        }

                        // Only the Sign up screen creates accounts; from Sign in, an unknown email gets the same
                        // "Account does not exist" error (and no-account email) as typing the email
                        if (req.oauthState?.intent !== "signup") return done(noChatAccountError(email, req), null);

                        // Auto-create for the Chat Organization
                        console.log(`✅ Google Chat: Creating new user: ${email}`);
                        
                        // chat.classgrid.in accounts are always "user" (the OAuth state maps loginTab=user to "student")

                        user = await User.create({
                            email: email.toLowerCase(),
                            name: profile.displayName || email.split('@')[0],
                            role: 'user',
                            profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
                            googleId: profile.id,
                            authProvider: 'google',
                            isEmailVerified: true,
                            linkedProviders: ['google'],
                            organization_id: "6ac4b95e0f8a97f45e98b0ff" // Hardcoded Chat Org
                        });
                        return done(null, user);
                    } catch (err) {
                        done(err, null);
                    }
                }
            )
        );
        console.log("✅ GoogleStrategy (Chat) successfully registered with Passport");
    } else {
        console.error("❌ CRITICAL ERROR: process.env.GOOGLE_CLIENT_ID is missing!");
        console.error("❌ Passport skipped registering the Google Strategy.");
        console.error("❌ Fix: Add GOOGLE_CLIENT_ID to your Vercel Environment Variables immediately.");
    }

    // ═══════════════════════════════════════
    // 2. GITHUB STRATEGY (CHAT)
    // ═══════════════════════════════════════
    if (process.env.GITHUB_CLIENT_ID) {
        passport.use(
            'github-chat',
            new GitHubStrategy(
                {
                    // Same GitHub app as the AI Hub GitHub plugin (the old login app can no longer be managed).
                    // Login and plugin connect share the callback; /github/callback tells them apart by the state.
                    clientID: GITHUB_PLUGIN_CLIENT_ID,
                    clientSecret: GITHUB_PLUGIN_CLIENT_SECRET,
                    callbackURL: "https://api.classgrid.in/api/auth/github/callback",
                    scope: ['user:email'],
                    passReqToCallback: true,
                },
                async (req, accessToken, refreshToken, profile, done) => {
                    try {
                        // GitHub might not provide email in profile if it's private, we need to extract it
                        let email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                        
                        if (!email) {
                            return done(new Error("GitHub account has no public email address"), null);
                        }
                        
                        email = email.toLowerCase();

                        let user = await User.findOne({
                            $or: [{ githubId: profile.id }, { email: email }]
                        });

                        if (user) {
                            if (!user.githubId) {
                                user.githubId = profile.id;
                                if (!user.authProvider) user.authProvider = "github";
                                user.isEmailVerified = true;
                                await user.save();
                            }
                            return done(null, user);
                        }

                        // Only the Sign up screen creates accounts (see google-chat)
                        if (req.oauthState?.intent !== "signup") return done(noChatAccountError(email, req), null);

                        // Auto-create for the Chat Organization
                        console.log(`✅ GitHub Chat: Creating new user: ${email}`);
                        
                        // chat.classgrid.in accounts are always "user" (the OAuth state maps loginTab=user to "student")

                        user = await User.create({
                            email: email,
                            name: profile.displayName || profile.username || email.split('@')[0],
                            role: 'user',
                            profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
                            githubId: profile.id,
                            authProvider: 'github',
                            isEmailVerified: true,
                            linkedProviders: ['github'],
                            organization_id: "6ac4b95e0f8a97f45e98b0ff" // Hardcoded Chat Org
                        });
                        return done(null, user);
                    } catch (err) {
                        done(err, null);
                    }
                }
            )
        );
        console.log("✅ GitHubStrategy (Chat) successfully registered with Passport");
        if (process.env.GITHUB_RESCUE_CLIENT_ID && process.env.GITHUB_RESCUE_CLIENT_SECRET) {
            passport.use(
                'github-chat-rescue',
                new GitHubStrategy(
                    {
                        clientID: process.env.GITHUB_RESCUE_CLIENT_ID,
                        clientSecret: process.env.GITHUB_RESCUE_CLIENT_SECRET,
                        callbackURL: process.env.GITHUB_RESCUE_CALLBACK_URL || "https://api.classgrid.in/api/rescue/api/auth/github/callback",
                        scope: ['user:email'],
                        passReqToCallback: true,
                    },
                    passport._strategy('github-chat')._verify
                )
            );
            console.log("✅ GitHubStrategy (Rescue) successfully registered with Passport");
        }
    } else {
        console.error("❌ CRITICAL ERROR: process.env.GITHUB_CLIENT_ID is missing!");
        console.error("❌ Passport skipped registering the GitHub Strategy.");
    }

};

export default passportConfig;
