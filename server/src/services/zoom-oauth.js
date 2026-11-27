// The Zoom app's two key pairs and installs that start on Zoom's side (owner, 2026-11-27, for the Zoom Marketplace
// review). A Zoom General app has a Development key (works only for the app owner's Zoom account while the app is a
// draft) and a Production key (works for everyone once Zoom publishes the app; Zoom's reviewers install with it).
//   ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET            the Development key (what the server always had)
//   ZOOM_PROD_CLIENT_ID / ZOOM_PROD_CLIENT_SECRET  the Production key
//   ZOOM_CONNECT_KEY=production                    "Connect" in Plugins starts with the Production key (after Zoom
//                                                  publishes the app); otherwise it starts with the Development key
// A sign-in code belongs to the key that started it, so a code is tried with each key (Production first); a code
// tried with the wrong key is refused by Zoom and stays usable for the right one. The key a user's tokens came from
// is kept (users.zoom_client_kind) so a refresh uses that key first.
//
// An install that starts on Zoom's side (the Marketplace "Add" button / the install link) comes back without our
// state, so the server cannot tell which Classgrid account it is for. The code is exchanged at once (it lives only
// minutes), the tokens are held for 15 minutes under a random id, and the web app, once the person is signed in,
// claims them for that account (POST /api/zoom/claim).

import crypto from "node:crypto";

/** The key pairs that are set, Production first. */
export const zoomClients = (env = process.env) => {
    const out = [];
    if (env.ZOOM_PROD_CLIENT_ID && env.ZOOM_PROD_CLIENT_SECRET) {
        out.push({ kind: "production", id: env.ZOOM_PROD_CLIENT_ID.trim(), secret: env.ZOOM_PROD_CLIENT_SECRET.trim() });
    }
    if (env.ZOOM_CLIENT_ID && env.ZOOM_CLIENT_SECRET) {
        out.push({ kind: "development", id: env.ZOOM_CLIENT_ID.trim(), secret: env.ZOOM_CLIENT_SECRET.trim() });
    }
    return out;
};

/** The key "Connect" in Plugins starts with. */
export const connectClient = (env = process.env) => {
    const all = zoomClients(env);
    const wantProd = String(env.ZOOM_CONNECT_KEY || "").trim().toLowerCase() === "production";
    return (wantProd && all.find((c) => c.kind === "production")) || all.find((c) => c.kind === "development") || all[0] || null;
};

const basic = (c) => Buffer.from(`${c.id}:${c.secret}`).toString("base64");

/** One call to Zoom's token endpoint with a key; the JSON answer. */
const tokenCall = async (client, body, fetchImpl) => {
    const res = await fetchImpl("https://zoom.us/oauth/token", {
        method: "POST",
        headers: { Authorization: `Basic ${basic(client)}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
    });
    return res.json().catch(() => ({ error: "bad_response" }));
};

/** Trades a sign-in code for tokens, trying the given key first, then the others. { tokens, kind } or throws. */
export async function exchangeZoomCode(code, redirectUri, { prefer = null, env = process.env, fetchImpl = fetch } = {}) {
    const all = zoomClients(env);
    const order = prefer ? [...all.filter((c) => c.kind === prefer), ...all.filter((c) => c.kind !== prefer)] : all;
    if (!order.length) throw new Error("Zoom is not set up on the server (no Zoom key)");
    const errors = [];
    for (const client of order) {
        const data = await tokenCall(client, { grant_type: "authorization_code", code, redirect_uri: redirectUri }, fetchImpl);
        if (data && data.access_token) return { tokens: data, kind: client.kind };
        errors.push(`${client.kind}: ${data?.error || "error"}${data?.reason ? ` (${data.reason})` : ""}`);
    }
    throw new Error(`Zoom API Error: ${errors.join("; ")}`);
}

/** New tokens from a refresh token, with the key the tokens came from first. { tokens, kind } or throws. */
export async function refreshZoomToken(refreshToken, { prefer = null, env = process.env, fetchImpl = fetch } = {}) {
    const all = zoomClients(env);
    const order = prefer ? [...all.filter((c) => c.kind === prefer), ...all.filter((c) => c.kind !== prefer)] : all;
    for (const client of order) {
        const data = await tokenCall(client, { grant_type: "refresh_token", refresh_token: refreshToken }, fetchImpl);
        if (data && data.access_token) return { tokens: data, kind: client.kind };
    }
    throw new Error("Zoom token expired");
}

/** Puts tokens on a user document (the same fields the callback always set) and remembers the key. */
export const applyZoomTokens = (user, tokens, kind) => {
    user.zoom_access_token = tokens.access_token;
    if (tokens.refresh_token) user.zoom_refresh_token = tokens.refresh_token;
    if (tokens.expires_in) user.zoom_token_expiry = new Date(Date.now() + tokens.expires_in * 1000);
    if (kind) user.zoom_client_kind = kind;
};

// ── Installs that start on Zoom's side ──
export const INSTALL_TTL_SECONDS = 15 * 60;
export const installKey = (id) => `zoom:install:${id}`;
export const newInstallId = () => crypto.randomBytes(24).toString("base64url");
export const isInstallId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(id);
