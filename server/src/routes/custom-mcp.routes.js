// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// /api/custom-mcp: custom MCP servers (custom plugins) each user adds in AI Hub > Plugins.
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import CustomMcpServer from "../models/CustomMcpServer.js";
import { encrypt } from "../utils/encryption.js";
import { MCP_CATALOG } from "../services/custom-mcp-catalog.js";
import {
    assertSafeUrl, createServer, finishLogin, forgetServer, listServersForUser, publicServer, refreshTools, saveIcon, startLogin,
} from "../services/custom-mcp.service.js";

const router = express.Router();
const uid = (req) => req.user?._id || req.user?.id;

async function ownServer(req, res) {
    const doc = await CustomMcpServer.findOne({ _id: req.params.id, userId: uid(req) }).catch(() => null);
    if (!doc) res.status(404).json({ success: false, message: "Connector not found." });
    return doc;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// OAuth comes back here (no login cookie needed: the state finds the server)
router.get("/oauth/callback", async (req, res) => {
    let ok = false;
    let message;
    let id = "";
    try {
        if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
        const doc = await finishLogin(req.query.state, req.query.code);
        id = String(doc._id);
        ok = doc.status === "connected";
        message = ok ? `${doc.name} is connected. You can close this window.` : `${doc.name}: ${doc.lastError || "logged in, but the server didn't answer."}`;
    } catch (err) {
        message = `Login didn't finish: ${err?.message || err}`;
    }
    const payload = JSON.stringify({ type: "custom_mcp_login", ok, id });
    res.set("Content-Type", "text/html").send(`<!doctype html><meta charset="utf-8"><title>Classgrid</title>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#111;color:#eee">
<p>${escapeHtml(message)}</p>
<script>try{window.opener&&window.opener.postMessage(${payload},"*")}catch(e){}${ok ? "setTimeout(function(){window.close()},800)" : ""}</script></body>`);
});

router.use(isAuthenticated);

router.get("/catalog", (req, res) => {
    res.json({ success: true, apps: MCP_CATALOG });
});

router.get("/", async (req, res) => {
    const docs = await listServersForUser(uid(req));
    res.json({ success: true, servers: docs.map(publicServer) });
});

router.post("/", async (req, res) => {
    try {
        const doc = await createServer(uid(req), req.body || {});
        res.json({ success: true, server: publicServer(doc) });
    } catch (err) {
        res.status(400).json({ success: false, message: err?.message || "Couldn't add the connector." });
    }
});

router.patch("/:id", async (req, res) => {
    const doc = await ownServer(req, res);
    if (!doc) return;
    try {
        const b = req.body || {};
        if (typeof b.name === "string" && b.name.trim()) doc.name = b.name.trim().slice(0, 60);
        if (typeof b.description === "string") doc.description = b.description.trim().slice(0, 300);
        if (typeof b.enabled === "boolean") doc.enabled = b.enabled;
        if (typeof b.iconUrl === "string") doc.iconUrl = await saveIcon(b.iconUrl);
        if (typeof b.apiKey === "string" && b.apiKey && doc.authType === "api_key") doc.apiKeyEnc = encrypt(b.apiKey);
        if (typeof b.url === "string" && b.url.trim() && b.url.trim() !== doc.url) {
            doc.url = (await assertSafeUrl(b.url.trim())).href;
            doc.oauthTokensEnc = null;
            doc.oauthClientEnc = null;
            doc.transport = null;
            doc.status = doc.authType === "oauth" ? "needs_login" : doc.status;
        }
        await doc.save();
        forgetServer(doc._id);
        res.json({ success: true, server: publicServer(doc) });
    } catch (err) {
        res.status(400).json({ success: false, message: err?.message || "Couldn't save." });
    }
});

router.delete("/:id", async (req, res) => {
    const doc = await ownServer(req, res);
    if (!doc) return;
    forgetServer(doc._id);
    await doc.deleteOne();
    res.json({ success: true });
});

// Re-reads the tool list (also checks the login still works)
router.post("/:id/refresh", async (req, res) => {
    const doc = await ownServer(req, res);
    if (!doc) return;
    forgetServer(doc._id);
    await refreshTools(doc);
    res.json({ success: true, server: publicServer(doc) });
});

// Login link for the popup. { url } to open, or { success, server } when it's already logged in.
router.get("/:id/login", async (req, res) => {
    const doc = await ownServer(req, res);
    if (!doc) return;
    try {
        const out = await startLogin(doc);
        if (out.authUrl) return res.json({ success: true, url: out.authUrl });
        await refreshTools(doc);
        res.json({ success: true, server: publicServer(doc) });
    } catch (err) {
        doc.status = "error";
        doc.lastError = String(err?.message || err).slice(0, 300);
        await doc.save();
        res.status(400).json({ success: false, message: `Couldn't start the login: ${doc.lastError}` });
    }
});

router.post("/:id/logout", async (req, res) => {
    const doc = await ownServer(req, res);
    if (!doc) return;
    doc.oauthTokensEnc = null;
    doc.status = doc.authType === "oauth" ? "needs_login" : doc.status;
    await doc.save();
    forgetServer(doc._id);
    res.json({ success: true, server: publicServer(doc) });
});

export default router;
