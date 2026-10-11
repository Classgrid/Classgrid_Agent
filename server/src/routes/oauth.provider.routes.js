// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import express from "express";
import crypto from "crypto";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { OAuthClient, OAuthAuthCode, OAuthToken } from "../models/OAuth.js";
import connectDB from "../../config/db.js";
import User from "../models/User.js";

const router = express.Router();

// Helper to generate secure tokens
const generateToken = (length = 40) => crypto.randomBytes(length).toString('hex');

// A redirect URI is where the browser is sent with the auth code. Anything but a normal web address ran as
// script on the consent page (e.g. "javascript:..." registered through /register stole the user's token),
// so only https, loopback http (desktop MCP clients) and Cursor's own callback are accepted.
const MAX_REDIRECT_URIS = 20;
const ALLOWED_APP_CALLBACKS = new Set(["cursor://anysphere.cursor-mcp/oauth/callback"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isSafeRedirectUri(value) {
    if (typeof value !== "string" || !value || value.length > 2048) return false;
    if (ALLOWED_APP_CALLBACKS.has(value)) return true;
    let url;
    try { url = new URL(value); } catch { return false; }
    if (url.username || url.password || url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

const validRedirectUriList = (list) =>
    Array.isArray(list) && list.length > 0 && list.length <= MAX_REDIRECT_URIS && list.every(isSafeRedirectUri);

// The consent page is the only legitimate caller of /client-details and POST /authorize. Both accept the
// login cookie (SameSite=None on .classgrid.in) and CORS reflects any https origin, so without this check any
// website could read the user's name/email or get an auth code issued silently.
export function isConsentPageOrigin(origin) {
    if (!origin) return false;
    if (/^https:\/\/([a-z0-9-]+\.)?classgrid\.in$/.test(origin)) return true;
    const extra = [process.env.FRONTEND_URL, ...String(process.env.OAUTH_CONSENT_ORIGINS || "").split(",")]
        .map((u) => { try { return new URL(String(u).trim()).origin; } catch { return null; } })
        .filter(Boolean);
    if (extra.includes(origin)) return true;
    return process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

const requireConsentPageOrigin = (req, res, next) => {
    if (!isConsentPageOrigin(req.headers.origin)) {
        return res.status(403).json({ error: "access_denied", message: "This request must come from the Classgrid consent page." });
    }
    next();
};

// ─────────────────────────────────────────────
// 1. DEVELOPER UI: Create an OAuth App (Client)
// ─────────────────────────────────────────────
router.post("/clients/register", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const { name, redirectUris } = req.body;
        
        if (!name || !redirectUris || redirectUris.length === 0) {
            return res.status(400).json({ message: "Name and at least one Redirect URI are required." });
        }
        if (!validRedirectUriList(redirectUris)) {
            return res.status(400).json({ message: `Redirect URIs must be https (or http://localhost), at most ${MAX_REDIRECT_URIS}.` });
        }

        const clientId = `cg_${generateToken(16)}`; // e.g. cg_abc123...
        const clientSecret = `cg_secret_${generateToken(32)}`;

        const client = new OAuthClient({
            clientId,
            clientSecret,
            name,
            redirectUris,
            createdBy: req.user._id
        });

        await client.save();
        res.status(201).json({ 
            message: "App registered successfully", 
            clientId, 
            clientSecret 
        });
    } catch (err) {
        console.error("Register OAuth Client Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// 1.5 DYNAMIC CLIENT REGISTRATION (DCR)
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        await connectDB();
        const { client_name, redirect_uris } = req.body;
        
        if (!validRedirectUriList(redirect_uris)) {
            return res.status(400).json({ error: "invalid_redirect_uri", error_description: `Redirect URIs must be https, http loopback or the Cursor callback (at most ${MAX_REDIRECT_URIS}).` });
        }

        const clientId = `cg_${generateToken(16)}`;
        const clientSecret = `cg_secret_${generateToken(32)}`;

        const client = new OAuthClient({
            clientId,
            clientSecret,
            name: client_name || "Dynamic Custom Connector",
            redirectUris: redirect_uris,
            createdBy: null
        });

        await client.save();

        res.status(201).json({ 
            client_id: clientId, 
            client_secret: clientSecret,
            client_id_issued_at: Math.floor(Date.now() / 1000),
            client_name: client.name,
            redirect_uris: client.redirectUris
        });
    } catch (err) {
        console.error("DCR Register Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// ─────────────────────────────────────────────
// 2. AUTHORIZATION ENDPOINT (Redirects to Frontend Consent Screen)
// ─────────────────────────────────────────────
router.get("/authorize", async (req, res) => {
    try {
        const { client_id, redirect_uri, response_type, state } = req.query;

        // Redirect to the frontend consent UI
        const defaultFrontendUrl = process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://app.classgrid.in" : "http://localhost:5173");
        
        const redirectUrl = new URL(`${defaultFrontendUrl}/oauth/authorize`);
        if (client_id) redirectUrl.searchParams.append("client_id", client_id);
        if (redirect_uri) redirectUrl.searchParams.append("redirect_uri", redirect_uri);
        if (response_type) redirectUrl.searchParams.append("response_type", response_type);
        if (state) redirectUrl.searchParams.append("state", state);

        return res.redirect(redirectUrl.toString());
    } catch (err) {
        console.error("Authorize GET Redirect Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// ─────────────────────────────────────────────
// 2.5. FETCH CLIENT DETAILS (Used by Frontend UI)
// ─────────────────────────────────────────────
router.get("/client-details", requireConsentPageOrigin, isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const { client_id, redirect_uri } = req.query;

        const client = await OAuthClient.findOne({ clientId: String(client_id || "") });
        if (!client) {
            return res.status(400).json({ error: "invalid_client" });
        }

        // Also re-checked here: clients registered before the redirect check may hold unsafe URIs
        if (redirect_uri && (!isSafeRedirectUri(redirect_uri) || !client.redirectUris.includes(redirect_uri))) {
            return res.status(400).json({ error: "invalid_grant", message: "Redirect URI mismatch" });
        }

        res.json({
            client: { name: client.name, clientId: client.clientId },
            user: { name: req.user.name, email: req.user.email }
        });
    } catch (err) {
        console.error("Client Details GET Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// ─────────────────────────────────────────────
// 3. AUTHORIZATION ENDPOINT (User clicks "Allow")
// ─────────────────────────────────────────────
router.post("/authorize", requireConsentPageOrigin, isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const { client_id, redirect_uri, state, allow } = req.body;

        const client = await OAuthClient.findOne({ clientId: String(client_id || "") });
        if (!client || !isSafeRedirectUri(redirect_uri) || !client.redirectUris.includes(redirect_uri)) {
            return res.status(400).json({ error: "invalid_request" });
        }

        if (!allow) {
            // User denied access
            const redirectUrl = new URL(redirect_uri);
            redirectUrl.searchParams.append("error", "access_denied");
            if (state) redirectUrl.searchParams.append("state", state);
            return res.json({ redirect_url: redirectUrl.toString() });
        }

        // Generate short-lived Auth Code (expires in 10 mins)
        const code = generateToken(20);
        await new OAuthAuthCode({
            authorizationCode: code,
            expiresAt: new Date(Date.now() + 10 * 60000), // 10 mins
            redirectUri: redirect_uri,
            clientId: client_id,
            userId: req.user._id
        }).save();

        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.append("code", code);
        if (state) redirectUrl.searchParams.append("state", state);

        res.json({ redirect_url: redirectUrl.toString() });
    } catch (err) {
        console.error("Authorize POST Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// ─────────────────────────────────────────────
// 4. TOKEN ENDPOINT (Exchange Code for Token)
// ─────────────────────────────────────────────
router.post("/token", async (req, res) => {
    try {
        await connectDB();
        const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

        // Basic Auth support (some clients send credentials in headers)
        let cId = client_id;
        let cSecret = client_secret;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Basic ')) {
            const decoded = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii');
            [cId, cSecret] = decoded.split(':');
        }

        if (grant_type !== "authorization_code") {
            return res.status(400).json({ error: "unsupported_grant_type" });
        }

        const client = await OAuthClient.findOne({ clientId: cId, clientSecret: cSecret });
        if (!client) {
            return res.status(401).json({ error: "invalid_client" });
        }

        const authCode = await OAuthAuthCode.findOne({ authorizationCode: code });
        if (!authCode || authCode.clientId !== cId || authCode.redirectUri !== redirect_uri) {
            return res.status(400).json({ error: "invalid_grant" });
        }

        if (new Date() > authCode.expiresAt) {
            await OAuthAuthCode.deleteOne({ _id: authCode._id });
            return res.status(400).json({ error: "invalid_grant", message: "Code expired" });
        }

        // Generate JWT / Bearer Token
        const accessToken = generateToken(40);
        const refreshToken = generateToken(40);

        await new OAuthToken({
            accessToken,
            accessTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60000), // 24 hours
            refreshToken,
            refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60000), // 30 days
            clientId: cId,
            userId: authCode.userId
        }).save();

        // Burn the auth code so it can't be reused
        await OAuthAuthCode.deleteOne({ _id: authCode._id });

        res.json({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 86400, // 24 hours in seconds
            refresh_token: refreshToken
        });
    } catch (err) {
        console.error("Token POST Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// Middleware to protect routes that require Classgrid OAuth Tokens
export const requireOAuthBearer = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Unauthorized. Bearer token missing." });
        }

        const token = authHeader.split(' ')[1];
        const oauthToken = await OAuthToken.findOne({ accessToken: token }).populate('userId');

        if (!oauthToken) {
            return res.status(401).json({ error: "Invalid token" });
        }

        if (new Date() > oauthToken.accessTokenExpiresAt) {
            return res.status(401).json({ error: "Token expired" });
        }

        req.user = oauthToken.userId; // Inject user just like standard auth
        req.oauthClient = oauthToken.clientId;
        next();
    } catch (err) {
        res.status(500).json({ error: "server_error" });
    }
};

export default router;
