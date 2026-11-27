// The built-in Slack plugin's sign-in, sign-out and removal (owner, 2026-11-27, for the Slack Marketplace review).
//
// Scopes: only what slack_workspace_connector (mcp/tools.js) really calls. They must equal the "User Token Scopes" in
// the Slack app's settings (api.slack.com/apps > OAuth & Permissions): a scope asked for here and missing there fails
// the whole connect. Classgrid acts as the person (a user token); the app has no bot user.
//
// Keys come from the server's settings: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, and SLACK_SIGNING_SECRET for Slack's
// events (the app removed from a workspace, a person's token revoked: everything kept from that Slack account is
// deleted then, the same as Disconnect).

import crypto from "node:crypto";

// Searching messages (search_messages, scope search:read) is turned OFF (owner, 2026-11-28): Slack does not allow
// search:read for Marketplace apps. The code stays; true here asks for the scope again and gives the AI the action
// back (then search:read must be added to the Slack app's User Token Scopes again, or every connect fails).
export const SLACK_SEARCH_ON = false;

export const SLACK_USER_SCOPES = Object.freeze([
    "canvases:read",          // read_canvas (canvases.getContent)
    "canvases:write",         // create_canvas, update_canvas (canvases.create, canvases.edit)
    "channels:history",       // read_channel_messages, read_thread in public channels
    "channels:read",          // list_channels, search_channels (public)
    "channels:write",         // create_channel, archive_channel (public)
    "channels:write.invites", // invite_to_channel (public)
    "chat:write",             // send_message
    "groups:history",         // read_channel_messages, read_thread in private channels
    "groups:read",            // list_channels, search_channels (private)
    "groups:write",           // create_channel, archive_channel, invite_to_channel (private)
    ...(SLACK_SEARCH_ON ? ["search:read"] : []), // search_messages
    "users:read",             // list_users, search_users, read_user_profile; the person's own name at connect
    "users:read.email",       // members' emails in search_users and read_user_profile; the person's own email
]);

/** What Classgrid keeps from a Slack account, all emptied (Disconnect, removal, a revoked token). */
export const SLACK_CLEARED = Object.freeze({
    slack_access_token: null,
    slack_refresh_token: null,
    slack_email: null,
    slack_name: null,
    slack_user_id: null,
    slack_team_id: null,
});

// ── OAuth state: a random id; what it stands for stays on the server (Redis, 10 minutes) ──
export const STATE_TTL_SECONDS = 600;
export const stateKey = (state) => `slack:oauth:state:${state}`;
export const newState = () => crypto.randomBytes(24).toString("base64url");
export const isState = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(s);

/** A return address the callback may send the person back to: an http(s) URL, else null. */
export const safeReturnTo = (url) => {
    try {
        const u = new URL(String(url || ""));
        return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
    } catch {
        return null;
    }
};

// ── Requests from Slack ──
/** True when Slack signed the request with our signing secret, less than 5 minutes ago (compared in constant time). */
export const isSignedBySlack = ({ signature, timestamp, body, secret, now = Date.now() }) => {
    if (!signature || !timestamp || !secret || typeof body !== "string") return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
    const expected = `v0=${crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;
    const a = Buffer.from(String(signature));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Who an event is about: { teamId, userIds } for tokens_revoked (those people's tokens), { teamId, userIds: null }
 * for app_uninstalled (everyone in that workspace), or null for any other event.
 */
export const slackEventTarget = (body) => {
    if (body?.type !== "event_callback") return null;
    const teamId = String(body.team_id || "").trim();
    if (!teamId) return null;
    const type = body.event?.type;
    if (type === "app_uninstalled") return { teamId, userIds: null };
    if (type === "tokens_revoked") {
        const userIds = (body.event?.tokens?.oauth || []).map((u) => String(u || "").trim()).filter(Boolean);
        return userIds.length ? { teamId, userIds } : null;
    }
    return null;
};

/**
 * Deletes what Classgrid keeps from the Slack accounts in the event. `User` is the model (a stand-in in tests).
 * An account whose stored token still works is kept: tokens_revoked names the person, not the token, and Slack sends it
 * when an OLD token ends, also when the person has just connected again and holds a new one (owner, 2026-11-27: his
 * fresh connection was wiped minutes after he made it). `stillWorks(token)` asks Slack; without it nothing is checked.
 */
export async function forgetSlackAccounts({ teamId, userIds }, { User, stillWorks = null }) {
    if (!teamId) return 0;
    const query = userIds ? { slack_team_id: teamId, slack_user_id: { $in: userIds } } : { slack_team_id: teamId };
    const users = await User.find(query).select("_id slack_access_token").lean();
    const gone = [];
    for (const u of users) {
        if (stillWorks && u.slack_access_token && (await stillWorks(u.slack_access_token))) continue;
        gone.push(u._id);
    }
    if (!gone.length) return 0;
    await User.updateMany({ _id: { $in: gone } }, { $set: { ...SLACK_CLEARED } });
    return gone.length;
}

/** True unless Slack says the token is over (auth.test). A network failure counts as working: nothing is deleted on a guess. */
export async function slackTokenWorks(token, { fetchImpl = fetch } = {}) {
    try {
        const data = await fetchImpl("https://slack.com/api/auth.test", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
        return data?.ok === true || !isDeadTokenError(data?.error);
    } catch {
        return true;
    }
}

/** Slack's answer for a token that no longer works: the connection is over and is cleared. */
export const isDeadTokenError = (error) =>
    ["token_revoked", "invalid_auth", "account_inactive", "not_authed", "token_expired"].includes(String(error || ""));

// ── Calls to Slack with the person's token ──
/** Ends the token at Slack (auth.revoke). Never throws: a token Slack already ended is fine. */
export async function revokeSlackToken(token, { fetchImpl = fetch } = {}) {
    if (!token) return false;
    try {
        const data = await fetchImpl("https://slack.com/api/auth.revoke", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({}),
        }).then((r) => r.json());
        return !!data?.revoked;
    } catch {
        return false;
    }
}

/** The person's Slack ids, name and email (auth.test, then users.info with users:read / users:read.email). */
export async function slackProfile(token, { fetchImpl = fetch } = {}) {
    const auth = { Authorization: `Bearer ${token}` };
    const me = await fetchImpl("https://slack.com/api/auth.test", { method: "POST", headers: auth }).then((r) => r.json()).catch(() => null);
    if (!me?.ok) return {};
    const out = { slack_user_id: me.user_id || null, slack_team_id: me.team_id || null, slack_name: me.user || null };
    if (me.user_id) {
        const info = await fetchImpl(`https://slack.com/api/users.info?user=${encodeURIComponent(me.user_id)}`, { headers: auth })
            .then((r) => r.json()).catch(() => null);
        if (info?.ok) {
            out.slack_name = info.user?.real_name || info.user?.profile?.real_name || info.user?.name || out.slack_name;
            out.slack_email = info.user?.profile?.email || null;
        }
    }
    return out;
}
