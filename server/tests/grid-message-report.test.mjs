// Share Grid: reporting a message someone else sent in a shared chat (services/ai-chat-grid.service.js
// reportGridMessage, 2026-11-25). Only a person in the chat may report, never their own message, and the report is
// kept as a ContentReport with the right fields. No database: the chat's rows and the accounts are stand-ins, and the
// report is checked against the real ContentReport schema without being saved.
// Run: node --experimental-test-module-mocks --test tests/grid-message-report.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const OWNER = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Nikhil", email: "nikhil@x.in" };
const ASHA = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Asha", email: "asha@x.in" };
const RAVI = { _id: "cccccccccccccccccccccccc", name: "Ravi", email: "ravi@x.in" };
const ACCOUNTS = [OWNER, ASHA, RAVI];

const SESSION = { id: "s1", title: "Trip plan", user_email: OWNER.email, is_incognito: false };

// ── The chat's rows: who is in it (Ravi left), and its messages ──
const tables = {
    ai_chat_grid_members: [
        { id: 1, session_id: "s1", user_email: OWNER.email, role: "owner", removed_at: null },
        { id: 2, session_id: "s1", user_email: ASHA.email, role: "member", removed_at: null },
        { id: 3, session_id: "s1", user_email: RAVI.email, role: "member", removed_at: "2026-11-20T10:00:00Z" },
    ],
    ai_chat_messages: [
        { id: "m-asha", session_id: "s1", role: "user", content: "Something   rude\nfrom Asha", sender_email: ASHA.email },
        { id: "m-old", session_id: "s1", role: "user", content: "Before it was shared", sender_email: null },
        { id: "m-ai", session_id: "s1", role: "assistant", content: "An answer", sender_email: null },
        { id: "m-long", session_id: "s1", role: "user", content: "x".repeat(1000), sender_email: ASHA.email },
        { id: "m-other-chat", session_id: "s2", role: "user", content: "Elsewhere", sender_email: ASHA.email },
    ],
};
const sb = {
    from(table) {
        const filters = [];
        const q = {
            select: () => q,
            eq: (col, value) => { filters.push((r) => r[col] === value); return q; },
            is: (col, value) => { filters.push((r) => r[col] === value); return q; },
            maybeSingle: async () => ({ data: (tables[table] || []).find((r) => filters.every((f) => f(r))) || null, error: null }),
        };
        return q;
    },
};
mock.module("../src/config/supabaseClient.js", { namedExports: { primarySupabaseClient: sb } });

const query = (rows) => {
    const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(rows).then(ok, bad) };
    return q;
};
mock.module("../src/models/User.js", {
    defaultExport: {
        find: () => query([]),
        findOne: (filter) => query(ACCOUNTS.find((u) => u.email === filter.email) || null),
    },
});

const { default: ContentReport } = await import("../src/models/ContentReport.js");
const created = [];
ContentReport.create = async (fields) => {
    // (checked against the real schema, then kept here instead of the database)
    const error = new ContentReport(fields).validateSync();
    if (error) throw error;
    created.push(fields);
    return fields;
};
ContentReport.exists = async (filter) =>
    created.some((r) => String(r.reportedBy) === String(filter.reportedBy) && r.contentId === filter.contentId) ? { _id: "x" } : null;

const { reportGridMessage } = await import("../src/services/ai-chat-grid.service.js");
const fresh = () => { created.length = 0; };

test("a member reports another person's message: kept with who, the chat, the message, the person, reason, note and preview", async () => {
    fresh();
    const result = await reportGridMessage(SESSION, "m-asha", OWNER, { reason: "harassment", description: "  Not okay  " });
    assert.deepEqual(result, { ok: true });
    assert.equal(created.length, 1);
    const r = created[0];
    assert.equal(String(r.reportedBy), OWNER._id);
    assert.equal(r.reportedByName, "Nikhil");
    assert.equal(r.contentType, "chat_message");
    assert.equal(r.contentId, "s1:m-asha");
    assert.equal(String(r.reportedUser), ASHA._id);
    assert.equal(r.reportedUserName, "Asha");
    assert.equal(r.reason, "harassment");
    assert.equal(r.description, "Not okay");
    assert.equal(r.contentPreview, 'Message in the shared chat "Trip plan": Something rude from Asha');
});

test("the preview keeps the same length as the doc and comment reports (240 characters of the text)", async () => {
    fresh();
    await reportGridMessage(SESSION, "m-long", OWNER, { reason: "spam" });
    assert.equal(created[0].contentPreview, `Message in the shared chat "Trip plan": ${"x".repeat(240)}`);
});

test("a member can report the owner's message, also one from before the chat was shared (no sender)", async () => {
    fresh();
    assert.deepEqual(await reportGridMessage(SESSION, "m-old", ASHA, { reason: "spam" }), { ok: true });
    assert.equal(String(created[0].reportedUser), OWNER._id);
    assert.equal(created[0].reportedUserName, "Nikhil");
});

test("nobody can report their own message", async () => {
    fresh();
    assert.deepEqual(await reportGridMessage(SESSION, "m-asha", ASHA, { reason: "spam" }), { error: "You can't report your own message.", status: 400 });
    assert.deepEqual(await reportGridMessage(SESSION, "m-old", OWNER, { reason: "spam" }), { error: "You can't report your own message.", status: 400 });
    assert.equal(created.length, 0);
});

test("only a person in the chat can report: someone who left, or was never in it, cannot", async () => {
    fresh();
    assert.equal((await reportGridMessage(SESSION, "m-asha", RAVI, { reason: "spam" })).status, 404);
    const stranger = { _id: "dddddddddddddddddddddddd", name: "Stranger", email: "stranger@x.in" };
    assert.equal((await reportGridMessage(SESSION, "m-asha", stranger, { reason: "spam" })).status, 404);
    assert.equal(created.length, 0);
});

test("only a person's message in this chat can be reported, with one of the report reasons", async () => {
    fresh();
    assert.equal((await reportGridMessage(SESSION, "m-ai", OWNER, { reason: "spam" })).status, 404);
    assert.equal((await reportGridMessage(SESSION, "m-other-chat", OWNER, { reason: "spam" })).status, 404);
    assert.equal((await reportGridMessage(SESSION, "nope", OWNER, { reason: "spam" })).status, 404);
    assert.deepEqual(await reportGridMessage(SESSION, "m-asha", OWNER, { reason: "rude" }), { error: "Pick what is wrong with this message.", status: 400 });
    assert.equal((await reportGridMessage(null, "m-asha", OWNER, { reason: "spam" })).status, 404);
    assert.equal((await reportGridMessage({ ...SESSION, is_incognito: true }, "m-asha", OWNER, { reason: "spam" })).status, 404);
    assert.equal(created.length, 0);
});

test("reporting the same message again while the first report waits keeps one report", async () => {
    fresh();
    await reportGridMessage(SESSION, "m-asha", OWNER, { reason: "spam" });
    assert.deepEqual(await reportGridMessage(SESSION, "m-asha", OWNER, { reason: "harassment" }), { ok: true });
    assert.equal(created.length, 1);
});
