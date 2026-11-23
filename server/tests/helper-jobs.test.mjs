// A background command a helper started belongs to that helper (owner's test, 2026-11-23: three slow folder listings
// of three helpers woke the main agent three times, each an answer of its own, for results it never asked for).
// Checked here, with the real local-runner.service.js and chat-wake.service.js:
//   - a helper's command that goes to the background: the helper is told its result comes with a later step (not
//     "you are woken"), and the job is remembered as that helper's
//   - the main AI's own command: as before ("you are woken automatically"), nothing remembered
//   - the job ends: a helper's goes to that helper (once) and the chat is NOT woken; the chat's own wakes the chat
//   - a helper that has finished takes nothing, and the chat is still not woken
// Nothing is sent anywhere: the socket, Redis and the database are stand-ins.
// Run: node --experimental-test-module-mocks --test tests/helper-jobs.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const STILL = (id) => `(no output yet)\n[Still running after 120 seconds, so it keeps running in the background as job_id ${id}. Wait for it to finish with check_background_command (wait_seconds up to 120), or stop it with stop_background_command.]`;
let answer = STILL("job-1");
const sock = { timeout: () => ({ emitWithAck: async (_ev, payload) => ({ text: payload.tool === "ping" ? "ok" : answer }) }), disconnect() {} };
const io = { local: { in: () => ({ fetchSockets: async () => [sock] }) }, in: () => ({ fetchSockets: async () => [sock] }), to: () => ({ emit() {} }) };
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => io } });
mock.module("../src/services/ide-project.service.js", { namedExports: { projectForChat: async () => null } });
const store = new Map();
const lists = new Map();
const redis = {
    get: async (k) => (store.has(k) ? store.get(k) : null),
    set: async (k, v) => { store.set(k, String(v)); return "OK"; },
    del: async (...keys) => { for (const k of keys) store.delete(k); return 1; },
    exists: async () => 0,
    hexists: async () => 1, // (the chat counts as answering: a wake-up is only queued, no answer is started)
    llen: async (k) => (lists.get(k) || []).length,
    multi: () => {
        const ops = [];
        const chain = { rpush: (k, v) => { ops.push(() => lists.set(k, [...(lists.get(k) || []), v])); return chain; }, expire: () => chain, exec: async () => { ops.forEach((f) => f()); return []; } };
        return chain;
    },
};
mock.module("../src/config/redis.js", { defaultExport: redis });
mock.module("../src/models/User.js", { defaultExport: {} });

const runner = await import("../src/services/local-runner.service.js");
const { helperScope } = await import("../src/utils/step-scope.js");
const jobs = await import("../src/utils/helper-jobs.js");
const wake = await import("../src/services/chat-wake.service.js");
const pending = () => [...lists.values()].flat();

test("a helper's command that goes to the background: told its result comes with a later step, and the job is remembered as its own", async () => {
    answer = STILL("job-1");
    const r = await helperScope.run({ helper: 2 }, () => runner.callRunner("u1", "execute_terminal_command", { command: "dir /s" }, "chat-1"));
    assert.match(r.text, /so: It keeps running in the background as job_id job-1\. Don't check it again and again: its result and exit code come to you by themselves, with the result of one of your next steps, when it ends\./);
    assert.equal(r.text.includes("you are woken"), false);
    assert.equal(store.get("ai:helperjob:job-1"), "2");
});

test("the main AI's own command: as before, and nothing is remembered", async () => {
    answer = STILL("job-9");
    const r = await runner.callRunner("u1", "execute_terminal_command", { command: "npm run build" }, "chat-1");
    assert.match(r.text, /so: It keeps running in the background as job_id job-9\. Don't wait for it and don't check it again and again: you are woken automatically/);
    assert.equal(store.has("ai:helperjob:job-9"), false);
});

test("a helper's job ends: its result goes to that helper, once, and the chat is not woken", async () => {
    const got = [];
    jobs.setHelperJobSink((chat, helper, text) => { got.push({ chat, helper, text }); return true; });
    await wake.onLocalJobDone("u1", { chat: "chat-1", jobId: "job-1", command: "dir /s", exitCode: 0, seconds: 184, output: "12 files\n3 folders" });
    assert.deepEqual(got, [{ chat: "chat-1", helper: 2, text: "[Your background command `dir /s` (job_id job-1) has ended after 184 seconds, exit code 0. The end of its output:\n12 files\n3 folders]" }]);
    assert.deepEqual(pending(), [], "no wake-up of the chat");
    assert.equal(store.has("ai:helperjob:job-1"), false, "taken once");
});

test("the chat's own job ends: the chat is woken, as before", async () => {
    const got = [];
    jobs.setHelperJobSink((...a) => { got.push(a); return true; });
    await wake.onLocalJobDone("u1", { chat: "chat-1", jobId: "job-9", command: "npm run build", exitCode: 1, seconds: 300, output: "error" });
    assert.deepEqual(got, []);
    assert.equal(pending().length, 1);
    assert.match(pending()[0], /^The background command `npm run build` \(job_id job-9\) on the user's computer has just ended\./);
    lists.clear();
});

test("a helper that has finished takes nothing, and the chat is still not woken; a stopped job tells no one", async () => {
    await jobs.markHelperJob("job-3", 1);
    jobs.setHelperJobSink(() => false); // (no such helper working)
    await wake.onLocalJobDone("u1", { chat: "chat-1", jobId: "job-3", command: "sleep 600", exitCode: 0, seconds: 600, output: "" });
    assert.deepEqual(pending(), []);
    await jobs.markHelperJob("job-4", 1);
    const got = [];
    jobs.setHelperJobSink((...a) => { got.push(a); return true; });
    await wake.onLocalJobDone("u1", { chat: "chat-1", jobId: "job-4", command: "x", stopped: true });
    assert.deepEqual(got, []);
    assert.deepEqual(pending(), []);
});

test("what the helper reads: no output, and no exit code", () => {
    assert.equal(jobs.helperJobText({ jobId: "j", command: "x", output: "" }), "[Your background command `x` (job_id j) has ended. It wrote no output.]");
});
