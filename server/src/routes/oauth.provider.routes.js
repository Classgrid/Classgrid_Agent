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
import crypto from "crypto";
import { isAuthenticated, getUserAccessBlock } from "../middleware/auth.middleware.js";
import { oauthRegisterLimiter, oauthTokenLimiter, oauthAuthorizeLimiter } from "../middleware/rateLimiter.js";
import { OAuthClient, OAuthAuthRequest, OAuthAuthCode, OAuthUsedCode, OAuthToken } from "../models/OAuth.js";
import {
    SUPPORTED_SCOPES, RESOURCE_SCOPES, DEFAULT_REQUESTED_SCOPES, OFFLINE_ACCESS_SCOPE,
    parseScopeParam, intersectScopes, scopesToString, describeScopes, grantScopes
} from "../mcp/mcp-scopes.js";
import connectDB from "../../config/db.js";
import User from "../models/User.js";

const router = express.Router();

// Helper to generate secure tokens
const generateToken = (length = 40) => crypto.randomBytes(length).toString('hex');

// Secrets, codes and tokens are only ever stored as sha256 hex, so a database leak hands out nothing usable.
// They are all long random values, so a plain (unsalted) hash is enough.
export const hashSecret = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

// Constant-time check of a presented secret against a stored sha256 hex hash
export function secretMatchesHash(value, storedHash) {
    if (typeof value !== "string" || !value || typeof storedHash !== "string" || storedHash.length !== 64) return false;
    const a = Buffer.from(hashSecret(value), "hex");
    const b = Buffer.from(storedHash, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const AUTH_REQUEST_TTL_MS = 10 * 60000; // pending sign-in on the consent page: 10 mins
const AUTH_CODE_TTL_MS = 10 * 60000; // 10 mins
const USED_CODE_TTL_MS = 10 * 60000; // used-code marker lives as long as a code could
const ACCESS_TOKEN_TTL_MS = 60 * 60000; // 1 hour (short-lived; clients refresh with the refresh token)
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60000; // 30 days
const ROTATED_REFRESH_KEEP_MS = 7 * 24 * 60 * 60000; // an exchanged refresh token is remembered 7 days to catch reuse
const UNUSED_DCR_CLIENT_TTL_MS = 7 * 24 * 60 * 60000; // DCR clients that never get a token are removed after 7 days

const TOKEN_AUTH_METHODS = ["none", "client_secret_post", "client_secret_basic"];
const SUPPORTED_GRANT_TYPES = ["authorization_code", "refresh_token"];

// Client credentials from "Authorization: Basic base64(id:secret)". RFC 6749 §2.3.1: both parts are
// form-urlencoded before encoding and the id cannot contain ":", so split on the first colon only.
export function parseBasicAuth(header) {
    if (typeof header !== "string" || !header.startsWith("Basic ")) return null;
    const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    const decode = (part) => { try { return decodeURIComponent(part.replace(/\+/g, " ")); } catch { return part; } };
    return { clientId: decode(decoded.slice(0, sep)), clientSecret: decode(decoded.slice(sep + 1)) };
}

// A redirect URI is where the browser is sent with the auth code. Anything but a normal web address ran as
// script on the consent page (e.g. "javascript:..." registered through /register stole the user's token),
// so only https, loopback http (desktop MCP clients) and Cursor's own callback are accepted.
// Known MCP callbacks that pass: https://claude.ai/api/mcp/auth_callback, https://claude.com/api/mcp/auth_callback,
// https://chatgpt.com/connector_platform_oauth_redirect, http://localhost:<port>/callback (Claude Code, Cursor),
// cursor://anysphere.cursor-mcp/oauth/callback.
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

// Exact match, except loopback http (RFC 8252 §7.3): desktop apps like Claude Code pick a new port each
// time, so the port is ignored there. Host name, path and query must still be identical.
export function redirectUriMatches(registered, presented) {
    if (typeof registered !== "string" || typeof presented !== "string") return false;
    if (registered === presented) return true;
    let a, b;
    try { a = new URL(registered); b = new URL(presented); } catch { return false; }
    if (a.protocol !== "http:" || b.protocol !== "http:") return false;
    if (!LOOPBACK_HOSTS.has(a.hostname) || a.hostname !== b.hostname) return false;
    if (a.username || a.password || b.username || b.password || a.hash || b.hash) return false;
    return a.pathname === b.pathname && a.search === b.search;
}

const clientAllowsRedirect = (client, redirectUri) =>
    isSafeRedirectUri(redirectUri) && (client.redirectUris || []).some((r) => redirectUriMatches(r, redirectUri));

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
// OAuth / MCP configuration (also used by the discovery documents in api/index.js)
// ─────────────────────────────────────────────
const stripTrailingSlashes = (value) => {
    let end = value.length;
    while (end > 0 && value[end - 1] === "/") end--;
    return value.slice(0, end);
};

// Issuer = the origin serving /.well-known/oauth-authorization-server; clients reject any mismatch
export function getOAuthIssuer() {
    return stripTrailingSlashes(String(process.env.OAUTH_ISSUER || "").trim()) || "https://api.classgrid.in";
}

// RFC 8707 resource: lower-case scheme and host (URL does that), no fragment, no trailing slash
export function normalizeResourceUrl(value) {
    if (typeof value !== "string" || !value || value.length > 2048) return null;
    let url;
    try { url = new URL(value.trim()); } catch { return null; }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.hash || url.username || url.password) return null;
    return `${url.protocol}//${url.host}${stripTrailingSlashes(url.pathname)}${url.search}`;
}

// The only audience tokens can be issued for: the remote MCP endpoint
export function getMcpResourceUrl() {
    return normalizeResourceUrl(String(process.env.MCP_RESOURCE_URL || "")) || "https://api.classgrid.in/mcp";
}

// Where GET /oauth/authorize sends the browser (the consent page lives on chat.classgrid.in)
function getConsentPageUrl() {
    try {
        return new URL(String(process.env.OAUTH_CONSENT_URL || "").trim()).toString();
    } catch {
        return "https://chat.classgrid.in/oauth/authorize";
    }
}

// RFC 8414 Authorization Server Metadata
export function buildAuthorizationServerMetadata() {
    const issuer = getOAuthIssuer();
    return {
        issuer,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/oauth/token`,
        registration_endpoint: `${issuer}/oauth/register`,
        scopes_supported: [...SUPPORTED_SCOPES],
        response_types_supported: ["code"],
        response_modes_supported: ["query"],
        grant_types_supported: [...SUPPORTED_GRANT_TYPES],
        token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
        code_challenge_methods_supported: ["S256"],
        authorization_response_iss_parameter_supported: true
    };
}

// RFC 9728 Protected Resource Metadata for the MCP endpoint
export function buildProtectedResourceMetadata() {
    return {
        resource: getMcpResourceUrl(),
        authorization_servers: [getOAuthIssuer()],
        scopes_supported: [...RESOURCE_SCOPES],
        bearer_methods_supported: ["header"],
        resource_name: "Classgrid"
    };
}

// ─────────────────────────────────────────────
// PKCE (RFC 7636), S256 only
// ─────────────────────────────────────────────
const PKCE_CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/; // base64url of a sha256 digest, no padding
const PKCE_VERIFIER_RE = /^[A-Za-z0-9._~-]{43,128}$/;

export const pkceS256 = (verifier) => crypto.createHash("sha256").update(String(verifier)).digest("base64url");

export function verifyPkce(verifier, challenge, method) {
    if (method !== "S256" || typeof challenge !== "string" || !PKCE_CHALLENGE_RE.test(challenge)) return false;
    if (typeof verifier !== "string" || !PKCE_VERIFIER_RE.test(verifier)) return false;
    const a = Buffer.from(pkceS256(verifier));
    const b = Buffer.from(challenge);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─────────────────────────────────────────────
// Authorization request checks (shared by GET /authorize and the legacy POST /authorize body)
// ─────────────────────────────────────────────
const MAX_STATE_LENGTH = 1024;

/**
 * Checks an app's authorization request: client, redirect URI, response_type, PKCE, scope, resource, state.
 * Returns one of:
 *   { fatal, fatalError }  bad client or redirect URI: never redirect, show an error instead
 *   { error, description, redirectUri, state }  goes back to the app's redirect URI
 *   { value: { client, redirectUri, state, codeChallenge, codeChallengeMethod, requestedScopes, resource } }
 */
async function checkAuthorizationRequest(params = {}) {
    const clientId = typeof params.client_id === "string" ? params.client_id : "";
    const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : "";

    const client = clientId && clientId.length <= 128 ? await OAuthClient.findOne({ clientId }) : null;
    if (!client) return { fatal: "This app is not registered with Classgrid (unknown client_id).", fatalError: "invalid_client" };
    if (!clientAllowsRedirect(client, redirectUri)) {
        return { fatal: "The return address (redirect_uri) is missing or not registered for this app.", fatalError: "invalid_request" };
    }

    const back = (error, description, state = null) => ({ error, description, redirectUri, state });

    let state = null;
    if (params.state !== undefined && params.state !== "") {
        if (typeof params.state !== "string" || params.state.length > MAX_STATE_LENGTH) return back("invalid_request", "state is malformed");
        state = params.state;
    }

    if (params.response_type !== "code") return back("unsupported_response_type", "Only response_type=code is supported", state);
    if (Array.isArray(client.responseTypes) && client.responseTypes.length && !client.responseTypes.includes("code")) {
        return back("unauthorized_client", "This app is not registered for the code flow", state);
    }
    if (Array.isArray(client.grants) && !client.grants.includes("authorization_code")) {
        return back("unauthorized_client", "This app is not registered for the authorization_code grant", state);
    }

    if (params.code_challenge_method !== "S256") {
        return back("invalid_request", "PKCE is required: send code_challenge with code_challenge_method=S256", state);
    }
    if (typeof params.code_challenge !== "string" || !PKCE_CHALLENGE_RE.test(params.code_challenge)) {
        return back("invalid_request", "code_challenge is missing or malformed", state);
    }

    // No scope asked = every read scope plus refresh. Unknown scopes are dropped silently.
    let requestedScopes;
    if (params.scope === undefined || params.scope === "") {
        requestedScopes = [...DEFAULT_REQUESTED_SCOPES];
    } else {
        if (typeof params.scope !== "string") return back("invalid_scope", "scope is malformed", state);
        const parsed = parseScopeParam(params.scope);
        if (parsed.tooLong) return back("invalid_scope", "Too many or too long scopes", state);
        requestedScopes = parsed.scopes;
    }
    if (client.scope) requestedScopes = intersectScopes(requestedScopes, parseScopeParam(client.scope).scopes);
    if (!requestedScopes.length) return back("invalid_scope", `Supported scopes: ${SUPPORTED_SCOPES.join(" ")}`, state);

    // RFC 8707: tokens can only be issued for the MCP endpoint. Clients that send no resource get it too.
    const allowedResource = getMcpResourceUrl();
    let resource = allowedResource;
    if (params.resource !== undefined) {
        resource = typeof params.resource === "string" ? normalizeResourceUrl(params.resource) : null;
        if (resource !== allowedResource) return back("invalid_target", `The only supported resource is ${allowedResource}`, state);
    }

    return {
        value: {
            client, redirectUri, state,
            codeChallenge: params.code_challenge,
            codeChallengeMethod: "S256",
            requestedScopes,
            resource
        }
    };
}

// Authorization response back to the app (success or error). Carries iss (RFC 9207) on every response.
function buildAuthorizationRedirect(redirectUri, params) {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") url.searchParams.append(key, value);
    }
    url.searchParams.set("iss", getOAuthIssuer());
    return url.toString();
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Shown when the request cannot be sent back to the app safely (unknown client or redirect URI)
function sendAuthorizeError(req, res, status, error, description) {
    res.set("Cache-Control", "no-store");
    if (req.accepts(["json", "html"]) === "html") {
        return res.status(status).type("html").send(
            `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
            `<title>Classgrid sign-in error</title></head>` +
            `<body style="font-family:system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:0 16px;color:#111">` +
            `<h1 style="font-size:20px">This sign-in link is not valid</h1>` +
            `<p>${escapeHtml(description)}</p>` +
            `<p style="color:#555">Go back to the app you came from and try connecting Classgrid again.</p>` +
            `</body></html>`
        );
    }
    return res.status(status).json({ error, error_description: description });
}

// Creates the auth code (only its hash is stored) and returns the redirect URL carrying it
async function issueAuthorizationCode({ client, redirectUri, state, codeChallenge, codeChallengeMethod, requestedScopes, grantedScopes, audience, userId }) {
    const code = generateToken(20);
    await new OAuthAuthCode({
        codeHash: hashSecret(code),
        expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
        redirectUri,
        clientId: client.clientId,
        userId,
        codeChallenge,
        codeChallengeMethod,
        requestedScopes,
        scopes: grantedScopes,
        audience
    }).save();
    return buildAuthorizationRedirect(redirectUri, { code, state });
}

// At least one real permission must be ticked; "stay connected" alone grants nothing
const hasToolScope = (scopes) => scopes.some((s) => s !== OFFLINE_ACCESS_SCOPE);

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
            clientSecretHash: hashSecret(clientSecret), // the plain secret is shown once below, never stored
            tokenEndpointAuthMethod: "client_secret_basic", // Basic or post are both accepted for secret clients
            responseTypes: ["code"],
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
// 1.5 DYNAMIC CLIENT REGISTRATION (DCR, RFC 7591)
// ─────────────────────────────────────────────
router.post("/register", oauthRegisterLimiter, async (req, res) => {
    try {
        await connectDB();
        const { client_name, redirect_uris, token_endpoint_auth_method, grant_types, response_types, scope } = req.body || {};
        const badMetadata = (description) => res.status(400).json({ error: "invalid_client_metadata", error_description: description });

        if (!validRedirectUriList(redirect_uris)) {
            return res.status(400).json({ error: "invalid_redirect_uri", error_description: `Redirect URIs must be https, http loopback or the Cursor callback (at most ${MAX_REDIRECT_URIS}).` });
        }

        // "none" = public client (Claude Code, Cursor, ChatGPT): no secret is issued and PKCE is the proof
        const authMethod = token_endpoint_auth_method === undefined ? "client_secret_basic" : token_endpoint_auth_method;
        if (!TOKEN_AUTH_METHODS.includes(authMethod)) {
            return badMetadata(`token_endpoint_auth_method must be one of: ${TOKEN_AUTH_METHODS.join(", ")}`);
        }

        // Both grants by default (RFC 7591 defaults to authorization_code only, but MCP clients expect refresh)
        const grantTypes = grant_types === undefined ? [...SUPPORTED_GRANT_TYPES] : grant_types;
        if (!Array.isArray(grantTypes) || !grantTypes.includes("authorization_code") || !grantTypes.every((g) => SUPPORTED_GRANT_TYPES.includes(g))) {
            return badMetadata("grant_types must include authorization_code and may add refresh_token");
        }

        const responseTypes = response_types === undefined ? ["code"] : response_types;
        if (!Array.isArray(responseTypes) || responseTypes.length !== 1 || responseTypes[0] !== "code") {
            return badMetadata("response_types must be [\"code\"]");
        }

        let registeredScope = null; // null = may ask for any supported scope
        if (scope !== undefined && scope !== null && scope !== "") {
            const parsed = typeof scope === "string" ? parseScopeParam(scope) : { scopes: [], tooLong: true };
            if (parsed.tooLong || !parsed.scopes.length) return badMetadata(`Supported scopes: ${SUPPORTED_SCOPES.join(" ")}`);
            registeredScope = scopesToString(parsed.scopes);
        }

        const clientId = `cg_${generateToken(16)}`;
        const clientSecret = authMethod === "none" ? null : `cg_secret_${generateToken(32)}`;

        const client = new OAuthClient({
            clientId,
            clientSecretHash: clientSecret ? hashSecret(clientSecret) : undefined, // the plain secret is returned once below, never stored
            tokenEndpointAuthMethod: authMethod,
            grants: [...new Set(grantTypes)],
            responseTypes,
            scope: registeredScope,
            name: String(client_name || "").trim().slice(0, 100) || "Dynamic Custom Connector",
            redirectUris: redirect_uris,
            createdBy: null,
            unusedExpiresAt: new Date(Date.now() + UNUSED_DCR_CLIENT_TTL_MS) // cleared when it first gets a token
        });

        await client.save();

        const response = {
            client_id: clientId,
            client_id_issued_at: Math.floor(Date.now() / 1000),
            client_name: client.name,
            redirect_uris: client.redirectUris,
            token_endpoint_auth_method: authMethod,
            grant_types: client.grants,
            response_types: client.responseTypes,
            scope: registeredScope || scopesToString(SUPPORTED_SCOPES)
        };
        if (clientSecret) {
            response.client_secret = clientSecret;
            response.client_secret_expires_at = 0; // never expires
        }
        res.status(201).json(response);
    } catch (err) {
        console.error("DCR Register Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// ─────────────────────────────────────────────
// 2. AUTHORIZATION ENDPOINT (Validates, then redirects to the Frontend Consent Screen)
// ─────────────────────────────────────────────
router.get("/authorize", oauthAuthorizeLimiter, async (req, res) => {
    try {
        await connectDB();
        const checked = await checkAuthorizationRequest(req.query);

        // Unknown app or return address: never redirect anywhere (that would make this an open redirect)
        if (checked.fatal) {
            return sendAuthorizeError(req, res, 400, checked.fatalError, checked.fatal);
        }
        res.set("Cache-Control", "no-store");
        if (checked.error) {
            return res.redirect(buildAuthorizationRedirect(checked.redirectUri, {
                error: checked.error, error_description: checked.description, state: checked.state
            }));
        }

        // Keep the whole request server-side; the browser only carries a random id to the consent page
        const v = checked.value;
        const requestId = generateToken(24);
        await new OAuthAuthRequest({
            requestIdHash: hashSecret(requestId),
            clientId: v.client.clientId,
            redirectUri: v.redirectUri,
            state: v.state,
            codeChallenge: v.codeChallenge,
            codeChallengeMethod: v.codeChallengeMethod,
            requestedScopes: v.requestedScopes,
            resource: v.resource,
            expiresAt: new Date(Date.now() + AUTH_REQUEST_TTL_MS)
        }).save();

        const consentUrl = new URL(getConsentPageUrl());
        consentUrl.searchParams.set("request_id", requestId);
        return res.redirect(consentUrl.toString());
    } catch (err) {
        console.error("Authorize GET Redirect Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// Finds a pending sign-in that is still open (not used, not expired)
const findOpenAuthRequest = (requestId) =>
    OAuthAuthRequest.findOne({ requestIdHash: hashSecret(requestId), consumedAt: null, expiresAt: { $gt: new Date() } });

const isRequestIdShape = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;

// The app's name is self-chosen (a DCR client can call itself "Classgrid Official"), so the consent page
// also shows where the code is really sent and flags apps nobody at Classgrid registered.
function describeClientForConsent(client, redirectUri) {
    let redirectHost = null;
    if (redirectUri) {
        try { redirectHost = new URL(redirectUri).host || null; } catch { redirectHost = null; }
    }
    return {
        name: client.name,
        clientId: client.clientId,
        clientKind: client.createdBy ? "registered" : "dynamic", // "dynamic" = self-registered, unverified
        redirectHost
    };
}

// ─────────────────────────────────────────────
// 2.4. FETCH A PENDING SIGN-IN (Used by the Frontend consent screen, ?request_id=)
// ─────────────────────────────────────────────
router.get("/request-details", requireConsentPageOrigin, isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const { request_id } = req.query;
        if (!isRequestIdShape(request_id)) {
            return res.status(400).json({ error: "invalid_request", error_description: "request_id is required" });
        }

        const pending = await findOpenAuthRequest(request_id);
        if (!pending) {
            return res.status(400).json({ error: "invalid_request", error_description: "This sign-in link has expired or was already used. Start again from the app." });
        }

        const client = await OAuthClient.findOne({ clientId: pending.clientId });
        if (!client) {
            return res.status(400).json({ error: "invalid_client", error_description: "This app is no longer registered." });
        }

        res.json({
            client: describeClientForConsent(client, pending.redirectUri),
            scopes: describeScopes(pending.requestedScopes),
            user: { name: req.user.name, email: req.user.email }
        });
    } catch (err) {
        console.error("Request Details GET Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// ─────────────────────────────────────────────
// 2.5. FETCH CLIENT DETAILS (Older consent links with ?client_id=; new sign-ins use /request-details)
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
        if (redirect_uri && !clientAllowsRedirect(client, redirect_uri)) {
            return res.status(400).json({ error: "invalid_request", error_description: "Redirect URI mismatch" });
        }

        res.json({
            client: describeClientForConsent(client, redirect_uri),
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
        const body = req.body || {};
        const { allow } = body;

        // Staff acting as another user must not hand that user's account to an outside app
        if (allow && req.isImpersonating) {
            return res.status(403).json({ error: "access_denied", error_description: "Apps cannot be connected while impersonating a user." });
        }

        if (body.request_id !== undefined) {
            return await authorizePendingRequest(req, res, body);
        }

        // Older consent links send the app's parameters directly. They get the same checks, PKCE included.
        const checked = await checkAuthorizationRequest(body);
        if (checked.fatal) {
            return res.status(400).json({ error: "invalid_request", error_description: checked.fatal });
        }
        if (checked.error) {
            return res.json({ redirect_url: buildAuthorizationRedirect(checked.redirectUri, {
                error: checked.error, error_description: checked.description, state: checked.state
            }) });
        }
        const v = checked.value;

        if (!allow) {
            // User denied access
            return res.json({ redirect_url: buildAuthorizationRedirect(v.redirectUri, { error: "access_denied", state: v.state }) });
        }

        // This page never showed scope boxes: grant only the ticked ones, or else the non-sensitive requested ones
        const ticked = body.scopes !== undefined
            ? parseScopeParam(body.scopes).scopes
            : describeScopes(v.requestedScopes).filter((s) => s.defaultChecked).map((s) => s.scope);
        const grantedScopes = grantScopes(ticked, v.requestedScopes);
        if (!hasToolScope(grantedScopes)) {
            return res.json({ redirect_url: buildAuthorizationRedirect(v.redirectUri, { error: "access_denied", error_description: "No permissions were granted", state: v.state }) });
        }

        const redirectUrl = await issueAuthorizationCode({
            client: v.client, redirectUri: v.redirectUri, state: v.state,
            codeChallenge: v.codeChallenge, codeChallengeMethod: v.codeChallengeMethod,
            requestedScopes: v.requestedScopes, grantedScopes, audience: v.resource, userId: req.user._id
        });
        res.json({ redirect_url: redirectUrl });
    } catch (err) {
        console.error("Authorize POST Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// POST /authorize with { request_id, allow, scopes[] }: everything else comes from the stored request
async function authorizePendingRequest(req, res, body) {
    if (!isRequestIdShape(body.request_id)) {
        return res.status(400).json({ error: "invalid_request", error_description: "request_id is malformed" });
    }

    // Atomic: a pending sign-in can be answered only once
    const pending = await OAuthAuthRequest.findOneAndUpdate(
        { requestIdHash: hashSecret(body.request_id), consumedAt: null, expiresAt: { $gt: new Date() } },
        { $set: { consumedAt: new Date() } },
        { returnDocument: 'after' }
    );
    if (!pending) {
        return res.status(400).json({ error: "invalid_request", error_description: "This sign-in link has expired or was already used. Start again from the app." });
    }

    const client = await OAuthClient.findOne({ clientId: pending.clientId });
    if (!client || !clientAllowsRedirect(client, pending.redirectUri)) {
        return res.status(400).json({ error: "invalid_request", error_description: "This app is no longer registered." });
    }

    if (!body.allow) {
        // User denied access
        return res.json({ redirect_url: buildAuthorizationRedirect(pending.redirectUri, { error: "access_denied", state: pending.state }) });
    }

    // Granted = what the user ticked (plus locked scopes like profile:read), within what the app asked for
    const grantedScopes = grantScopes(parseScopeParam(body.scopes).scopes, pending.requestedScopes);
    if (!hasToolScope(grantedScopes)) {
        return res.json({ redirect_url: buildAuthorizationRedirect(pending.redirectUri, { error: "access_denied", error_description: "No permissions were granted", state: pending.state }) });
    }

    const redirectUrl = await issueAuthorizationCode({
        client, redirectUri: pending.redirectUri, state: pending.state,
        codeChallenge: pending.codeChallenge, codeChallengeMethod: pending.codeChallengeMethod,
        requestedScopes: pending.requestedScopes, grantedScopes, audience: pending.resource, userId: req.user._id
    });
    return res.json({ redirect_url: redirectUrl });
}

// ─────────────────────────────────────────────
// 3.5. CONNECTED APPS (the user's own grants; Used by the chat app's "Connected apps" view)
// ─────────────────────────────────────────────
const MAX_GRANT_TOKENS = 500; // live tokens read per user; one app holds a handful

// One row per app that still holds a live token for this user. "Last active" = the newest token the app
// got (sign-in or refresh), since access checks don't write anything per call.
router.get("/grants", requireConsentPageOrigin, isAuthenticated, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        await connectDB();
        const tokens = await OAuthToken.find({
            userId: req.user._id,
            rotatedAt: null, // an exchanged refresh token is kept only to catch reuse
            refreshTokenExpiresAt: { $gt: new Date() }
        })
            .select("clientId scopes createdAt")
            .sort({ createdAt: -1 })
            .limit(MAX_GRANT_TOKENS)
            .lean();

        const byClient = new Map();
        for (const t of tokens) {
            const row = byClient.get(t.clientId) || { scopes: new Set(), connectedAt: t.createdAt, lastUsedAt: t.createdAt };
            for (const s of t.scopes || []) row.scopes.add(s);
            if (t.createdAt < row.connectedAt) row.connectedAt = t.createdAt;
            if (t.createdAt > row.lastUsedAt) row.lastUsedAt = t.createdAt;
            byClient.set(t.clientId, row);
        }

        const clients = byClient.size
            ? await OAuthClient.find({ clientId: { $in: [...byClient.keys()] } }).select("clientId name createdBy").lean()
            : [];
        const clientById = new Map(clients.map((c) => [c.clientId, c]));

        const grants = [...byClient.entries()].map(([clientId, row]) => {
            const client = clientById.get(clientId);
            return {
                clientId,
                name: client?.name || "Removed app",
                clientKind: client?.createdBy ? "registered" : "dynamic",
                scopes: describeScopes([...row.scopes]).map(({ scope, label, sensitive }) => ({ scope, label, sensitive })),
                connectedAt: row.connectedAt,
                lastUsedAt: row.lastUsedAt
            };
        }).sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));

        res.json({ grants });
    } catch (err) {
        console.error("Grants GET Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// Disconnects one app: every token and unused code it holds for this user stops working at once
router.delete("/grants/:clientId", requireConsentPageOrigin, isAuthenticated, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const clientId = req.params.clientId;
        if (typeof clientId !== "string" || !clientId || clientId.length > 128) {
            return res.status(400).json({ error: "invalid_request", error_description: "clientId is malformed" });
        }
        // Staff acting as another user must not change that user's connections
        if (req.isImpersonating) {
            return res.status(403).json({ error: "access_denied", error_description: "Connected apps cannot be changed while impersonating a user." });
        }

        await connectDB();
        const [tokens] = await Promise.all([
            OAuthToken.deleteMany({ userId: req.user._id, clientId }),
            OAuthAuthCode.deleteMany({ userId: req.user._id, clientId })
        ]);
        res.json({ success: true, revoked: tokens?.deletedCount || 0 });
    } catch (err) {
        console.error("Grants DELETE Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

// ─────────────────────────────────────────────
// 4. TOKEN ENDPOINT (Exchange Code for Token, Refresh)
// ─────────────────────────────────────────────

// Client authentication at /token. Secret clients may use Basic or the body (not both); public clients
// ("none") send only client_id and prove themselves with PKCE (code) or the refresh token itself.
async function authenticateTokenClient(req, body) {
    const fail = (status, error, description) => ({ status, error, description });
    const basic = parseBasicAuth(req.headers.authorization);
    if ((body.client_id !== undefined && typeof body.client_id !== "string") ||
        (body.client_secret !== undefined && typeof body.client_secret !== "string")) {
        return fail(400, "invalid_request", "client_id and client_secret must be strings");
    }
    const bodyId = body.client_id || "";
    const bodySecret = body.client_secret || "";

    // RFC 6749 §2.3: a client must not use more than one authentication method per request
    if (basic && (bodySecret || (bodyId && bodyId !== basic.clientId))) {
        return fail(400, "invalid_request", "Send client credentials either in the Authorization header or in the body, not both");
    }

    const clientId = basic ? basic.clientId : bodyId;
    const secret = basic ? basic.clientSecret : bodySecret;
    const client = clientId && clientId.length <= 128 ? await OAuthClient.findOne({ clientId }) : null;
    if (!client) return { ...fail(401, "invalid_client", "Unknown client"), basic: Boolean(basic) };

    // Clients saved before the auth method was stored are secret clients; ones without a secret hash predate hashing
    const method = client.tokenEndpointAuthMethod || (client.clientSecretHash ? "client_secret_basic" : null);
    if (method === "none") {
        if (secret) return { ...fail(401, "invalid_client", "This app is a public client and must not send a secret"), basic: Boolean(basic) };
        return { client, isPublic: true };
    }
    if (!method || !secretMatchesHash(secret, client.clientSecretHash)) {
        return { ...fail(401, "invalid_client", "Client authentication failed"), basic: Boolean(basic) };
    }
    return { client, isPublic: false };
}

// Stores a new access token (and a refresh token when offline_access was granted); only hashes are kept
async function issueTokens({ client, userId, scopes, audience, authCodeHash, familyId, authTime }) {
    const now = Date.now();
    const accessToken = generateToken(40);
    const withRefresh = scopes.includes(OFFLINE_ACCESS_SCOPE) && (client.grants || []).includes("refresh_token");
    const refreshToken = withRefresh ? generateToken(40) : null;
    const accessTokenExpiresAt = new Date(now + ACCESS_TOKEN_TTL_MS);

    const tokenDoc = await new OAuthToken({
        accessTokenHash: hashSecret(accessToken),
        accessTokenExpiresAt,
        refreshTokenHash: refreshToken ? hashSecret(refreshToken) : undefined,
        // No refresh token: the document goes (TTL) when the access token expires
        refreshTokenExpiresAt: refreshToken ? new Date(now + REFRESH_TOKEN_TTL_MS) : accessTokenExpiresAt,
        authCodeHash,
        familyId,
        scopes,
        audience,
        authTime,
        clientId: client.clientId,
        userId
    }).save();

    const response = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
        scope: scopesToString(scopes)
    };
    if (refreshToken) response.refresh_token = refreshToken;
    return { tokenDoc, response };
}

router.post("/token", oauthTokenLimiter, async (req, res) => {
    // RFC 6749 §5.1: token responses (and their errors) must never be cached
    res.set({ "Cache-Control": "no-store", "Pragma": "no-cache" });
    try {
        await connectDB();
        const body = req.body || {};
        const { grant_type } = body;

        if (!grant_type) {
            return res.status(400).json({ error: "invalid_request", error_description: "grant_type is required" });
        }
        if (!SUPPORTED_GRANT_TYPES.includes(grant_type)) {
            return res.status(400).json({ error: "unsupported_grant_type" });
        }

        const auth = await authenticateTokenClient(req, body);
        if (!auth.client) {
            if (auth.basic && auth.status === 401) res.set("WWW-Authenticate", 'Basic realm="oauth"');
            return res.status(auth.status).json({ error: auth.error, error_description: auth.description });
        }
        const client = auth.client;

        if (Array.isArray(client.grants) && !client.grants.includes(grant_type)) {
            return res.status(400).json({ error: "unauthorized_client", error_description: `This app is not registered for ${grant_type}` });
        }

        return grant_type === "authorization_code"
            ? await exchangeAuthorizationCode(res, client, body)
            : await exchangeRefreshToken(res, client, body);
    } catch (err) {
        console.error("Token POST Error:", err);
        res.status(500).json({ error: "server_error" });
    }
});

async function exchangeAuthorizationCode(res, client, body) {
    const { code, redirect_uri, code_verifier, resource } = body;

    if (typeof code !== "string" || !code || code.length > 256) {
        return res.status(400).json({ error: "invalid_request", error_description: "code is required" });
    }
    if (typeof redirect_uri !== "string" || !redirect_uri) {
        return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri is required" });
    }
    if (typeof code_verifier !== "string" || !code_verifier) {
        return res.status(400).json({ error: "invalid_request", error_description: "code_verifier is required (PKCE)" });
    }
    if (resource !== undefined && typeof resource !== "string") {
        return res.status(400).json({ error: "invalid_target", error_description: "resource is malformed" });
    }
    const codeHash = hashSecret(code);

    // Atomic take-and-delete: two parallel requests with the same code can never both succeed
    const authCode = await OAuthAuthCode.findOneAndDelete({ codeHash });
    if (!authCode) {
        // Code already used? Then someone replayed it: revoke everything issued from it (RFC 6749 §4.1.2)
        const used = await OAuthUsedCode.findOneAndUpdate({ codeHash }, { $set: { reusedAt: new Date() } });
        if (used) {
            await OAuthToken.deleteMany({ authCodeHash: codeHash });
            console.warn(`[OAuth] Auth code reused for client ${used.clientId}; tokens from it revoked.`);
        }
        return res.status(400).json({ error: "invalid_grant" });
    }

    // Remember the burnt code for a while so a replay can be spotted
    try {
        await OAuthUsedCode.create({ codeHash, clientId: authCode.clientId, expiresAt: new Date(Date.now() + USED_CODE_TTL_MS) });
    } catch (markErr) {
        if (markErr?.code !== 11000) throw markErr;
    }

    // The code carries the exact redirect URI it was issued for (loopback port included)
    if (authCode.clientId !== client.clientId || authCode.redirectUri !== redirect_uri) {
        return res.status(400).json({ error: "invalid_grant" });
    }

    if (new Date() > authCode.expiresAt) {
        return res.status(400).json({ error: "invalid_grant", error_description: "Code expired" });
    }

    // PKCE is mandatory: codes issued without a challenge are refused
    if (!verifyPkce(code_verifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
        return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
    }

    const audience = authCode.audience || getMcpResourceUrl();
    if (resource !== undefined && normalizeResourceUrl(resource) !== audience) {
        return res.status(400).json({ error: "invalid_target", error_description: `The only supported resource is ${audience}` });
    }

    const scopes = intersectScopes(authCode.scopes, SUPPORTED_SCOPES);
    const { tokenDoc, response } = await issueTokens({
        client,
        userId: authCode.userId,
        scopes,
        audience,
        authCodeHash: codeHash,
        familyId: generateToken(16),
        authTime: new Date()
    });

    // A replay that arrived while the tokens were being written found nothing to revoke: re-check now
    const marker = await OAuthUsedCode.findOne({ codeHash }).select("reusedAt").lean();
    if (marker?.reusedAt) {
        await OAuthToken.deleteOne({ _id: tokenDoc._id });
        return res.status(400).json({ error: "invalid_grant" });
    }

    // The client is in use: stop the 7-day cleanup of unused DCR clients
    await OAuthClient.updateOne({ _id: client._id }, { $set: { lastUsedAt: new Date() }, $unset: { unusedExpiresAt: 1 } });

    return res.json(response);
}

// Deletes every token from one sign-in (after a refresh token was reused)
async function revokeTokenFamily(tokenDoc) {
    if (tokenDoc.familyId) await OAuthToken.deleteMany({ familyId: tokenDoc.familyId });
    else await OAuthToken.deleteOne({ _id: tokenDoc._id });
}

// refresh_token grant with rotation: every use returns a new refresh token and retires the old one.
// Showing a retired refresh token again means it leaked, so the whole family is revoked.
async function exchangeRefreshToken(res, client, body) {
    const { refresh_token, scope, resource } = body;
    const invalidGrant = (description) => res.status(400).json({ error: "invalid_grant", ...(description ? { error_description: description } : {}) });

    if (typeof refresh_token !== "string" || !refresh_token || refresh_token.length > 512) {
        return res.status(400).json({ error: "invalid_request", error_description: "refresh_token is required" });
    }

    const current = await OAuthToken.findOne({ refreshTokenHash: hashSecret(refresh_token) });
    if (!current) return invalidGrant();

    if (current.rotatedAt) {
        await revokeTokenFamily(current);
        console.warn(`[OAuth] Rotated refresh token reused for client ${current.clientId}; token family revoked.`);
        return invalidGrant();
    }
    if (current.clientId !== client.clientId) return invalidGrant();
    if (!current.refreshTokenExpiresAt || Date.now() >= new Date(current.refreshTokenExpiresAt).getTime()) {
        return invalidGrant("Refresh token expired");
    }

    // A refresh may narrow the scopes, never widen them (RFC 6749 §6)
    let scopes = intersectScopes(current.scopes, SUPPORTED_SCOPES);
    if (scope !== undefined && scope !== "") {
        const parsed = typeof scope === "string" ? parseScopeParam(scope) : { scopes: [], unknown: ["?"], tooLong: true };
        if (parsed.tooLong || parsed.unknown.length || parsed.scopes.some((s) => !scopes.includes(s)) || !parsed.scopes.length) {
            return res.status(400).json({ error: "invalid_scope", error_description: "A refresh cannot add scopes" });
        }
        scopes = parsed.scopes;
    }

    const audience = current.audience || getMcpResourceUrl();
    if (resource !== undefined && (typeof resource !== "string" || normalizeResourceUrl(resource) !== audience)) {
        return res.status(400).json({ error: "invalid_target", error_description: `The only supported resource is ${audience}` });
    }

    // The user must still exist and pass the normal account checks (no support-account bypass)
    const user = await User.findById(current.userId).select("-password -verificationToken").maxTimeMS(5000);
    if (!user) return invalidGrant("User no longer exists");
    const authTimeMs = current.authTime ? new Date(current.authTime).getTime() : (current.createdAt ? new Date(current.createdAt).getTime() : 0);
    const block = await getUserAccessBlock(user, { issuedAtMs: authTimeMs, allowStatusBypass: false });
    if (block) {
        if (block.status === 401) await revokeTokenFamily(current); // password changed: the whole sign-in ends
        // Maintenance is temporary: keep the refresh token usable instead of forcing a new sign-in
        if (block.status === 503) return res.status(503).json({ error: "temporarily_unavailable", error_description: block.body.message });
        return invalidGrant(block.body.message);
    }

    // Atomic rotation: only one request can retire this refresh token; a parallel second one counts as reuse
    const now = new Date();
    const rotated = await OAuthToken.findOneAndUpdate(
        { _id: current._id, rotatedAt: null },
        { $set: { rotatedAt: now, accessTokenExpiresAt: now, refreshTokenExpiresAt: new Date(now.getTime() + ROTATED_REFRESH_KEEP_MS) } }
    );
    if (!rotated) {
        await revokeTokenFamily(current);
        return invalidGrant();
    }

    const { tokenDoc, response } = await issueTokens({
        client,
        userId: current.userId,
        scopes,
        audience,
        authCodeHash: current.authCodeHash,
        familyId: current.familyId || generateToken(16),
        authTime: current.authTime || current.createdAt || now
    });

    // A reuse that arrived while the new tokens were being written revoked the family without seeing them
    if (!(await OAuthToken.exists({ _id: current._id }))) {
        await OAuthToken.deleteOne({ _id: tokenDoc._id });
        return invalidGrant();
    }

    await OAuthClient.updateOne({ _id: client._id }, { $set: { lastUsedAt: now } });
    return res.json(response);
}

// Reads the token from "Authorization: Bearer <token>" (scheme is case-insensitive, extra spaces allowed).
// Never from the query string.
export function extractBearerToken(header) {
    if (typeof header !== "string") return null;
    const trimmed = header.trim();
    if (trimmed.length < 8 || trimmed.slice(0, 7).toLowerCase() !== "bearer ") return null;
    const token = trimmed.slice(7).trim();
    return token && !token.includes(" ") && token.length <= 512 ? token : null;
}

/**
 * Checks a Classgrid OAuth access token (for the MCP server, Phase 4). Never throws for a bad token.
 * Returns { ok: true, user, clientId, tokenId, scopes, audience } or { ok: false, status, error, description }.
 *   - looks the token up by its sha256 hash
 *   - rejects expired (or rotated-away) tokens
 *   - with { audience }, rejects tokens issued for any other resource (RFC 8707)
 *   - the user must still exist, and must pass the same account checks as a normal login
 *     (password changed after the user approved the app, global lock / maintenance, inactive user,
 *     suspended organization) with no support-account bypass
 */
export async function verifyOAuthAccessToken(rawToken, { audience } = {}) {
    const fail = (status, error, description) => ({ ok: false, status, error, description });
    if (typeof rawToken !== "string" || !rawToken || rawToken.length > 512) {
        return fail(401, "invalid_token", "Access token missing or malformed");
    }

    await connectDB();
    const oauthToken = await OAuthToken.findOne({ accessTokenHash: hashSecret(rawToken) }).lean();
    if (!oauthToken) {
        return fail(401, "invalid_token", "Access token is invalid");
    }
    if (!oauthToken.accessTokenExpiresAt || Date.now() >= new Date(oauthToken.accessTokenExpiresAt).getTime()) {
        return fail(401, "invalid_token", "Access token expired");
    }
    if (audience && (oauthToken.audience || null) !== audience) {
        return fail(401, "invalid_token", "Access token was issued for a different resource");
    }

    const user = await User.findById(oauthToken.userId).select("-password -verificationToken").maxTimeMS(5000);
    if (!user) {
        return fail(401, "invalid_token", "User no longer exists");
    }

    const issuedAt = oauthToken.authTime || oauthToken.createdAt;
    const issuedAtMs = issuedAt ? new Date(issuedAt).getTime() : 0;
    const block = await getUserAccessBlock(user, { issuedAtMs, allowStatusBypass: false });
    if (block) {
        // A password change kills the token (401); locks and suspensions are refusals (403/503)
        return block.status === 401
            ? fail(401, "invalid_token", block.body.message)
            : fail(block.status, "access_denied", block.body.message);
    }

    return {
        ok: true,
        user,
        clientId: oauthToken.clientId,
        tokenId: String(oauthToken._id),
        scopes: Array.isArray(oauthToken.scopes) ? oauthToken.scopes : [],
        audience: oauthToken.audience || null
    };
}

// Middleware to protect routes that require Classgrid OAuth Tokens. Not mounted on any route yet.
export const requireOAuthBearer = async (req, res, next) => {
    try {
        // Tokens are only ever issued for the MCP resource, so check the audience here too
        const result = await verifyOAuthAccessToken(extractBearerToken(req.headers.authorization), { audience: getMcpResourceUrl() });
        if (!result.ok) {
            if (result.status === 401) {
                res.set("WWW-Authenticate", `Bearer error="invalid_token", error_description="${result.description.replace(/"/g, "'")}"`);
            }
            return res.status(result.status).json({ error: result.error, error_description: result.description });
        }

        req.user = result.user; // Inject user just like standard auth
        req.oauthClient = result.clientId;
        req.oauthTokenId = result.tokenId;
        req.oauthScopes = result.scopes;
        req.realUser = null;
        req.isImpersonating = false;
        next();
    } catch (err) {
        console.error("OAuth Bearer Check Error:", err);
        res.status(500).json({ error: "server_error" });
    }
};

export default router;
