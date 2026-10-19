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
// node --test server/tests/end-conversation.test.mjs
// Pure-logic tests for the end_conversation tool: the Supabase client is mocked.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

// ── mock ../config/supabaseClient.js ─────────────────────────────────────────
const db = { rows: {} };
function table() {
  let id, patch, selected;
  const q = {
    update(p) { patch = p; return q; },
    select() { selected = true; return q; },
    eq(_k, v) { id = v; if (patch) { db.rows[id] = { ...(db.rows[id] || {}), ...patch }; } return q; },
    single() { return Promise.resolve({ data: db.rows[id] || null, error: null }); },
    then(r) { return Promise.resolve({ data: null, error: null }).then(r); },
  };
  return q;
}
const mockSupabase = { primarySupabaseClient: { from: () => table() } };
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req.endsWith("config/supabaseClient.js")) return mockSupabase;
  return origLoad.call(this, req, ...rest);
};
// ESM import after the CJS hook is in place (service is ESM; use a data URL shim via dynamic import of the file)
const svc = await import("../src/services/ai-end-conversation.service.js").catch(async () => {
  // Fallback: load source and rewrite the import to the mock.
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../src/services/ai-end-conversation.service.js", import.meta.url), "utf8")
    .replace('from "../config/supabaseClient.js"', 'from "data:text/javascript,export const primarySupabaseClient = globalThis.__mockSupabase;"');
  globalThis.__mockSupabase = mockSupabase.primarySupabaseClient;
  return import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
});
const { detectCrisis, recentUserTexts, buildEndConversationHandlers } = svc;

const mkRes = () => { const w = []; return { writableEnded: false, write: (s) => w.push(s), written: w }; };

test("detectCrisis flags self-harm and harm-to-others, ignores normal text", () => {
  assert.equal(detectCrisis(["I want to kill myself"]), true);
  assert.equal(detectCrisis(["jeena nahi chahta"]), true);
  assert.equal(detectCrisis(["I will hurt them tomorrow"]), true);
  assert.equal(detectCrisis(["please end this chat"]), false);
  assert.equal(detectCrisis(["you are useless, end it"]), false);
});

test("recentUserTexts pulls only user turns plus the live question", () => {
  const msgs = [{ role: "system", content: "x" }, { role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: [{ type: "text", text: "c" }] }];
  assert.deepEqual(recentUserTexts(msgs, "q"), ["c", "a", "q"]);
});

test("user_requested: first call asks for confirmation, second call ends and emits chat_ended", async () => {
  db.rows = { s1: { id: "s1" } };
  const res = mkRes();
  const h = buildEndConversationHandlers({ sessionId: "s1", isIncognito: false, messages: [], question: "yes end it", res, log: { error() {} } });
  const first = await h.end_conversation({ reason: "user_requested" });
  assert.match(first, /^CONFIRMATION_REQUIRED/);
  assert.equal(db.rows.s1.ended, undefined);
  const second = await h.end_conversation({ reason: "user_requested", confirm: true });
  assert.match(second.text, /^ENDED/);
  assert.equal(typeof second.stopAnswer, "string");
  assert.equal(db.rows.s1.ended, true);
  assert.equal(db.rows.s1.end_reason, "user_requested");
  assert.ok(res.written.some((s) => s.includes('"type":"chat_ended"')));
});

test("confirm=true on the first call ends the chat in one tool call", async () => {
  db.rows = { s2: { id: "s2" } };
  const h = buildEndConversationHandlers({ sessionId: "s2", isIncognito: false, messages: [], question: "yes end it", res: mkRes() });
  const r = await h.end_conversation({ reason: "user_requested", confirm: true });
  assert.match(r.text, /^ENDED/);
  assert.equal(db.rows.s2.ended, true);
});

test("abusive_after_warning is refused without a recorded warning, allowed after warn_user", async () => {
  db.rows = { s3: { id: "s3" } };
  const h = buildEndConversationHandlers({ sessionId: "s3", isIncognito: false, messages: [], question: "idiot", res: mkRes() });
  assert.match(await h.end_conversation({ reason: "abusive_after_warning" }), /^REFUSED: no warning/);
  assert.match(await h.warn_user({ behavior: "repeated insults" }), /^OK/);
  assert.ok(db.rows.s3.warned_at);
  assert.match(await h.end_conversation({ reason: "abusive_after_warning" }), /^CONFIRMATION_REQUIRED/);
  assert.match((await h.end_conversation({ reason: "abusive_after_warning", confirm: true })).text, /^ENDED/);
  assert.equal(db.rows.s3.ended, true);
});

test("crisis in recent messages blocks both warn_user and end_conversation", async () => {
  db.rows = { s4: { id: "s4" } };
  const msgs = [{ role: "user", content: "I don't want to live anymore" }, { role: "assistant", content: "I'm here with you." }];
  const h = buildEndConversationHandlers({ sessionId: "s4", isIncognito: false, messages: msgs, question: "just end this chat", res: mkRes() });
  assert.match(await h.warn_user({ behavior: "x" }), /^REFUSED/);
  assert.match(await h.end_conversation({ reason: "user_requested" }), /^REFUSED/);
  assert.match(await h.end_conversation({ reason: "user_requested", confirm: true }), /^REFUSED/);
  assert.equal(db.rows.s4.ended, undefined);
});

test("incognito / unsaved chats cannot be ended", async () => {
  const h = buildEndConversationHandlers({ sessionId: null, isIncognito: true, messages: [], question: "end", res: mkRes() });
  assert.match(await h.end_conversation({ reason: "user_requested" }), /^ERROR: this is an incognito/);
});

test("invalid reason is rejected", async () => {
  const h = buildEndConversationHandlers({ sessionId: "s5", isIncognito: false, messages: [], question: "", res: mkRes() });
  assert.match(await h.end_conversation({ reason: "bored" }), /^ERROR: end_conversation needs reason/);
});
