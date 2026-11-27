// The Slack plugin's sign-in, sign-out and removal (services/slack-auth.js; owner 2026-11-27, Slack Marketplace review).
// Checked here:
//   - only the scopes the Slack tool calls are asked for, and every Slack method in the tool is covered
//   - Slack's signature: the right one is taken; a wrong, changed, missing or old one is refused
//   - app_uninstalled clears the whole workspace, tokens_revoked only the named people, other events nothing
//   - Disconnect ends the token at Slack; a dead token is known by Slack's error
//   - the connect state is random and checked; only http(s) return addresses are kept
// Slack and the database are stand-ins: nothing real is called. Run: node --test tests/slack-auth.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
    forgetSlackAccounts, isDeadTokenError, isSignedBySlack, isState, newState, revokeSlackToken, safeReturnTo, SLACK_CLEARED,
    SLACK_USER_SCOPES, slackEventTarget, slackProfile,
} from "../src/services/slack-auth.js";

test("only the scopes the Slack tool uses, and they cover every method it calls", () => {
    const tools = fs.readFileSync(new URL("../src/mcp/tools.js", import.meta.url), "utf8");
    const start = tools.indexOf("if (name === 'slack_workspace_connector')");
    const block = tools.slice(start, tools.indexOf("if (name === 'github_workspace_connector')", start));
    const methods = new Set([...block.matchAll(/slack\.com\/api\/([a-zA-Z.]+)/g)].map((m) => m[1]));
    const needs = {
        "conversations.list": ["channels:read", "groups:read"],
        "conversations.history": ["channels:history", "groups:history"],
        "conversations.replies": ["channels:history", "groups:history"],
        "chat.postMessage": ["chat:write"],
        "conversations.create": ["channels:write", "groups:write"],
        "conversations.invite": ["channels:write.invites", "groups:write"],
        "conversations.archive": ["channels:write", "groups:write"],
        "users.list": ["users:read", "users:read.email"],
        "users.info": ["users:read", "users:read.email"],
        "search.messages": ["search:read"],
        "canvases.create": ["canvases:write"],
        "conversations.canvases.create": ["canvases:write"],
        "conversations.info": ["channels:read", "groups:read"],
        "canvases.edit": ["canvases:write"],
        "canvases.getContent": ["canvases:read"],
    };
    for (const m of methods) {
        assert.ok(needs[m], `the Slack tool calls ${m}: add it here with its scopes`);
        for (const s of needs[m]) assert.ok(SLACK_USER_SCOPES.includes(s), `${m} needs ${s}`);
    }
    const used = new Set(Object.values(needs).flat());
    for (const s of SLACK_USER_SCOPES) assert.ok(used.has(s), `${s} is asked for but nothing uses it`);
    assert.equal(SLACK_USER_SCOPES.length, 13);
});

const SECRET = "a-secret-only-this-test-knows";
const sign = (ts, body) => `v0=${crypto.createHmac("sha256", SECRET).update(`v0:${ts}:${body}`).digest("hex")}`;

test("Slack's signature is checked", () => {
    const now = 1_800_000_000_000;
    const ts = String(now / 1000);
    const body = '{"type":"event_callback","team_id":"T1","event":{"type":"app_uninstalled"},"x":"a\\/b"}';
    const signature = sign(ts, body);
    assert.equal(isSignedBySlack({ signature, timestamp: ts, body, secret: SECRET, now }), true);
    assert.equal(isSignedBySlack({ signature, timestamp: ts, body: body.replace("T1", "T2"), secret: SECRET, now }), false);
    assert.equal(isSignedBySlack({ signature: "v0=bad", timestamp: ts, body, secret: SECRET, now }), false);
    assert.equal(isSignedBySlack({ signature, timestamp: ts, body, secret: "", now }), false);
    assert.equal(isSignedBySlack({ signature: undefined, timestamp: ts, body, secret: SECRET, now }), false);
    // older than 5 minutes: refused even with a right signature
    assert.equal(isSignedBySlack({ signature, timestamp: ts, body, secret: SECRET, now: now + 301_000 }), false);
});

test("which accounts an event is about", () => {
    assert.deepEqual(slackEventTarget({ type: "event_callback", team_id: "T1", event: { type: "app_uninstalled" } }), { teamId: "T1", userIds: null });
    assert.deepEqual(
        slackEventTarget({ type: "event_callback", team_id: "T1", event: { type: "tokens_revoked", tokens: { oauth: ["U1", "U2"], bot: ["B1"] } } }),
        { teamId: "T1", userIds: ["U1", "U2"] },
    );
    assert.equal(slackEventTarget({ type: "event_callback", team_id: "T1", event: { type: "tokens_revoked", tokens: { bot: ["B1"] } } }), null);
    assert.equal(slackEventTarget({ type: "event_callback", team_id: "T1", event: { type: "message" } }), null);
    assert.equal(slackEventTarget({ type: "event_callback", event: { type: "app_uninstalled" } }), null);
    assert.equal(slackEventTarget({ type: "url_verification", challenge: "x" }), null);
});

// ── A stand-in database ──
const stores = () => {
    const users = [
        { _id: "a", slack_team_id: "T1", slack_user_id: "U1", slack_access_token: "x1", slack_name: "A" },
        { _id: "b", slack_team_id: "T1", slack_user_id: "U2", slack_access_token: "x2" },
        { _id: "c", slack_team_id: "T2", slack_user_id: "U1", slack_access_token: "x3" },
    ];
    const match = (row, q) => Object.entries(q).every(([k, v]) => (v && typeof v === "object" && "$in" in v ? v.$in.includes(row[k]) : row[k] === v));
    const User = {
        find: (q) => ({ select: () => ({ lean: async () => users.filter((r) => match(r, q)).map((r) => ({ ...r })) }) }),
        updateMany: async (q, { $set }) => { for (const r of users) if (match(r, q)) Object.assign(r, $set); },
    };
    return { users, User };
};

test("tokens_revoked clears only those people in that workspace", async () => {
    const s = stores();
    assert.equal(await forgetSlackAccounts({ teamId: "T1", userIds: ["U1"] }, s), 1);
    for (const k of Object.keys(SLACK_CLEARED)) assert.equal(s.users[0][k], null, k);
    assert.equal(s.users[1].slack_access_token, "x2");
    assert.equal(s.users[2].slack_access_token, "x3");
});

test("app_uninstalled clears everyone in that workspace, and nobody else", async () => {
    const s = stores();
    assert.equal(await forgetSlackAccounts({ teamId: "T1", userIds: null }, s), 2);
    assert.equal(s.users[0].slack_access_token, null);
    assert.equal(s.users[1].slack_access_token, null);
    assert.equal(s.users[2].slack_access_token, "x3");
    assert.equal(await forgetSlackAccounts({ teamId: "", userIds: null }, s), 0);
});

test("Disconnect ends the token at Slack, and never throws", async () => {
    const calls = [];
    const ok = await revokeSlackToken("xoxp-1", { fetchImpl: async (url, opts) => { calls.push([url, opts.headers.Authorization]); return { json: async () => ({ ok: true, revoked: true }) }; } });
    assert.equal(ok, true);
    assert.deepEqual(calls, [["https://slack.com/api/auth.revoke", "Bearer xoxp-1"]]);
    assert.equal(await revokeSlackToken("xoxp-1", { fetchImpl: async () => { throw new Error("offline"); } }), false);
    assert.equal(await revokeSlackToken(null), false);
});

test("a dead token is known by Slack's error", () => {
    for (const e of ["token_revoked", "invalid_auth", "account_inactive", "not_authed"]) assert.equal(isDeadTokenError(e), true, e);
    for (const e of ["channel_not_found", "ratelimited", "", undefined]) assert.equal(isDeadTokenError(e), false, String(e));
});

test("the person's Slack ids, name and email", async () => {
    const fetchImpl = async (url) => ({
        json: async () => (url.includes("auth.test")
            ? { ok: true, user_id: "U9", team_id: "T9", user: "nik" }
            : { ok: true, user: { name: "nik", real_name: "Nikhil", profile: { email: "n@x.test" } } }),
    });
    assert.deepEqual(await slackProfile("t", { fetchImpl }), { slack_user_id: "U9", slack_team_id: "T9", slack_name: "Nikhil", slack_email: "n@x.test" });
    assert.deepEqual(await slackProfile("t", { fetchImpl: async () => ({ json: async () => ({ ok: false, error: "invalid_auth" }) }) }), {});
});

test("the connect state and the return address", () => {
    const a = newState();
    assert.notEqual(a, newState());
    assert.equal(isState(a), true);
    assert.equal(isState("eyJ1c2VySWQiOiIxIn0="), false);
    assert.equal(isState(undefined), false);
    assert.equal(safeReturnTo("https://chat.classgrid.in/c/1"), "https://chat.classgrid.in/c/1");
    assert.equal(safeReturnTo("javascript:alert(1)"), null);
    assert.equal(safeReturnTo(""), null);
});
