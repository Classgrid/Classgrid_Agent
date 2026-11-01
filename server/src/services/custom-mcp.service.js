// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Custom MCP servers (custom plugins): a user adds any remote MCP server by its URL, logs in (OAuth, an API key
 * or nothing), and the AI can use its tools through the custom_mcp_connector tool.
 *
 * - Streamable HTTP first, then the older SSE transport.
 * - OAuth uses the MCP SDK's auth() with discovery, dynamic client registration and PKCE; client info and
 *   tokens are saved encrypted on the CustomMcpServer document.
 * - Every request goes through safeFetch, which only allows https and refuses private, loopback and
 *   link-local addresses (also after redirects), so a user's URL can never reach our own servers.
 */
import dns from "dns/promises";
import net from "net";
import crypto from "crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { auth, UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import CustomMcpServer from "../models/CustomMcpServer.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { MCP_CATALOG } from "./custom-mcp-catalog.js";

export const MAX_SERVERS_PER_USER = 50;
const CALL_TIMEOUT_MS = 120000;
const MAX_RESULT_CHARS = 40000;

// ── Safe fetch ───────────────────────────────────────────────────────────────────────────────────────────

function isBlockedIp(ip) {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split(".").map(Number);
        return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
    }
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isBlockedIp(v6.slice(7));
    return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}

/** Throws when the URL is not https or points at a private / internal address. */
export async function assertSafeUrl(raw) {
    let url;
    try { url = new URL(String(raw)); } catch { throw new Error("That isn't a valid URL."); }
    if (url.protocol !== "https:") throw new Error("The server URL must start with https://");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error("This address is not allowed.");
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
    if (!addrs.length) throw new Error(`Couldn't find the server ${host}.`);
    if (addrs.some((a) => isBlockedIp(a.address))) throw new Error("This address is not allowed.");
    return url;
}

export async function safeFetch(input, init = {}, hops = 0) {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    await assertSafeUrl(href);
    const res = await fetch(input, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        if (hops >= 5) throw new Error("Too many redirects.");
        const next = new URL(res.headers.get("location"), href).href;
        const method = res.status === 303 ? "GET" : init.method;
        return safeFetch(next, { ...init, method, body: method === "GET" ? undefined : init.body }, hops + 1);
    }
    return res;
}

// ── OAuth provider saved on the document ─────────────────────────────────────────────────────────────────

const readJson = (enc) => { try { return enc ? JSON.parse(decrypt(enc)) : undefined; } catch { return undefined; } };

export function oauthRedirectUrl() {
    return `${process.env.BACKEND_URL || "https://api.classgrid.in"}/api/custom-mcp/oauth/callback`;
}

class DbOAuthProvider {
    constructor(doc) {
        this.doc = doc;
        this.authUrl = null;
    }
    get redirectUrl() { return oauthRedirectUrl(); }
    get clientMetadata() {
        return {
            client_name: "Classgrid AI",
            client_uri: "https://classgrid.in",
            logo_uri: "https://chat.classgrid.in/logo.png",
            redirect_uris: [oauthRedirectUrl()],
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            token_endpoint_auth_method: "none",
            ...(this.doc.oauthScope ? { scope: this.doc.oauthScope } : {}),
        };
    }
    async state() {
        const s = crypto.randomBytes(24).toString("hex");
        this.doc.oauthState = s;
        await this.doc.save();
        return s;
    }
    clientInformation() { return readJson(this.doc.oauthClientEnc); }
    async saveClientInformation(info) { this.doc.oauthClientEnc = encrypt(JSON.stringify(info)); await this.doc.save(); }
    tokens() { return readJson(this.doc.oauthTokensEnc); }
    async saveTokens(tokens) { this.doc.oauthTokensEnc = encrypt(JSON.stringify(tokens)); await this.doc.save(); }
    redirectToAuthorization(url) { this.authUrl = url.href; }
    async saveCodeVerifier(v) { this.doc.oauthCodeVerifier = v; await this.doc.save(); }
    codeVerifier() {
        if (!this.doc.oauthCodeVerifier) throw new Error("No login in progress.");
        return this.doc.oauthCodeVerifier;
    }
    async invalidateCredentials(scope) {
        if (scope === "all" || scope === "client") this.doc.oauthClientEnc = null;
        if (scope === "all" || scope === "tokens") this.doc.oauthTokensEnc = null;
        if (scope === "all" || scope === "verifier") this.doc.oauthCodeVerifier = null;
        await this.doc.save();
    }
}

/** Starts the OAuth login. Returns { authUrl } to open in a popup, or { authorized: true } when tokens still work. */
export async function startLogin(doc) {
    if (doc.authType !== "oauth") return { authorized: true };
    const provider = new DbOAuthProvider(doc);
    const result = await auth(provider, { serverUrl: doc.url, fetchFn: safeFetch, scope: doc.oauthScope || undefined });
    if (result === "REDIRECT" && provider.authUrl) return { authUrl: provider.authUrl };
    return { authorized: true };
}

/** Finishes the OAuth login from the callback (?code&state). Returns the server document. */
export async function finishLogin(state, code) {
    const doc = state ? await CustomMcpServer.findOne({ oauthState: String(state) }) : null;
    if (!doc) throw new Error("This login link has expired. Please try again.");
    const provider = new DbOAuthProvider(doc);
    await auth(provider, { serverUrl: doc.url, authorizationCode: String(code), fetchFn: safeFetch, scope: doc.oauthScope || undefined });
    doc.oauthState = null;
    doc.oauthCodeVerifier = null;
    await doc.save();
    await refreshTools(doc);
    return doc;
}

// ── Connecting and calling tools ─────────────────────────────────────────────────────────────────────────

const clientCache = new Map(); // server id -> { client, expires }
const CLIENT_TTL_MS = 5 * 60 * 1000;

function dropClient(id) {
    const hit = clientCache.get(String(id));
    clientCache.delete(String(id));
    if (hit) hit.client.close().catch(() => {});
}

function transportOptions(doc) {
    const opts = { fetch: safeFetch };
    if (doc.authType === "oauth") opts.authProvider = new DbOAuthProvider(doc);
    if (doc.authType === "api_key" && doc.apiKeyEnc) {
        const key = decrypt(doc.apiKeyEnc);
        const header = doc.apiKeyHeader || "Authorization";
        opts.requestInit = { headers: { [header]: /^authorization$/i.test(header) && !/^(bearer|basic)\s/i.test(key) ? `Bearer ${key}` : key } };
    }
    return opts;
}

async function openClient(doc) {
    const id = String(doc._id);
    const hit = clientCache.get(id);
    if (hit && hit.expires > Date.now()) { hit.expires = Date.now() + CLIENT_TTL_MS; return hit.client; }
    if (hit) dropClient(id);

    await assertSafeUrl(doc.url);
    const order = doc.transport === "sse" ? ["sse", "http"] : ["http", "sse"];
    let lastErr;
    for (const kind of order) {
        const client = new Client({ name: "Classgrid AI", version: "1.0.0" });
        const transport = kind === "http"
            ? new StreamableHTTPClientTransport(new URL(doc.url), transportOptions(doc))
            : new SSEClientTransport(new URL(doc.url), transportOptions(doc));
        try {
            await client.connect(transport, { timeout: 30000 });
            if (doc.transport !== kind) { doc.transport = kind; await doc.save(); }
            clientCache.set(id, { client, expires: Date.now() + CLIENT_TTL_MS });
            return client;
        } catch (err) {
            client.close().catch(() => {});
            if (err instanceof UnauthorizedError || /unauthori[sz]ed|401/i.test(String(err?.message))) throw new LoginNeeded();
            lastErr = err;
        }
    }
    throw lastErr || new Error("Couldn't connect to the server.");
}

export class LoginNeeded extends Error {
    constructor() { super("This server needs you to log in again."); this.loginNeeded = true; }
}

async function markLoginNeeded(doc) {
    doc.status = "needs_login";
    doc.lastError = "";
    await doc.save();
}

/** Connects, reads the tool list and saves it on the document. */
export async function refreshTools(doc) {
    try {
        const client = await openClient(doc);
        const tools = [];
        let cursor;
        for (let page = 0; page < 20; page++) {
            const res = await client.listTools(cursor ? { cursor } : {}, { timeout: 30000 });
            for (const t of res.tools || []) tools.push({ name: t.name, title: t.title || t.annotations?.title || "", description: String(t.description || "").slice(0, 1500), inputSchema: t.inputSchema || { type: "object" } });
            cursor = res.nextCursor;
            if (!cursor) break;
        }
        doc.tools = tools;
        doc.toolsFetchedAt = new Date();
        doc.status = "connected";
        doc.lastError = "";
        await doc.save();
        return doc;
    } catch (err) {
        dropClient(doc._id);
        if (err.loginNeeded) { await markLoginNeeded(doc); return doc; }
        doc.status = "error";
        doc.lastError = String(err?.message || err).slice(0, 300);
        await doc.save();
        return doc;
    }
}

function resultToText(result) {
    const parts = [];
    for (const c of result?.content || []) {
        if (c.type === "text") parts.push(c.text);
        else if (c.type === "image") parts.push(`[image ${c.mimeType || ""}]`);
        else if (c.type === "audio") parts.push(`[audio ${c.mimeType || ""}]`);
        else if (c.type === "resource") parts.push(c.resource?.text ?? `[file ${c.resource?.uri || ""}]`);
        else if (c.type === "resource_link") parts.push(`[link ${c.uri}${c.name ? " " + c.name : ""}]`);
    }
    if (result?.structuredContent && !parts.length) parts.push(JSON.stringify(result.structuredContent));
    let text = parts.join("\n\n") || "(no output)";
    if (text.length > MAX_RESULT_CHARS) text = text.slice(0, MAX_RESULT_CHARS) + `\n\n[cut: the result was ${text.length} characters long]`;
    return result?.isError ? `Error from the server: ${text}` : text;
}

/** Runs one tool on the server. Returns text for the AI. */
export async function callServerTool(doc, toolName, args = {}) {
    let client;
    try {
        client = await openClient(doc);
    } catch (err) {
        if (err.loginNeeded) { await markLoginNeeded(doc); throw err; }
        throw err;
    }
    try {
        const result = await client.callTool({ name: toolName, arguments: args || {} }, undefined, { timeout: CALL_TIMEOUT_MS });
        return resultToText(result);
    } catch (err) {
        dropClient(doc._id);
        if (err instanceof UnauthorizedError || /unauthori[sz]ed|401/i.test(String(err?.message))) { await markLoginNeeded(doc); throw new LoginNeeded(); }
        throw err;
    }
}

export function forgetServer(id) {
    dropClient(id);
}

// ── Logo ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The app's own logo: the known app's SVG, else the site's icon (SVG first), else Google's favicon. */
export async function findLogo(serverUrl) {
    let url;
    try { url = new URL(serverUrl); } catch { return ""; }
    const known = MCP_CATALOG.find((a) => new URL(a.url).hostname === url.hostname);
    if (known) return known.logo;
    const labels = url.hostname.split(".");
    const site = labels.length > 2 && /^(mcp|api|server|www|app)$/i.test(labels[0]) ? labels.slice(1).join(".") : url.hostname;
    try {
        const res = await safeFetch(`https://${site}/`, { signal: AbortSignal.timeout(5000), headers: { accept: "text/html" } });
        const html = (await res.text()).slice(0, 300000);
        const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /rel=["'][^"']*icon[^"']*["']/i.test(t));
        const pick = links.find((t) => /\.svg|image\/svg/i.test(t)) || links.find((t) => /apple-touch-icon/i.test(t)) || links[0];
        const href = pick?.match(/href=["']([^"']+)["']/i)?.[1];
        if (href) return new URL(href, `https://${site}/`).href;
    } catch { /* fall back */ }
    return `https://www.google.com/s2/favicons?domain=${site}&sz=128`;
}

// ── Shapes sent to the browser and the AI ────────────────────────────────────────────────────────────────

export function publicServer(doc) {
    return {
        id: String(doc._id),
        name: doc.name,
        description: doc.description,
        url: doc.url,
        catalogId: doc.catalogId,
        iconUrl: doc.iconUrl,
        invertInDarkMode: !!MCP_CATALOG.find((a) => a.id === doc.catalogId)?.invertInDarkMode,
        authType: doc.authType,
        apiKeyHeader: doc.authType === "api_key" ? doc.apiKeyHeader : undefined,
        hasApiKey: !!doc.apiKeyEnc,
        status: doc.status,
        lastError: doc.lastError,
        enabled: doc.enabled,
        tools: (doc.tools || []).map((t) => ({ name: t.name, title: t.title, description: t.description })),
        toolsFetchedAt: doc.toolsFetchedAt,
        createdAt: doc.createdAt,
    };
}

/** Creates a server for a user (from the form or from the AI) and tries it right away. */
export async function createServer(userId, input) {
    const name = String(input.name || "").trim().slice(0, 60);
    if (!name) throw new Error("Please give the connector a name.");
    const url = (await assertSafeUrl(String(input.url || "").trim())).href;
    const count = await CustomMcpServer.countDocuments({ userId });
    if (count >= MAX_SERVERS_PER_USER) throw new Error(`You can add up to ${MAX_SERVERS_PER_USER} connectors.`);
    const authType = ["oauth", "api_key", "none"].includes(input.authType) ? input.authType : "oauth";
    const icon = String(input.iconUrl || "");
    if (icon.startsWith("data:") && (!/^data:image\/png;base64,/.test(icon) || icon.length > 14000)) throw new Error("The icon must be a PNG of 10 KB or less.");
    const doc = new CustomMcpServer({
        userId,
        name,
        description: String(input.description || "").trim().slice(0, 300),
        url,
        catalogId: input.catalogId || null,
        iconUrl: icon || await findLogo(url),
        authType,
        apiKeyHeader: String(input.apiKeyHeader || "Authorization").trim() || "Authorization",
        apiKeyEnc: authType === "api_key" && input.apiKey ? encrypt(String(input.apiKey)) : null,
        oauthScope: String(input.oauthScope || "").trim(),
        oauthClientEnc: authType === "oauth" && input.oauthClientId
            ? encrypt(JSON.stringify({ client_id: String(input.oauthClientId).trim(), ...(input.oauthClientSecret ? { client_secret: String(input.oauthClientSecret) } : {}) }))
            : null,
        status: authType === "oauth" ? "needs_login" : "connected",
    });
    await doc.save();
    if (authType !== "oauth") await refreshTools(doc);
    return doc;
}

export async function listServersForUser(userId) {
    return CustomMcpServer.find({ userId }).sort({ createdAt: 1 });
}
