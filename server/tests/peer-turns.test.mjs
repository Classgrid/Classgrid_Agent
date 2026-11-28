// Session-to-session messaging, every case (owner, 2026-11-28: "find all test cases why it fails and fix all": ten
// messages sent from VS Code, every answer arrived on his computer, none was shown, because the window stayed "busy").
// What is tested, with the real code:
//   - client/src/lib/peerTurns.ts: what a chat screen does with a message, an answer or a notice (deterministic cases)
//   - desktop/sessions.js createPeerRouter: which screen of a window gets it, busy/idle over several screens, what waits
//   - the whole thing together: thousands of random runs of two or three windows (one or two Agent panels each)
//     messaging each other while people type, panels are hidden, shown, reloaded and closed, turns are slow or quick,
//     chats end, answers are asked for. After every run nothing may be lost or stuck:
//       * every message gets an answer back (or the sender is told the chat has ended)
//       * every answer that reaches a window is SHOWN there as its own turn, on the panel whose chat sent the message
//         while that panel is open
//       * no message starts two turns; every inbox ends empty; every window ends "idle"
// The world around them (the pipes between windows, the AI's turns, time) is a stand-in with the same rules as
// desktop/sessions.js: a message waits in the target's inbox until a screen marks it read; "idle" sends one
// "finished its turn" notice to each sender that asked.
// Run: node --test tests/peer-turns.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createPeerRouter, createOutbox } = require(path.resolve(here, "../../desktop/sessions.js"));
const { createPeerTurns, CHAT_ENDED_ANSWER, PEER_NOTICE_HOLD_MS, PEER_TICK_MS } = await import(path.resolve(here, "../../client/src/lib/peerTurns.ts").replace(/^([A-Za-z]):/, "file:///$1:").replace(/\\/g, "/"));

// ── a clock that only moves when told ──
function makeClock() {
    let t = 0, seq = 0;
    const q = [];
    return {
        now: () => t,
        setTimer(fn, ms) { const e = { at: t + Math.max(0, ms), seq: seq++, fn, off: false }; q.push(e); return e; },
        clearTimer(e) { if (e) e.off = true; },
        async run(until = Infinity, maxSteps = 200000) {
            for (let n = 0; n < maxSteps; n++) {
                await Promise.resolve(); await Promise.resolve();
                q.sort((a, b) => a.at - b.at || a.seq - b.seq);
                const i = q.findIndex((e) => !e.off);
                if (i < 0) { q.length = 0; return; }
                const e = q[i];
                if (e.at > until) return;
                q.splice(i, 1);
                t = e.at;
                e.fn();
                await Promise.resolve(); await Promise.resolve();
            }
            throw new Error("the clock never stopped");
        },
        pending: () => q.filter((e) => !e.off).length,
    };
}

// ── unit cases for one screen ──
function oneScreen(opts = {}) {
    const clock = makeClock();
    const log = { asked: [], read: [], status: [], sent: [] };
    let inbox = opts.inbox || [];
    let ended = !!opts.ended;
    let answers = new Map();
    const turns = createPeerTurns({
        prompt: (m) => `P:${m.id}`,
        ask: (p, m) => { if (ended) return false; log.asked.push(m.id); return true; },
        isActive: () => true,
        reportStatus: (s) => log.status.push(s),
        markRead: (ids) => { log.read.push(...ids); inbox = inbox.filter((m) => !ids.includes(m.id)); },
        inboxNow: async () => inbox.slice(),
        sendAnswer: async (target, text, replyTo) => { log.sent.push({ target, text, replyTo }); return opts.deliver ? opts.deliver(log.sent.length) : true; },
        answerFor: (id) => answers.get(id) ?? null,
        setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: clock.now,
    });
    return { clock, log, turns, setInbox: (x) => { inbox = x; }, inbox: () => inbox, setEnded: (v) => { ended = v; }, answers };
}
const from = (n) => ({ sessionId: `s-${n}`, name: `Session ${n}` });

test("an idle screen starts a turn for a message, marks it read, and sends its whole answer back when the turn ends", async () => {
    const s = oneScreen();
    s.turns.onMessage({ id: "m1", from: from("A"), text: "hello" });
    assert.deepEqual(s.log.asked, ["m1"]);
    assert.deepEqual(s.log.read, ["m1"]);
    s.turns.turnState(true);
    s.answers.set("m1", { text: "full answer", answeredItself: false });
    s.turns.turnState(false);
    await s.clock.run();
    assert.deepEqual(s.log.sent, [{ target: "s-A", text: "full answer", replyTo: "m1" }]);
    assert.equal(s.log.status.at(-1), "idle");
});

test("an answer (replyTo) starts a turn that is shown, and is never answered back", async () => {
    const s = oneScreen();
    s.turns.onMessage({ id: "r1", from: from("A"), text: "here you go", replyTo: "m0" });
    assert.deepEqual(s.log.asked, ["r1"]);
    s.turns.turnState(true);
    s.answers.set("r1", { text: "thanks, told the person", answeredItself: false });
    s.turns.turnState(false);
    await s.clock.run();
    assert.deepEqual(s.log.sent, []);
});

test("while a turn runs, a message and an answer wait in the inbox and each starts its own turn after it, the answer first", async () => {
    const s = oneScreen();
    s.turns.turnState(true);
    const msg = { id: "m2", from: from("A"), text: "do x" };
    const ans = { id: "r2", from: from("B"), text: "done y", replyTo: "m9" };
    s.setInbox([msg, ans]);
    s.turns.onMessage(msg); s.turns.onMessage(ans);
    assert.deepEqual(s.log.asked, []);
    assert.equal(s.turns.pendingCount(), 2);
    s.turns.turnState(false);
    await s.clock.run();
    assert.deepEqual(s.log.asked, ["r2"]);
    s.turns.turnState(true); s.turns.turnState(false);
    await s.clock.run();
    assert.deepEqual(s.log.asked, ["r2", "m2"]);
    assert.deepEqual(s.inbox(), []);
});

test("a 'finished its turn' notice waits for that session's answer: the answer starts the turn, the notice nothing", async () => {
    const s = oneScreen();
    s.turns.onMessage({ id: "n1", from: from("A"), text: "", notice: "idle" });
    await s.clock.run(PEER_NOTICE_HOLD_MS - 1);
    assert.deepEqual(s.log.asked, []);
    s.turns.onMessage({ id: "r3", from: from("A"), text: "answer", replyTo: "m3" });
    assert.deepEqual(s.log.asked, ["r3"]);
    assert.ok(s.log.read.includes("n1"));
    await s.clock.run();
    assert.deepEqual(s.log.asked, ["r3"]);
});

test("a notice with no answer starts a turn by itself after the wait", async () => {
    const s = oneScreen();
    s.turns.onMessage({ id: "n2", from: from("A"), text: "", notice: "idle" });
    await s.clock.run();
    assert.deepEqual(s.log.asked, ["n2"]);
});

test("an ended chat: the sender of a message is told at once; an answer waits and is shown once a new chat is open", async () => {
    const s = oneScreen({ ended: true });
    s.turns.onMessage({ id: "m4", from: from("A"), text: "please" });
    assert.deepEqual(s.log.sent, [{ target: "s-A", text: CHAT_ENDED_ANSWER, replyTo: "m4" }]);
    assert.ok(s.log.read.includes("m4"));
    const ans = { id: "r4", from: from("B"), text: "ans", replyTo: "x" };
    s.setInbox([ans]);
    s.turns.onMessage(ans);
    assert.ok(!s.log.read.includes("r4"));
    assert.equal(s.log.sent.length, 1);
    s.setEnded(false);
    s.turns.tick();
    await s.clock.run();
    assert.deepEqual(s.log.asked, ["r4"]);
});

test("an answer that does not get there is sent again, then 'idle' is told", async () => {
    const s = oneScreen({ deliver: (n) => n >= 3 });
    s.turns.onMessage({ id: "m5", from: from("A"), text: "q" });
    s.turns.turnState(true);
    s.answers.set("m5", { text: "a", answeredItself: false });
    s.turns.turnState(false);
    await s.clock.run();
    assert.equal(s.log.sent.length, 3);
    assert.equal(s.log.status.at(-1), "idle");
});

test("the AI that answered with the tool itself: nothing is sent twice", async () => {
    const s = oneScreen();
    s.turns.onMessage({ id: "m6", from: from("A"), text: "q" });
    s.turns.turnState(true);
    s.answers.set("m6", { text: "a", answeredItself: true });
    s.turns.turnState(false);
    await s.clock.run();
    assert.deepEqual(s.log.sent, []);
});

test("tick: the real state is told again (a host that missed 'idle' is set right) and the inbox is picked up", async () => {
    const s = oneScreen();
    s.setInbox([{ id: "m7", from: from("A"), text: "missed while the screen was away" }]);
    s.turns.tick();
    await s.clock.run();
    assert.equal(s.log.status.at(-1), "idle");
    assert.deepEqual(s.log.asked, ["m7"]);
});

test("a message delivered twice (two routes) starts one turn", async () => {
    const s = oneScreen();
    const m = { id: "m8", from: from("A"), text: "once" };
    s.turns.onMessage(m); s.turns.onMessage(m);
    s.setInbox([m]); s.turns.tick();
    await s.clock.run();
    assert.deepEqual(s.log.asked, ["m8"]);
});

// ── the router ──
function routerWith(screens, { visible = () => true, primary = () => null } = {}) {
    const posted = [];
    let status = "idle";
    const r = createPeerRouter({ post: (w, e) => posted.push([w, e]), isVisible: visible, primary, getHandle: () => ({ setStatus: (s) => { status = s; } }) });
    for (const s of screens) r.addScreen(s);
    return { r, posted, status: () => status };
}

test("router: an answer goes to the panel whose chat sent the message, even when the other one is on screen", () => {
    const { r, posted } = routerWith(["left", "right"], { primary: () => "right" });
    r.ready("left"); r.ready("right");
    r.sent("msg-1", "left");
    r.deliver({ id: "ans" }, "msg-1");
    assert.deepEqual(posted.at(-1), ["left", { id: "ans" }]);
});

test("router: a new message goes to a panel on screen and free, the primary one first", () => {
    const vis = new Set(["left"]);
    const { r, posted } = routerWith(["left", "right"], { primary: () => "right", visible: (w) => vis.has(w) });
    r.ready("left"); r.ready("right");
    r.deliver({ id: "a" });
    assert.equal(posted.at(-1)[0], "left");
    vis.add("right");
    r.deliver({ id: "b" });
    assert.equal(posted.at(-1)[0], "right");
    r.status("right", "busy");
    r.deliver({ id: "c" });
    assert.equal(posted.at(-1)[0], "left");
});

test("router: the window is busy while ANY panel runs a turn, and idle when all are done (the 'stuck busy' case)", () => {
    const { r, status } = routerWith(["left", "right"]);
    r.status("left", "busy");
    assert.equal(status(), "busy");
    r.status("right", "idle");
    assert.equal(status(), "busy");
    r.status("left", "idle");
    assert.equal(status(), "idle");
    r.status("right", "busy"); r.removeScreen("right");
    assert.equal(status(), "idle");
    r.status("left", "busy"); r.reloaded("left");
    assert.equal(status(), "idle");
});

test("router: what came before any panel was ready waits, and goes to its own panel once that one is ready", () => {
    const { r, posted } = routerWith(["left", "right"]);
    r.sent("m", "right");
    r.deliver({ id: "for-right" }, "m");
    r.deliver({ id: "any" });
    assert.equal(posted.length, 0);
    r.ready("left");
    assert.deepEqual(posted.map(([w, e]) => [w, e.id]), [["left", "any"]]);
    r.ready("right");
    assert.deepEqual(posted.map(([w, e]) => [w, e.id]), [["left", "any"], ["right", "for-right"]]);
});

test("router: the panel a message was sent from is closed: its answer goes to another panel, not lost", () => {
    const { r, posted } = routerWith(["left", "right"]);
    r.ready("left"); r.ready("right");
    r.sent("m", "left");
    r.removeScreen("left");
    r.deliver({ id: "ans" }, "m");
    assert.equal(posted.at(-1)[0], "right");
});

// ── the whole thing, at random ──
function prng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

async function world(seed) {
    const rnd = prng(seed);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const clock = makeClock();
    const problems = [];
    const trace = [];
    const tr = (...a) => trace.push(`${clock.now()} ${a.join(" ")}`);
    let idSeq = 0;
    const hosts = [];
    const nHosts = 2 + Math.floor(rnd() * 3); // 2 to 4 windows
    const flaky = rnd() < 0.4; // the pipe to another window fails now and then (a window busy reloading)
    const sentByTool = new Map(); // message id -> { fromHost, screen }
    const answered = new Map();   // message id -> reply id (or "ended")
    const shown = new Map();      // message id -> [{ host, screen }]

    function send(fromHost, toHost, text, { notifyIdle = false, replyTo } = {}) {
        const id = `m${++idSeq}`;
        const m = { id, from: { sessionId: fromHost.sid, name: fromHost.name }, text, notifyIdle, ...(replyTo ? { replyTo } : {}) };
        toHost.inbox.push(m);
        tr("send", id, fromHost.name, "->", toHost.name, replyTo ? "reply-to " + replyTo : "", notifyIdle ? "notify" : "");
        if (notifyIdle) toHost.waiting.push({ fromHost, messageId: id });
        toHost.router.deliver({ cgEvent: "peerMessage", data: m }, replyTo);
        return id;
    }
    function setStatus(host, st) {
        if (st === host.status) return;
        const was = host.status;
        host.status = st;
        tr("status", host.name, st);
        if (was === "busy" && st === "idle") {
            for (const w of host.waiting.splice(0)) {
                const id = `n${++idSeq}`;
                const n = { id, from: { sessionId: host.sid, name: host.name }, text: "", notice: "idle" };
                w.fromHost.inbox.push(n);
                w.fromHost.router.deliver({ cgEvent: "peerMessage", data: n });
            }
        }
    }

    function makeScreen(host, name) {
        const scr = { host, name, visible: rnd() < 0.8, submitting: false, ended: rnd() < 0.05, messages: [], alive: true, turns: null };
        const startTurn = (kind, m) => {
            scr.submitting = true;
            const begin = 5 + Math.floor(rnd() * 40);
            clock.setTimer(() => {
                if (!scr.alive) return;
                tr("turn-start", scr.name, kind, m ? m.id : "", "turn=" + JSON.stringify(scr.turns.currentTurn()));
                scr.turns.turnState(true);
                // the AI may message another window from this turn (the tool; the answer must come back to this panel)
                if (kind === "user" && rnd() < 0.7) {
                    const to = pick(hosts.filter((h) => h !== host));
                    const id = send(host, to, `please do ${idSeq}`, { notifyIdle: rnd() < 0.5 });
                    sentByTool.set(id, { fromHost: host, screen: scr });
                    host.router.sent(id, scr);
                }
                const dur = 50 + Math.floor(rnd() * (rnd() < 0.2 ? 30000 : 2000));
                clock.setTimer(() => {
                    if (!scr.alive) return;
                    if (m) scr.messages.push({ answerTo: m.id, text: `answer to ${m.id}` });
                    scr.submitting = false;
                    tr("turn-end", scr.name, kind, m ? m.id : "", "turn=" + JSON.stringify(scr.turns.currentTurn()));
                    scr.turns.turnState(false);
                }, dur);
            }, begin);
        };
        // (a page loaded again is a new page: a new controller, nothing kept from the old one but what the host holds)
        scr.newTurns = () => createPeerTurns({
            prompt: (m) => m.id,
            ask: (p, m) => {
                tr("ask", m.id, scr.name, scr.alive ? "" : "DEAD", scr.ended ? "ENDED" : "", scr.submitting ? "SUBMITTING" : "");
                if (!scr.alive || scr.ended) return false;
                if (scr.submitting) return "busy";
                const list = shown.get(m.id) || [];
                list.push({ host, screen: scr });
                shown.set(m.id, list);
                startTurn("peer", m);
                return true;
            },
            isActive: () => scr.alive,
            reportStatus: (st) => { tr("report", scr.name, st); host.router.status(scr, st); },
            markRead: (ids) => { tr("read", ids.join(","), "by", scr.name); host.inbox = host.inbox.filter((m) => !ids.includes(m.id)); },
            inboxNow: async () => host.router.inboxFor(scr, host.inbox),
            // (through the window's outbox, as the apps do: an answer that does not get there is kept and sent again)
            sendAnswer: async (target, text, replyTo) => {
                tr("sendAnswer", replyTo, "from", scr.name, "to", target);
                const out = await host.outbox.sendAnswer({ target, text, replyTo });
                return out.status === "delivered" || out.status === "queued";
            },
            answerFor: (id) => { tr("answerFor", id, scr.name); const a = scr.messages.find((x) => x.answerTo === id); return a ? { text: a.text, answeredItself: false } : null; },
            setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: clock.now,
        });
        scr.turns = scr.newTurns();
        scr.event = (e) => { if (scr.alive) scr.turns.onMessage(e.data); };
        scr.userTurn = () => { if (scr.alive && !scr.submitting && !scr.ended) startTurn("user", null); };
        return scr;
    }

    for (let i = 0; i < nHosts; i++) {
        const host = { sid: `sess-${i}`, name: `Window ${i}`, inbox: [], waiting: [], status: "idle", screens: [] };
        // the pipe between windows: fails now and then when flaky (that window reloading); the outbox sends again
        host.outbox = createOutbox({
            sendFn: async ({ target, text, replyTo }) => {
                const to = hosts.find((h) => h.sid === target);
                if (!to) throw new Error("no such session");
                if (flaky && rnd() < 0.3) { tr("pipe failed", replyTo); throw new Error("pipe failed"); }
                const rid = send(host, to, text, { replyTo });
                if (!answered.has(replyTo)) answered.set(replyTo, text === CHAT_ENDED_ANSWER ? "ended" : rid);
                return { status: "delivered" };
            },
            setTimer: (fn, ms) => { const h = { live: true }; const loop = () => { if (!h.live) return; fn(); clock.setTimer(loop, ms); }; clock.setTimer(loop, ms); return h; },
            clearTimer: (h) => { if (h) h.live = false; },
            now: clock.now,
        });
        host.router = createPeerRouter({
            post: (w, e) => { tr("post", e.data.id, "to", w.name, w.alive ? "" : "DEAD", w.submitting ? "busy" : ""); w.event(e); },
            isVisible: (w) => w.visible,
            primary: () => host.screens.find((s) => s.alive && s.visible) || null,
            getHandle: () => ({ setStatus: (st) => setStatus(host, st) }),
            isUnread: (id) => host.inbox.some((m) => m.id === id),
        });
        const nScreens = rnd() < 0.5 ? 2 : 1;
        for (let k = 0; k < nScreens; k++) { const s = makeScreen(host, `${host.name}/panel${k}`); host.screens.push(s); host.router.addScreen(s); }
        hosts.push(host);
    }
    // panels become ready a little apart, ticking every few seconds like the app
    for (const h of hosts) for (const s of h.screens) clock.setTimer(() => { if (s.alive) h.router.ready(s); }, Math.floor(rnd() * 300));
    const tickAll = () => { for (const h of hosts) for (const s of h.screens) if (s.alive) s.turns.tick(); };
    let ticks = 0;
    const ticker = () => { tickAll(); if (++ticks < 400) clock.setTimer(ticker, PEER_TICK_MS); };
    clock.setTimer(ticker, PEER_TICK_MS);

    // what people and panels do
    const actions = 3 + Math.floor(rnd() * 30);
    for (let a = 0; a < actions; a++) {
        clock.setTimer(() => {
            const h = pick(hosts);
            const s = pick(h.screens);
            const r = rnd();
            if (r < 0.6) s.userTurn();
            else if (r < 0.7) s.visible = !s.visible;
            else if (r < 0.75) s.ended = false; // (a new chat is opened in that panel)
            else if (r < 0.85 && s.alive && !s.submitting) { s.turns.dispose(); s.turns = s.newTurns(); h.router.reloaded(s); clock.setTimer(() => s.alive && h.router.ready(s), 100 + Math.floor(rnd() * 2000)); }
            else if (r < 0.9 && h.screens.filter((x) => x.alive).length > 1 && !s.submitting) {
                s.alive = false; s.turns.dispose(); h.router.removeScreen(s);
            } else s.userTurn();
        }, Math.floor(rnd() * 60000));
    }
    await clock.run(400 * PEER_TICK_MS);

    // ── what must be true at the end ──
    for (const [id, origin] of sentByTool) {
        if (!answered.has(id)) { problems.push(`message ${id} from ${origin.fromHost.name} never got an answer`); continue; }
        const rid = answered.get(id);
        if (rid === "ended") continue;
        const where = shown.get(rid) || [];
        const canShow = origin.fromHost.screens.some((x) => x.alive && !x.ended);
        if (!where.length && !canShow) continue; // (every panel of that window has an ended chat: it waits for a new chat)
        if (!where.length) problems.push(`answer ${rid} to ${id} reached ${origin.fromHost.name} but was never shown`);
        else if (where[0].host !== origin.fromHost) problems.push(`answer ${rid} shown in the wrong window`);
        else if (origin.screen.alive && where[0].screen !== origin.screen) problems.push(`answer ${rid} shown on ${where[0].screen.name}, not on ${origin.screen.name} that sent ${id}`);
    }
    for (const [id, list] of shown) if (list.length > 1) problems.push(`${id} started ${list.length} turns`);
    for (const h of hosts) {
        const leftover = h.screens.some((x) => x.alive && !x.ended) ? h.inbox : h.inbox.filter((m) => !m.replyTo);
        if (leftover.length) problems.push(`${h.name} inbox not empty: ${h.inbox.map((m) => m.id + (m.notice ? "(notice)" : m.replyTo ? "(answer)" : "")).join(",")}`);
        if (h.status !== "idle") problems.push(`${h.name} ended ${h.status}`);
    }
    if (problems.length && process.env.PEER_TRACE) console.log(trace.join(String.fromCharCode(10)));
    return problems;
}

test("thousands of random runs: nothing lost, nothing hidden, nothing stuck", async () => {
    const runs = Number(process.env.PEER_RUNS) || 3000;
    const failures = [];
    for (let seed = 1; seed <= runs; seed++) {
        if (process.env.PEER_SEED && Number(process.env.PEER_SEED) !== seed) continue;
        const p = await world(seed);
        if (p.length) failures.push(`seed ${seed}: ${p.join("; ")}`);
        if (failures.length >= 10) break;
    }
    assert.deepEqual(failures, [], failures.join("\n"));
});

// ── the outbox ──
test("outbox: an answer that does not get there is kept and sent again until it does; the same answer is kept once", async () => {
    const clock = makeClock();
    let fails = 3, sentN = 0;
    const ob = createOutbox({
        sendFn: async () => { sentN++; if (fails-- > 0) throw new Error("pipe"); return { status: "delivered" }; },
        setTimer: (fn, ms) => { const h = { live: true }; const loop = () => { if (!h.live) return; fn(); clock.setTimer(loop, ms); }; clock.setTimer(loop, ms); return h; },
        clearTimer: (h) => { if (h) h.live = false; }, now: clock.now, everyMs: 1000,
    });
    assert.equal((await ob.sendAnswer({ target: "t", text: "a", replyTo: "m1" })).status, "queued");
    assert.equal((await ob.sendAnswer({ target: "t", text: "a", replyTo: "m1" })).status, "queued");
    assert.equal(ob.size(), 1);
    await clock.run(10000);
    assert.equal(ob.size(), 0);
    assert.equal(sentN, 4);
});

test("outbox: an answer still not delivered after half an hour is given up; a message (not an answer) is never kept", async () => {
    const clock = makeClock();
    const ob = createOutbox({
        sendFn: async () => { throw new Error("gone"); },
        setTimer: (fn, ms) => { const h = { live: true }; const loop = () => { if (!h.live) return; fn(); clock.setTimer(loop, ms); }; clock.setTimer(loop, ms); return h; },
        clearTimer: (h) => { if (h) h.live = false; }, now: clock.now, everyMs: 60000,
    });
    assert.equal((await ob.sendAnswer({ target: "t", text: "hi" })).status, "refused");
    await ob.sendAnswer({ target: "t", text: "a", replyTo: "m1" });
    await clock.run(31 * 60 * 1000);
    assert.equal(ob.size(), 0);
});
