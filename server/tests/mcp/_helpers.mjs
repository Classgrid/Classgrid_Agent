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
// Shared setup for the OAuth + remote MCP tests (node --test tests/mcp/*.test.mjs).
// No servers, no ports, no network, no real MongoDB / Redis / Supabase: every model method the routes
// touch is swapped for an in-memory version, and route handlers are called with fake req/res objects.

// Fixed env BEFORE any server module loads. Some modules call dotenv, which never overrides a variable
// that is already set, so these win over server/.env.
process.env.NODE_ENV = "test"; // keeps the ioredis client in lazyConnect mode (never connects)
process.env.MCP_ENABLED = "false";
process.env.MCP_RESOURCE_URL = "https://api.classgrid.in/mcp";
process.env.OAUTH_ISSUER = "https://api.classgrid.in";
process.env.OAUTH_CONSENT_URL = "https://chat.classgrid.in/oauth/authorize";
// Blank every connection string so nothing that loads at import time can reach a real service
// (src/config/logger.js would otherwise open a winston-mongodb connection to MONGO_URI).
for (const key of ["MONGO_URI", "MONGODB_URI", "REDIS_URL", "SUPABASE_URL", "SUPABASE_CHAT_URL", "SUPABASE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_CHAT_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SLACK_WEBHOOK_URL",
    "BREVO_SMTP_HOST", "AWS_SES_SMTP_HOST", "TENANT_RESOLVER_API_BASE_URL"]) {
    process.env[key] = "";
}

// Hard guard: any outgoing TCP/TLS connection throws, so a test can never touch a real database or URL.
import net from "node:net";
import tls from "node:tls";
const blockNetwork = (kind) => (...args) => {
    const opts = typeof args[0] === "object" && args[0] ? args[0] : { port: args[0], host: args[1] };
    throw new Error(`Network access blocked in tests (${kind} ${opts.host || opts.servername || opts.path || ""}:${opts.port || ""})`);
};
net.connect = net.createConnection = blockNetwork("net");
tls.connect = blockNetwork("tls");

export const RESOURCE = "https://api.classgrid.in/mcp";
export const ISSUER = "https://api.classgrid.in";
export const META_URL = "https://api.classgrid.in/.well-known/oauth-protected-resource/mcp";

// ---------- in-memory OAuth stores ----------
export async function setupOAuth() {
    const mongoose = (await import("mongoose")).default;
    // connectDB() returns the cached connection instead of connecting
    global.mongoose = { conn: { fake: true }, promise: null };

    const routes = await import("../../src/routes/oauth.provider.routes.js");
    const { OAuthClient, OAuthAuthRequest, OAuthAuthCode, OAuthUsedCode, OAuthToken } = await import("../../src/models/OAuth.js");
    const User = (await import("../../src/models/User.js")).default;
    const SystemSettings = (await import("../../src/models/SystemSettings.js")).default;
    const Organization = (await import("../../src/models/Organization.js")).default;
    // Report "connected" only after the models compiled (earlier, mongoose would try to open collections)
    Object.defineProperty(mongoose.connection, "readyState", { get: () => 1, configurable: true });

    const db = { clients: [], requests: [], codes: [], used: [], tokens: [], users: {}, settings: null };
    const chain = (v) => ({ select() { return this; }, lean() { return this; }, maxTimeMS() { return this; }, then(r, j) { return Promise.resolve(v).then(r, j); } });
    const match = (doc, f) => Object.entries(f).every(([k, v]) => {
        if (v === null) return doc[k] === null || doc[k] === undefined;
        if (v && typeof v === "object" && !(v instanceof Date) && "$gt" in v) return doc[k] > v.$gt;
        return String(doc[k]) === String(v);
    });
    const applySet = (d, u) => { Object.assign(d, u.$set || {}); for (const k of Object.keys(u.$unset || {})) delete d[k]; };

    OAuthClient.findOne = (f) => chain(db.clients.find((d) => match(d, f)) || null);
    OAuthClient.updateOne = async (f, u) => { const d = db.clients.find((x) => match(x, f)); if (d) applySet(d, u); return {}; };
    OAuthClient.prototype.save = async function () { db.clients.push(this.toObject()); return this; };
    OAuthAuthRequest.prototype.save = async function () { db.requests.push(this.toObject()); return this; };
    OAuthAuthRequest.findOne = (f) => chain(db.requests.find((d) => match(d, f)) || null);
    OAuthAuthRequest.findOneAndUpdate = async (f, u) => { const d = db.requests.find((x) => match(x, f)); if (d) applySet(d, u); return d || null; };
    OAuthAuthCode.prototype.save = async function () { db.codes.push(this.toObject()); return this; };
    OAuthAuthCode.findOneAndDelete = async (f) => { const i = db.codes.findIndex((d) => match(d, f)); return i < 0 ? null : db.codes.splice(i, 1)[0]; };
    OAuthAuthCode.deleteMany = async (f) => { db.codes = db.codes.filter((d) => !match(d, f)); return {}; };
    OAuthUsedCode.create = async (doc) => { if (db.used.some((d) => d.codeHash === doc.codeHash)) { const e = new Error("dup"); e.code = 11000; throw e; } db.used.push({ ...doc, reusedAt: null }); return doc; };
    OAuthUsedCode.findOneAndUpdate = async (f, u) => { const d = db.used.find((x) => match(x, f)); if (d) applySet(d, u); return d || null; };
    OAuthUsedCode.findOne = (f) => chain(db.used.find((x) => match(x, f)) || null);
    OAuthToken.prototype.save = async function () { const o = this.toObject(); o.createdAt = new Date(); db.tokens.push(o); return this; };
    OAuthToken.findOne = (f) => chain(db.tokens.find((d) => match(d, f)) || null);
    OAuthToken.findOneAndUpdate = async (f, u) => { const d = db.tokens.find((x) => match(x, f)); if (!d) return null; const before = { ...d }; applySet(d, u); return before; };
    OAuthToken.exists = async (f) => (db.tokens.some((d) => match(d, f)) ? { _id: 1 } : null);
    OAuthToken.deleteMany = async (f) => { db.tokens = db.tokens.filter((d) => !match(d, f)); return {}; };
    OAuthToken.deleteOne = async (f) => { db.tokens = db.tokens.filter((d) => !match(d, f)); return {}; };
    User.findById = (id) => chain(db.users[String(id)] || null);
    SystemSettings.findOne = () => chain(db.settings);
    Organization.findById = () => chain({ status: "active" });

    const router = routes.default;
    // The route's own handler, skipping rate limiter / origin / session middleware
    const handlerFor = (method, p) => {
        const layer = router.stack.find((l) => l.route && l.route.path === p && l.route.methods[method]);
        if (!layer) throw new Error(`no route ${method} ${p}`);
        const stack = layer.route.stack;
        return stack[stack.length - 1].handle;
    };
    const call = async (method, p, req = {}) => {
        const res = fakeRes();
        const accept = req.accept || "json";
        await handlerFor(method, p)({ headers: {}, query: {}, body: {}, accepts: () => accept, ...req }, res);
        return res;
    };

    return { mongoose, routes, db, call };
}

export function fakeRes() {
    const res = { statusCode: 200, headers: {}, body: undefined, location: null, html: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    res.set = (k, v) => { if (typeof k === "object") Object.assign(res.headers, k); else res.headers[k] = v; return res; };
    res.setHeader = res.set;
    res.type = () => res;
    res.send = (b) => { res.html = b; return res; };
    res.redirect = (u) => { res.statusCode = 302; res.location = u; return res; };
    return res;
}

// Runs fn with console.warn/error muted (expected "replay detected" style logs)
export async function quiet(fn) {
    const w = console.warn, e = console.error;
    console.warn = console.error = () => {};
    try { return await fn(); } finally { console.warn = w; console.error = e; }
}
