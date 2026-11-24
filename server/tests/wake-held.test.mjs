// A wake-up that is refused keeps its notes (services/chat-wake.service.js holdNotes / releaseHeld).
// Owner's tests, 2026-11-23 and 24: the limit ran out while helpers worked, their reports woke the chat, each wake-up
// was refused with HTTP 429 before anything was saved, and the reports (already taken off the waiting list and marked
// as given) were gone: the main AI said "Helper 1 never sent its final report".
// Checked here with the real wakeChat and wake-up, the model call and Redis as stand-ins:
//   - a wake-up refused for the limit (429) or the Claude credits (402): its notes are held, nothing is tried again
//   - the next message of that chat releases them, and the chat is woken with them, whole and in order
//   - a later wake-up of the chat takes the held notes along, first
//   - a wake-up that was answered, or failed for another reason, holds nothing
// Run: node --experimental-test-module-mocks --test tests/wake-held.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const lists = new Map();
const keys = new Map();
const list = (k) => lists.get(k) || [];
const redis = {
    get: async (k) => (keys.has(k) ? keys.get(k) : null),
    set: async (k, v, ...rest) => { if (rest.includes("NX") && keys.has(k)) return null; keys.set(k, String(v)); return "OK"; },
    del: async (...ks) => { for (const k of ks) { keys.delete(k); lists.delete(k); } return 1; },
    exists: async () => 0,
    hexists: async () => 0, // (the chat is not answering: a wake-up runs at once)
    llen: async (k) => list(k).length,
    lpop: async (k) => { const l = list(k); if (!l.length) return null; const v = l.shift(); lists.set(k, l); return v; },
    multi: () => {
        const ops = [];
        const chain = { rpush: (k, ...vs) => { ops.push(() => lists.set(k, [...list(k), ...vs])); return chain; }, expire: () => chain, exec: async () => { ops.forEach((f) => f()); return []; } };
        return chain;
    },
};
mock.module("../src/config/redis.js", { defaultExport: redis });
mock.module("../src/models/User.js", { defaultExport: { findById: () => ({ select: async () => ({ _id: "u1" }) }) } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ to: () => ({ emit() {} }) }) } });
mock.module("../src/services/remote-pc.service.js", { namedExports: { remoteChatOn: async () => false } });
let next = { answer: "ok" };
const asked = [];
mock.module("../src/services/whatsapp-call.service.js", { namedExports: { runAgentTask: async (_user, question) => { asked.push(question); return typeof next === "function" ? next() : next; } } });

const wake = await import("../src/services/chat-wake.service.js");
const HELD = "chatwake:held:chat-1";
const PENDING = "chatwake:pending:chat-1";
const settle = () => new Promise((r) => setTimeout(r, 30));
const REPORT = "Helper 1 (Map the pages) finished:\nThe whole report.";

test("what counts as refused: no answer and HTTP 429 or 402", () => {
    assert.equal(wake.wakeRefused({ answer: "", status: 429, quota: {} }), true);
    assert.equal(wake.wakeRefused({ answer: "", status: 402 }), true);
    assert.equal(wake.wakeRefused({ answer: "Here it is.", status: 429 }), false);
    assert.equal(wake.wakeRefused({ answer: "", status: 500 }), false);
    assert.equal(wake.wakeRefused({ answer: "", error: "network" }), false);
    assert.equal(wake.wakeRefused(null), false);
});

test("a wake-up refused for the limit keeps its notes, and is not tried again by itself", async () => {
    next = { answer: "", error: "Insufficient tokens.", quota: { resetDate: null }, status: 429, code: "ai_quota_exceeded" };
    await wake.wakeChat("u1", "chat-1", REPORT);
    await settle();
    assert.equal(asked.length, 1);
    assert.ok(asked[0].includes(REPORT));
    assert.deepEqual(list(HELD), [REPORT]);
    assert.deepEqual(list(PENDING), [], "not on the waiting list: the end of a wake-up would try it again at once");
    await settle();
    assert.equal(asked.length, 1);
});

test("the next message of the chat releases them, and the chat is woken with them", async () => {
    assert.equal(await wake.releaseHeld("chat-1"), 1);
    assert.deepEqual(list(HELD), []);
    assert.deepEqual(list(PENDING), [REPORT]);
    assert.equal(await wake.releaseHeld("chat-1"), 0, "once");
    // (that message's answer ends: the chat is woken with what waits)
    next = { answer: "Helper 1 has finished: ..." };
    await wake.wakeIfPending("u1", "chat-1");
    await settle();
    assert.equal(asked.length, 2);
    assert.ok(asked[1].includes(REPORT));
    assert.deepEqual(list(HELD), []);
    assert.deepEqual(list(PENDING), []);
});

test("a later wake-up of the chat takes the held notes along, first; refused again, all of them are held", async () => {
    asked.length = 0;
    await wake.holdNotes("chat-1", ["Helper 1 (A) finished:\nReport A"]);
    next = { answer: "", error: "You've used this week's Claude credits", status: 402, code: "claude_cap_reached" };
    await wake.wakeChat("u1", "chat-1", "Helper 2 (B) finished:\nReport B");
    await settle();
    assert.equal(asked.length, 1);
    assert.ok(asked[0].indexOf("Report A") < asked[0].indexOf("Report B"), "the older one first");
    assert.deepEqual(list(HELD), ["Helper 1 (A) finished:\nReport A", "Helper 2 (B) finished:\nReport B"]);
    // (answered this time)
    next = { answer: "Both are in." };
    await wake.wakeChat("u1", "chat-1", "Helper 3 (C) finished:\nReport C");
    await settle();
    assert.equal(asked.length, 2);
    for (const r of ["Report A", "Report B", "Report C"]) assert.ok(asked[1].includes(r), r);
    assert.deepEqual(list(HELD), []);
});

test("a wake-up that failed for another reason holds nothing", async () => {
    asked.length = 0;
    next = { answer: "", error: "the request failed (500)", status: 500 };
    await wake.wakeChat("u1", "chat-1", "Helper 4 (D) finished:\nReport D");
    await settle();
    assert.equal(asked.length, 1);
    assert.deepEqual(list(HELD), []);
});
