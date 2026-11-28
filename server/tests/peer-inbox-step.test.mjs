// Messages from other Classgrid sessions that a busy session has not read yet are handed to the chat's AI after its
// next step on the computer (desktop/runner.js runTool withPeerInbox). Only after a step the chat screen marks
// `peer: true`: a step of the answer on that screen that is not a helper's. In desktop 1.0.48 they were added after
// EVERY step and marked read: a helper's step, another chat's step or a woken task's step could take a message the
// chat's AI then never saw.
// Checked here:
//   - a step without the mark (a helper's, another chat's, one asked over the socket) leaves the inbox alone
//   - a marked step gets every unread message and notice after its own answer, in the words the AI is given
//     (sessions.js promptFor), and they are marked read
//   - sending a message never carries the inbox back, marked or not; nor does the connection check
// The runner is loaded as the editor extension loads it (no Electron); its connection and the spreadsheet reader are
// stand-ins. The registry folder is a temp folder of its own.
// Run: node --test tests/peer-inbox-step.test.mjs
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-peer-step-test-"));
process.env.CLASSGRID_SESSIONS_DIR = dir;
after(() => fs.rmSync(dir, { recursive: true, force: true }));

// (the two packages runner.js loads at the top that are not installed next to this test)
const realLoad = Module._load;
Module._load = function (request, ...rest) {
    if (request === "socket.io-client") return { io: () => ({ on() {}, emit() {}, disconnect() {} }) };
    if (request === "xlsx") return {};
    return realLoad.call(this, request, ...rest);
};
const require = createRequire(import.meta.url);
const runner = require(path.resolve(here, "../../desktop/runner.js"));
const { promptFor } = require(path.resolve(here, "../../desktop/sessions.js"));

const from = { sessionId: "11111111-aaaa-bbbb-cccc-222222222222", name: "VS Code - shop", kind: "vscode" };
const inbox = [];
const read = [];
runner.setSessionHandle({
    identity: () => ({ sessionId: "me", name: "Classgrid desktop", kind: "desktop", pipe: "none" }),
    takeInbox: () => inbox.splice(0),
    peek: () => inbox.slice(),
    // (as the real handle: what is marked read leaves the inbox)
    markRead: (ids) => { read.push(...ids); for (const id of ids) { const i = inbox.findIndex((m) => m.id === id); if (i >= 0) inbox.splice(i, 1); } },
});
const message = (id, text) => ({ id, from, text, notifyIdle: false, receivedAt: Date.now() });

test("a step without the mark leaves the inbox alone", async () => {
    inbox.push(message("m1", "the build is red"));
    for (const req of [
        { tool: "list_classgrid_sessions", args: {} }, // (as the runner socket sends it: a woken task, another chat)
        { tool: "list_classgrid_sessions", args: {}, chat: "chat-1", peer: false }, // (a helper's step: the screen says no)
        { tool: "list_classgrid_sessions", args: {}, chat: "chat-1", peer: "true" }, // (only a real true counts)
    ]) {
        const r = await runner.runTool(req);
        assert.equal(r.text, "No other Classgrid session is running on this computer.");
    }
    assert.equal(inbox.length, 1);
    assert.deepEqual(read, []);
});

test("a marked step gets every unread message and notice after its own answer, and they are marked read", async () => {
    const notice = { id: "notice-1", from, notice: "idle", text: "finished its turn and is idle now.", notifyIdle: false, receivedAt: Date.now() };
    inbox.push(notice);
    const waiting = inbox.slice();
    const r = await runner.runTool({ tool: "list_classgrid_sessions", args: {}, chat: "chat-1", peer: true });
    assert.equal(r.text, `No other Classgrid session is running on this computer.\n\n${promptFor(waiting[0])}\n\n${promptFor(waiting[1])}`);
    assert.ok(r.text.includes("[Peer message from @VS Code - shop (session 11111111-aaaa-bbbb-cccc-222222222222, message m1)]: the build is red"));
    assert.ok(r.text.includes("[Session notice from @VS Code - shop (session 11111111-aaaa-bbbb-cccc-222222222222)]: it finished its turn and is idle now."));
    assert.deepEqual(read, ["m1", "notice-1"]);
    assert.equal(inbox.length, 0);
    // nothing waiting: the step's own answer, unchanged
    const again = await runner.runTool({ tool: "list_classgrid_sessions", args: {}, chat: "chat-1", peer: true });
    assert.equal(again.text, "No other Classgrid session is running on this computer.");
});

test("sending a message and the connection check never carry the inbox back", async () => {
    read.length = 0;
    inbox.push(message("m2", "are you there?"));
    const sent = await runner.runTool({ tool: "message_classgrid_session", args: { target: "nobody", text: "hi" }, chat: "chat-1", peer: true });
    assert.match(sent.text, /^Error: No running Classgrid session matches "nobody"/);
    assert.equal(sent.text.includes("[Peer message"), false);
    const ping = await runner.runTool({ tool: "ping", args: {}, peer: true });
    assert.equal(ping.text, "ok");
    assert.equal(inbox.length, 1);
    assert.deepEqual(read, []);
});

test("another session's answer (replyTo) is never slipped into a step: it stays for the chat screen to show", async () => {
    inbox.splice(0); read.splice(0);
    inbox.push({ ...message("a1", "here is my answer"), replyTo: "sent-1" });
    inbox.push(message("m9", "a new request"));
    const r = await runner.runTool({ tool: "list_classgrid_sessions", args: {}, chat: "chat-1", peer: true });
    assert.match(r.text, /a new request/);
    assert.doesNotMatch(r.text, /here is my answer/);
    assert.deepEqual(read, ["m9"]);
    assert.deepEqual(inbox.map((m) => m.id), ["a1"]);
});
