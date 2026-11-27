// When a person removes Classgrid from their Zoom account (on zoom.us, Manage > Added Apps > Remove), Zoom sends the
// app's event endpoint an "app_deauthorized" event; Classgrid must then delete everything it keeps from that Zoom
// account (Zoom Marketplace review, owner 2026-11-27: "build deauth, only for Zoom"). What is deleted is what the
// built-in Zoom plugin keeps, the same as Disconnect in Plugins: the tokens, their expiry and the account's Zoom id,
// email and name; and the person's Zoom (MCP) connection, which signs in with the same Zoom app.
//
// The event is matched by the Zoom user id Classgrid saves when Zoom is connected (users.zoom_user_id). Every event
// is checked against the app's Secret Token first (x-zm-signature, HMAC SHA-256 of "v0:<timestamp>:<body>"); one that
// is not signed by Zoom changes nothing.

import crypto from "node:crypto";

/** Zoom's signature over a webhook's body: "v0=" + HMAC SHA-256 of "v0:<timestamp>:<body>" with the Secret Token. */
export const zoomSignature = (timestamp, body, secret) =>
    `v0=${crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;

/** True when the request was signed by Zoom with our Secret Token (compared in constant time). */
export const isSignedByZoom = ({ signature, timestamp, body, secret }) => {
    if (!signature || !timestamp || !secret || typeof body !== "string") return false;
    const expected = zoomSignature(timestamp, body, secret);
    const a = Buffer.from(String(signature));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** The answer to Zoom's endpoint check ("endpoint.url_validation"), or null for any other event. */
export const urlValidationAnswer = (body, secret) => {
    if (body?.event !== "endpoint.url_validation" || !secret) return null;
    const plainToken = String(body?.payload?.plainToken || "");
    if (!plainToken) return null;
    return { plainToken, encryptedToken: crypto.createHmac("sha256", secret).update(plainToken).digest("hex") };
};

/** The Zoom account an "app_deauthorized" event is about ({ zoomUserId, accountId }), or null for any other event. */
export const deauthTarget = (body) => {
    if (body?.event !== "app_deauthorized") return null;
    const p = body.payload || {};
    const zoomUserId = String(p.user_id || p.object?.user_id || "").trim();
    if (!zoomUserId) return null;
    return { zoomUserId, accountId: String(p.account_id || p.object?.account_id || "").trim() || null };
};

/** The fields of a user that the built-in Zoom plugin keeps, all emptied (the same as Disconnect, plus the profile). */
export const ZOOM_CLEARED = Object.freeze({
    zoom_access_token: null,
    zoom_refresh_token: null,
    zoom_token_expiry: null,
    zoom_user_id: null,
    zoom_email: null,
    zoom_name: null,
});

/** A Zoom (MCP) connection: one signing in to Zoom's own MCP servers (the same Zoom app). */
export const isZoomMcpUrl = (url) => /^https:\/\/mcp(-[a-z]{2})?\.zoom\.us\//i.test(String(url || ""));

/**
 * Deletes what Classgrid keeps from the Zoom account in the event. `User` and `CustomMcpServer` are the models (given
 * so a test can use stand-ins). Returns how many Classgrid accounts were cleared.
 */
export async function forgetZoomAccount({ zoomUserId }, { User, CustomMcpServer }) {
    if (!zoomUserId) return 0;
    const users = await User.find({ zoom_user_id: zoomUserId }).select("_id").lean();
    if (!users.length) return 0;
    const ids = users.map((u) => u._id);
    await User.updateMany({ _id: { $in: ids } }, { $set: { ...ZOOM_CLEARED } });
    if (CustomMcpServer) {
        const servers = await CustomMcpServer.find({ userId: { $in: ids } }).select("_id url").lean();
        const zoomIds = servers.filter((s) => isZoomMcpUrl(s.url)).map((s) => s._id);
        if (zoomIds.length) {
            await CustomMcpServer.updateMany(
                { _id: { $in: zoomIds } },
                { $set: { oauthTokensEnc: null, oauthCodeVerifier: null, oauthState: null, status: "needs_login", tools: [], toolsFetchedAt: null } },
            );
        }
    }
    return ids.length;
}
