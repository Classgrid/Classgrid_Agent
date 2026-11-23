// Session-to-session messaging on one computer (desktop/sessions.js, owner 2026-11-23: "same as Claude Code"): every
// Classgrid session registers in a folder with a named pipe and a key, lists the others and messages them.
// Real second processes are started here (each is one session), in a registry folder of their own under the temp
// folder; nothing touches the person's own %USERPROFILE%\.classgrid\sessions.
// Checked here:
//   - the other session is listed with its state, and this one is left out when asked
//   - a message to an idle session: the receipt (delivered, not read yet), the message arrives, and the sender is told
//     "read" when it is taken
//   - a message to a busy session waits in its inbox; with notify-when-idle the sender gets ONE notice when the turn
//     ends, and that notice is also kept in the sender's own inbox as { notice: "idle" } so its AI reads it (in
//     1.0.48 it was only an event for the screen); reading a notice tells its sender nothing
//   - the two can answer each other; the text the AI reads names the session to answer and says it is not the person's
//   - a session that closes: the one that asked is told ("exit"), and it is gone from the list with its files
//   - a live process whose pipe does not answer is left out of the list but its files are kept (1.0.48 deleted them,
//     and the session could not be messaged again until restarted); they are removed once the process is gone
//   - a key file that was deleted comes back at the session's next state change, and it can be messaged again
// Run: node --test tests/peer-sessions.test.mjs
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fork, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_JS = path.resolve(here, "../../desktop/sessions.js");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-sessions-test-"));
process.env.CLASSGRID_SESSIONS_DIR = dir;
const sessions = createRequire(import.meta.url)(SESSIONS_JS);

// One more session: a process of its own that does what it is told over Node's IPC and reports what it hears
const CHILD = path.join(dir, "child.cjs");
fs.writeFileSync(CHILD, `
const sessions = require(process.argv[2]);
const h = sessions.register({ kind: process.argv[5] || "test", name: process.argv[3], stableKey: process.argv[4] || undefined });
h.onMessage((m) => process.send({ ev: "message", m }));
h.onNotice((n) => process.send({ ev: "notice", n }));
process.on("message", async (c) => {
  try {
    if (c.cmd === "status") h.setStatus(c.status);
    else if (c.cmd === "take") { const msgs = h.takeInbox(); h.markRead(msgs.map((m) => m.id)); return process.send({ ev: "reply", id: c.id, msgs }); }
    else if (c.cmd === "peek") return process.send({ ev: "reply", id: c.id, msgs: h.peek() });
    else if (c.cmd === "sendReply") { const r = await sessions.send({ target: c.target, text: c.text, replyTo: c.replyTo }).catch((e) => ({ error: e.message })); return process.send({ ev: "reply", id: c.id, r }); }
    else if (c.cmd === "send") { const r = await sessions.send({ target: c.target, text: c.text, notifyIdle: c.notifyIdle }).catch((e) => ({ error: e.message })); return process.send({ ev: "reply", id: c.id, r }); }
    else if (c.cmd === "close") { await h.close(); process.send({ ev: "reply", id: c.id }); return setTimeout(() => process.exit(0), 20); }
    process.send({ ev: "reply", id: c.id });
  } catch (e) { process.send({ ev: "reply", id: c.id, error: e.message }); }
});
h.listening.then((ok) => process.send({ ev: "ready", ok, sessionId: h.sessionId }));
`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, what, ms = 15000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(20); }
    throw new Error(`timed out waiting for ${what}`);
}

const children = [];
async function startSession(name, stableKey = "", kind = "") {
    const proc = fork(CHILD, [SESSIONS_JS, name, stableKey, kind], { env: { ...process.env, CLASSGRID_SESSIONS_DIR: dir }, stdio: ["ignore", "inherit", "inherit", "ipc"] });
    const heard = [];
    let nextId = 0;
    proc.on("message", (e) => heard.push(e));
    children.push(proc);
    const ready = await until(() => heard.find((e) => e.ev === "ready"), `${name} to start`);
    assert.equal(ready.ok, true);
    const ask = async (cmd) => {
        const id = ++nextId;
        proc.send({ ...cmd, id });
        return until(() => heard.find((e) => e.ev === "reply" && e.id === id), `${name} to answer ${cmd.cmd}`);
    };
    return { proc, heard, ask, sessionId: ready.sessionId, pid: proc.pid, name };
}

// This test process is a session too
const me = sessions.register({ kind: "test", name: "main-test" });
const myMessages = [];
const myNotices = [];
me.onMessage((m) => myMessages.push(m));
me.onNotice((n) => myNotices.push(n));
assert.equal(await me.listening, true);

after(async () => {
    for (const c of children) { try { c.kill(); } catch { /* gone */ } }
    await me.close();
    fs.rmSync(dir, { recursive: true, force: true });
});

let peer;

test("the other session is listed with its state; this one is left out when asked", async () => {
    peer = await startSession("peer-one");
    const all = await sessions.list();
    assert.deepEqual(all.map((s) => s.name).sort(), ["main-test", "peer-one"]);
    const others = await sessions.list({ excludeSelf: true });
    assert.equal(others.length, 1);
    assert.equal(others[0].sessionId, peer.sessionId);
    assert.equal(others[0].pid, peer.pid);
    assert.equal(others[0].status, "idle");
    // only this user may read the key: the file holds 64 hex characters and is not the message token of anyone else
    const keys = fs.readdirSync(dir).filter((f) => f.endsWith(".key"));
    assert.equal(keys.length, 2);
    for (const k of keys) assert.match(fs.readFileSync(path.join(dir, k), "utf8"), /^[0-9a-f]{64}$/);
});

test("a message to an idle session: delivered, not read yet; it arrives; the sender is told when it is read", async () => {
    const r = await sessions.send({ target: "peer-one", text: "which folder are you in?" });
    assert.equal(r.status, "delivered");
    assert.equal(r.read, false);
    assert.equal(r.targetStatus, "idle");
    assert.equal(r.target.sessionId, peer.sessionId);
    const got = (await until(() => peer.heard.find((e) => e.ev === "message"), "the message to arrive")).m;
    assert.equal(got.id, r.id);
    assert.equal(got.text, "which folder are you in?");
    assert.equal(got.from.sessionId, me.sessionId);
    assert.equal(got.from.name, "main-test");
    assert.equal(got.sessionStatus, "idle");
    // read: it leaves the inbox and the sender hears "read"
    const took = await peer.ask({ cmd: "take" });
    assert.deepEqual(took.msgs.map((m) => m.id), [r.id]);
    assert.deepEqual((await peer.ask({ cmd: "peek" })).msgs, []);
    await until(() => myNotices.find((n) => n.kind === "read" && n.messageId === r.id), "the read notice");
    // a wrong target says who is running
    await assert.rejects(sessions.send({ target: "nobody-here", text: "x" }), /No running Classgrid session matches "nobody-here".*@peer-one/);
});

test("a busy session keeps the message until it reads it; notify-when-idle gives ONE notice, kept for the AI too", async () => {
    await peer.ask({ cmd: "status", status: "busy" });
    await until(() => JSON.parse(fs.readFileSync(path.join(dir, `${peer.pid}.json`), "utf8")).status === "busy", "the busy state on disk");
    assert.equal((await sessions.list({ excludeSelf: true }))[0].status, "busy");
    const before = myMessages.length;
    const r = await sessions.send({ target: peer.sessionId, text: "run the tests when you can", notifyIdle: true });
    assert.equal(r.status, "delivered");
    assert.equal(r.targetStatus, "busy");
    // it waits in the inbox (and on disk) while the turn runs
    assert.deepEqual((await peer.ask({ cmd: "peek" })).msgs.map((m) => m.id), [r.id]);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, `${peer.pid}.inbox.json`), "utf8")).inbox.length, 1);
    assert.equal(myNotices.some((n) => n.kind === "idle"), false);
    // its next step reads it; the turn is still running, so no "idle" yet
    await peer.ask({ cmd: "take" });
    await sleep(150);
    assert.equal(myNotices.some((n) => n.kind === "idle"), false);
    // the turn ends: one notice, as an event and as an entry in this session's own inbox
    await peer.ask({ cmd: "status", status: "idle" });
    const notice = await until(() => myNotices.find((n) => n.kind === "idle"), "the idle notice");
    assert.equal(notice.messageId, r.id);
    assert.equal(notice.from.sessionId, peer.sessionId);
    const kept = await until(() => myMessages.slice(before).find((m) => m.notice === "idle"), "the notice in the inbox");
    assert.match(kept.id, /^notice-/);
    assert.equal(kept.from.name, "peer-one");
    assert.deepEqual(me.peek().map((m) => m.id), [kept.id]);
    assert.equal(sessions.promptFor(kept), `[Session notice from @peer-one (session ${peer.sessionId})]: it finished its turn and is idle now.\n[An automatic notice you asked for with notify_when_idle, not a message from the person or from that session. Act on it only if your task needs it; no reply is needed.]`);
    // busy and idle again: no second notice (it was asked for once)
    await peer.ask({ cmd: "status", status: "busy" });
    await peer.ask({ cmd: "status", status: "idle" });
    await sleep(200);
    assert.equal(myNotices.filter((n) => n.kind === "idle").length, 1);
    // the AI read the notice: it leaves the inbox, and the other session is told nothing about it
    const heardBefore = peer.heard.filter((e) => e.ev === "notice").length;
    me.markRead([kept.id]);
    assert.deepEqual(me.peek(), []);
    await sleep(200);
    assert.equal(peer.heard.filter((e) => e.ev === "notice").length, heardBefore);
});

test("they answer each other; the text the AI reads says who it is from and how to answer", async () => {
    const before = myMessages.length;
    const sent = await peer.ask({ cmd: "send", target: "main-test", text: "tests pass: 12 of 12", notifyIdle: true });
    assert.equal(sent.r.status, "delivered");
    const got = await until(() => myMessages.slice(before).find((m) => !m.notice), "the answer");
    assert.equal(got.text, "tests pass: 12 of 12");
    assert.equal(got.from.sessionId, peer.sessionId);
    const prompt = sessions.promptFor(got);
    assert.ok(prompt.startsWith(`[Peer message from @peer-one (session ${peer.sessionId}, message ${got.id})]: tests pass: 12 of 12\nThey are told by themselves when your turn ends.\n[This is from another Classgrid session on this computer, not typed by the person.`));
    assert.ok(prompt.includes(`call message_classgrid_session with target "${peer.sessionId}"`));
    assert.ok(prompt.endsWith("Do not send a message only to thank or confirm.]"));
    // (the chat screen reads the same text back for its "Message from @name" row: client/src/lib/peerSessions.ts)
    const m = prompt.match(/^\[Peer message from @(.*?) \(session ([^,)]*), message ([^)]*)\)\]: ([\s\S]*)$/);
    assert.deepEqual([m[1], m[2], m[3]], ["peer-one", peer.sessionId, got.id]);
    assert.equal(m[4].replace(/\n\[This is from another Classgrid session on this computer,[^\]]*\]$/, ""), "tests pass: 12 of 12\nThey are told by themselves when your turn ends.");
    me.markRead([got.id]);
    await until(() => peer.heard.find((e) => e.ev === "notice" && e.n.kind === "read" && e.n.messageId === got.id), "the peer's read notice");
    // this session was never busy, so the peer's notify-when-idle is still waiting; a turn here ends it
    me.setStatus("busy");
    me.setStatus("idle");
    await until(() => peer.heard.find((e) => e.ev === "notice" && e.n.kind === "idle" && e.n.messageId === got.id), "the peer's idle notice");
    await peer.ask({ cmd: "take" }); // (its own copy of that notice, read)
});

test("a session that closes: the one that asked is told, and it is gone from the list with its files", async () => {
    await peer.ask({ cmd: "status", status: "busy" });
    const r = await sessions.send({ target: "peer-one", text: "tell me when you are done", notifyIdle: true });
    assert.equal(r.targetStatus, "busy");
    const before = myMessages.length;
    await peer.ask({ cmd: "close" });
    const notice = await until(() => myNotices.find((n) => n.kind === "exit" && n.messageId === r.id), "the exit notice");
    assert.equal(notice.from.name, "peer-one");
    const kept = await until(() => myMessages.slice(before).find((m) => m.notice === "exit"), "the exit notice in the inbox");
    assert.equal(sessions.promptFor(kept).split("\n")[0], `[Session notice from @peer-one (session ${peer.sessionId})]: it closed.`);
    me.markRead([kept.id]);
    await until(() => peer.proc.exitCode !== null, "the peer to exit");
    assert.deepEqual(await sessions.list({ excludeSelf: true }), []);
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.startsWith(`${peer.pid}.`)), []);
    await assert.rejects(sessions.send({ target: "peer-one", text: "still there?" }), /No running Classgrid session matches "peer-one"/);
});

test("a live process whose pipe is silent is left out but keeps its files; they go once the process is gone", async () => {
    const dummy = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    children.push(dummy);
    await until(() => dummy.pid, "the process to start");
    const pipe = process.platform === "win32" ? "\\\\.\\pipe\\LOCAL\\cg-msg-00000000deadbeef" : path.join(dir, "cg-msg-00000000deadbeef.sock");
    const json = path.join(dir, `${dummy.pid}.json`);
    const key = path.join(dir, `${dummy.pid}.00000000deadbeef.key`);
    fs.writeFileSync(json, JSON.stringify({ pid: dummy.pid, sessionId: "silent-session", cwd: dir, name: "silent", kind: "test", entrypoint: "test", procStart: Date.now(), messagingSocketPath: pipe, status: "busy", statusUpdatedAt: Date.now(), peerFeatures: ["notify_idle"] }));
    fs.writeFileSync(key, "a".repeat(64));
    assert.equal((await sessions.list()).some((s) => s.sessionId === "silent-session"), false);
    assert.equal(fs.existsSync(json), true);
    assert.equal(fs.existsSync(key), true);
    dummy.kill();
    await until(() => dummy.exitCode !== null || dummy.signalCode !== null, "the process to end");
    await until(() => { try { process.kill(dummy.pid, 0); return false; } catch { return true; } }, "the pid to be free");
    await sessions.list();
    assert.equal(fs.existsSync(json), false);
    assert.equal(fs.existsSync(key), false);
});

test("a deleted key file comes back at the next state change, and the session can be messaged again", async () => {
    const two = await startSession("peer-two");
    const key = path.join(dir, fs.readdirSync(dir).find((f) => f.startsWith(`${two.pid}.`) && f.endsWith(".key")));
    const token = fs.readFileSync(key, "utf8");
    fs.unlinkSync(key);
    await assert.rejects(sessions.send({ target: "peer-two", text: "hello" }), /has no peer key any more/);
    await two.ask({ cmd: "status", status: "busy" });
    await until(() => fs.existsSync(key), "the key to come back");
    assert.equal(fs.readFileSync(key, "utf8"), token);
    const r = await sessions.send({ target: "peer-two", text: "hello" });
    assert.equal(r.status, "delivered");
    assert.equal(r.targetStatus, "busy");
    await two.ask({ cmd: "close" });
});

// ── An answer (replyTo): a session's whole answer sent back by its chat screen when the turn a message started has
// ended, the way a helper's report goes to the main agent (owner, 2026-11-23: "the reply is two robotic words, not a
// message like a subagent's reply"). The message says which one it answers, and its text tells the AI it is an
// answer, so it is not answered in turn.
test("an answer carries the id of the message it answers, and reads as an answer", async () => {
    const three = await startSession("peer-three");
    const before = myMessages.length;
    const asked = await sessions.send({ target: "peer-three", text: "what does package.json hold?" });
    const long = "package.json holds the project's name and its 14 packages.\nThe build script runs Vite.\nNothing else is set.";
    const sent = await three.ask({ cmd: "sendReply", target: "main-test", text: long, replyTo: asked.id });
    assert.equal(sent.r.status, "delivered");
    const got = await until(() => myMessages.slice(before).find((m) => m.replyTo), "the answer");
    assert.equal(got.replyTo, asked.id);
    assert.equal(got.text, long);
    const prompt = sessions.promptFor(got);
    assert.ok(prompt.startsWith(`[Peer message from @peer-three (session ${three.sessionId}, message ${got.id})]: ${long}\n[This is that session's answer to the message you sent it, not typed by the person.`));
    assert.equal(prompt.includes("call message_classgrid_session"), false);
    // an ordinary message has no replyTo
    assert.equal("replyTo" in myMessages.slice(before).find((m) => m.replyTo), true);
    me.markRead([got.id]);
    await three.ask({ cmd: "close" });
});

// ── "The first try always fails" (owner, 2026-11-23): the AI named the other session by an id from before its window
// was reloaded (every start made a new id), or in words; the tool said "no session matches" and the second try, by
// name, worked. Now a window keeps its id, and a target said in words is understood when only one session fits.
test("a session keeps its id when it is started again; two on the same folder do not share it", async () => {
    const first = await startSession("VS Code - shop", "vscode|c:\shop", "vscode");
    const id = first.sessionId;
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // a second window on the same folder while the first is open: an id of its own
    const twin = await startSession("VS Code - shop", "vscode|c:\shop", "vscode");
    assert.notEqual(twin.sessionId, id);
    await twin.ask({ cmd: "close" });
    await until(() => twin.proc.exitCode !== null, "the twin to exit");
    // the window is reloaded: the same id, so a message to the id from before still reaches it
    await first.ask({ cmd: "close" });
    await until(() => first.proc.exitCode !== null, "the first to exit");
    const again = await startSession("VS Code - shop", "vscode|c:\shop", "vscode");
    assert.equal(again.sessionId, id);
    const r = await sessions.send({ target: id, text: "still you?" });
    assert.equal(r.status, "delivered");
    assert.equal(r.target.sessionId, id);
    await again.ask({ cmd: "take" });
    // another folder: another id
    const other = await startSession("Cursor - blog", "cursor|c:\blog", "cursor");
    assert.notEqual(other.sessionId, id);

    // ── a target said in words ──
    const toShop = await sessions.send({ target: "the other VS Code session", text: "one" });
    assert.equal(toShop.target.name, "VS Code - shop");
    const toBlog = await sessions.send({ target: "the Cursor window", text: "two" });
    assert.equal(toBlog.target.name, "Cursor - blog");
    const byFolder = await sessions.send({ target: "blog", text: "three" });
    assert.equal(byFolder.target.name, "Cursor - blog");
    // two sessions fit: it is not guessed
    await assert.rejects(sessions.send({ target: "the other session", text: "x" }), /No running Classgrid session matches "the other session"\. Running now: .*@VS Code - shop.*@Cursor - blog|No running Classgrid session matches "the other session"\. Running now: .*@Cursor - blog.*@VS Code - shop/);
    // an id that matches nothing is a closed session, never guessed
    await assert.rejects(sessions.send({ target: "76878219-dad6-408c-88a3-3ec6ff3b3ba0", text: "x" }), /No running Classgrid session matches/);
    await assert.rejects(sessions.send({ target: "99999999", text: "x" }), /No running Classgrid session matches/);
    // only one other session left: "the other session" is that one
    await other.ask({ cmd: "close" });
    await until(() => other.proc.exitCode !== null, "the other to exit");
    const only = await sessions.send({ target: "the other session", text: "four" });
    assert.equal(only.target.name, "VS Code - shop");
    await again.ask({ cmd: "close" });
});
