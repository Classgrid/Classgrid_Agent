// The plan's cloud computer hours a month and cloud computers at once (owner, 2026-11-17: "check every limit of each
// plan is 100 percent really used ... fix all issues"; both were only shown on the plan card). Checked here:
//   - cloudLabel: the docker labels for an account and a chat; nothing a shell could run gets through; an id that is
//     not an account id gives no labels
//   - accountsRunning: whose containers run, from `docker ps` (the cg-user label, or the names of the editor box, the
//     install box and the live browser); other containers are nobody's
//   - the hours check: under the plan's hours = allowed; used up = refused with the plan's name and hours; 0 = not
//     included; -1, plans off and staff = no limit; with Redis failing the database's count decides (until
//     2026-11-21 the count was in Redis alone and Redis failing never blocked anyone)
//   - the at-once check: a free place = allowed at once; another chat busy = waits, then refused; the same chat's own
//     runs never block it, even many at the same moment; two chats starting in the same moment can't both get the
//     one place; a plan of 2 lets a second chat in; -1 = no limit
//   - the once-a-minute count: every account with something running gets the time since the last count (one minute
//     the first time, two at most), once however many containers it has; an account whose hours are used up has its
//     containers switched off and its editor port forgotten; an account with no limit is counted but never stopped
// Redis, the database's counts, the plan table, the accounts and the sandbox connection are stand-ins: nothing real
// is read or run.
// Run: node --experimental-test-module-mocks --test tests/cloud-computer-limit.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
const ends = new Map(); // when a key set with EX runs out, as in Redis
let redisBroken = false;
const alive = (k) => {
    if (ends.has(k) && ends.get(k) <= Date.now()) { store.delete(k); ends.delete(k); }
    return store.has(k);
};
const redis = {
    get: async (k) => { if (redisBroken) throw new Error("redis down"); return alive(k) ? String(store.get(k)) : null; },
    set: async (k, v, ...opts) => {
        if (redisBroken) throw new Error("redis down");
        if (opts.includes("NX") && alive(k)) return null;
        store.set(k, v);
        const ex = opts.indexOf("EX");
        if (ex >= 0) ends.set(k, Date.now() + Number(opts[ex + 1]) * 1000); else ends.delete(k);
        return "OK";
    },
    del: async (...ks) => { ks.forEach((k) => { store.delete(k); ends.delete(k); }); return 1; },
    incrbyfloat: async (k, n) => { const v = (Number(store.get(k)) || 0) + Number(n); store.set(k, v); return String(v); },
    expire: async (k, s) => { if (alive(k)) ends.set(k, Date.now() + Number(s) * 1000); return 1; },
};
mock.module("../src/config/redis.js", { defaultExport: redis });
// The counts in the database (models/PlanCount.js): where a count is kept; Redis has a short-lived copy
const rows = new Map();
const found = (value) => { const c = { select: () => c, lean: () => c, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: (bad) => Promise.resolve(typeof value === "function" ? value() : value).catch(bad) }; return c; };
mock.module("../src/models/PlanCount.js", {
    defaultExport: {
        exists: async ({ key }) => (rows.has(key) ? { _id: key } : null),
        findOne: ({ key }) => found(() => (rows.has(key) ? { value: rows.get(key) } : null)),
        updateOne: ({ key }, update) => found(() => { if (!rows.has(key)) rows.set(key, update.$setOnInsert.value); return {}; }),
        findOneAndUpdate: ({ key }, update) => found(() => { rows.set(key, (rows.get(key) || 0) + update.$inc.value); return { value: rows.get(key) }; }),
    },
});

const FREE = { key: "free", name: "Free", sandbox_hours_per_month: 3, sandbox_sessions: 1 };
const MAX = { key: "max", name: "Max", sandbox_hours_per_month: 100, sandbox_sessions: 2 };
const NONE = { key: "x", name: "Starter", sandbox_hours_per_month: 0, sandbox_sessions: 1 };
const OPEN = { key: "o", name: "Open", sandbox_hours_per_month: -1, sandbox_sessions: -1 };
const A = "aaaaaaaaaaaaaaaaaaaaaaaa", B = "bbbbbbbbbbbbbbbbbbbbbbbb", C = "cccccccccccccccccccccccc", D = "dddddddddddddddddddddddd", S = "eeeeeeeeeeeeeeeeeeeeeeee";
const PLAN_OF = { [A]: FREE, [B]: MAX, [C]: NONE, [D]: OPEN, [S]: null };
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async (user) => PLAN_OF[String(user._id)] ?? null } });
mock.module("../src/models/User.js", { defaultExport: { findById: (id) => ({ select: () => ({ lean: async () => ({ _id: id, plan: {}, role: "user", email: "x@example.com" }) }) }) } });

const { cloudLabel, accountsRunning, cloudHoursGate, cloudComputerGate, sampleCloudComputers, cloudHoursUsed } = await import("../src/services/cloud-computer-limit.service.js");
const { monthKey } = await import("../src/services/plan-usage.service.js");

const usedKey = (id) => `plan:sandbox:${id}:${monthKey()}`;
const setHours = (id, hours) => { rows.set(usedKey(id), hours * 3600); store.set(usedKey(id), hours * 3600); };
// A stand-in sandbox connection: `busy` is what `docker ps` answers for the label filter, `ps` for the full list
const fakeSsh = ({ busy = () => "", ps = "" } = {}) => {
    const ran = [];
    return { ran, execCommand: async (cmd) => { ran.push(cmd); return { stdout: cmd.includes("--filter label=cg-user=") && cmd.includes("cg-session") ? busy() : cmd.startsWith("docker ps --format") ? ps : "", code: 0 }; } };
};
const reset = () => { store.clear(); ends.clear(); rows.clear(); redisBroken = false; };

test("cloudLabel: an account and a chat, and nothing a shell could run", () => {
    assert.equal(cloudLabel(A, "3f2a-11"), `--label cg-user=${A} --label cg-session=3f2a-11`);
    assert.equal(cloudLabel(A.toUpperCase(), ""), `--label cg-user=${A}`);
    assert.equal(cloudLabel(A, "x; rm -rf / $(id) `id`"), `--label cg-user=${A} --label cg-session=xrm-rfidid`);
    assert.equal(cloudLabel("not-an-id; rm -rf /", "s"), "");
    assert.equal(cloudLabel("", "s"), "");
});

test("accountsRunning: by label, by the named boxes, and nobody for the rest", () => {
    const ps = [
        `kind_hopper|${A}`,
        `ai-bg-abc123-1a2b3c4d|${A}`,
        `ide-u-${B}|`,
        `ide-npm-${B}|`,
        `studio-b-${C}|`,
        "caddy|",
        "ide-u-notanid|",
        `something|not-an-id`,
        "",
    ].join("\n");
    assert.deepEqual([...accountsRunning(ps)].sort(), [A, B, C]);
    assert.equal(accountsRunning("").size, 0);
});

test("hours: under the limit, used up, not included, no limit", async () => {
    reset();
    assert.equal((await cloudHoursGate(A)).allowed, true);
    setHours(A, 2.9);
    assert.equal((await cloudHoursGate(A)).allowed, true);
    setHours(A, 3);
    const full = await cloudHoursGate(A);
    assert.equal(full.allowed, false);
    assert.equal(full.code, "cloud_hours_used_up");
    assert.match(full.error, /3 hours of cloud computer a month of your Free plan/);
    const none = await cloudHoursGate(C);
    assert.equal(none.allowed, false);
    assert.equal(none.code, "cloud_computer_not_included");
    setHours(D, 9999);
    assert.equal((await cloudHoursGate(D)).allowed, true); // -1
    setHours(S, 9999);
    assert.equal((await cloudHoursGate(S)).allowed, true); // staff or plans off: no plan row
    assert.equal((await cloudHoursGate("not-an-id")).allowed, true);
});

test("hours: with Redis failing the database's count decides", async () => {
    reset();
    redisBroken = true;
    assert.equal((await cloudHoursGate(A)).allowed, true); // nothing used yet
    setHours(A, 2.9);
    assert.equal((await cloudHoursGate(A)).allowed, true);
    setHours(A, 3);
    assert.equal((await cloudHoursGate(A)).allowed, false); // (allowed before 2026-11-21: the count read as 0)
});

test("at once: a free place is allowed at once, with the labels for the run", async () => {
    reset();
    const ssh = fakeSsh();
    const r = await cloudComputerGate(ssh, { userId: A, sessionId: "chat-1" });
    assert.equal(r.allowed, true);
    assert.equal(r.label, `--label cg-user=${A} --label cg-session=chat-1`);
});

test("at once: the same chat's own run never blocks it", async () => {
    reset();
    const ssh = fakeSsh({ busy: () => "chat-1\nchat-1\n" });
    assert.equal((await cloudComputerGate(ssh, { userId: A, sessionId: "chat-1" })).allowed, true);
});

test("at once: many runs of one chat at the same moment all start at once (helpers side by side)", async () => {
    reset();
    const ssh = fakeSsh({ busy: () => "chat-1\n" });
    const started = Date.now();
    const results = await Promise.all(Array.from({ length: 8 }, () => cloudComputerGate(ssh, { userId: A, sessionId: "chat-1" })));
    assert.equal(results.filter((r) => r.allowed).length, 8);
    assert.ok(Date.now() - started < 1000, "none of them waited for the lock");
});

test("at once: a second chat starting in the same moment waits for the first one's lock", async () => {
    reset();
    let firstRunning = false;
    const ssh = fakeSsh({ busy: () => (firstRunning ? "chat-1\n" : "") });
    const first = await cloudComputerGate(ssh, { userId: A, sessionId: "chat-1" });
    assert.equal(first.allowed, true);
    setTimeout(() => { firstRunning = true; }, 500); // the first run shows in docker ps half a second later
    setTimeout(() => { firstRunning = false; }, 6000); // and ends
    const started = Date.now();
    const second = await cloudComputerGate(ssh, { userId: A, sessionId: "chat-2" });
    assert.equal(second.allowed, true);
    assert.ok(Date.now() - started >= 5000, "the second chat started only after the first one's run ended");
});

test("at once: another chat busy = waits for it, and goes when it ends", async () => {
    reset();
    let polls = 0;
    const ssh = fakeSsh({ busy: () => (++polls < 3 ? "chat-2\n" : "") });
    const started = Date.now();
    const r = await cloudComputerGate(ssh, { userId: A, sessionId: "chat-1" });
    assert.equal(r.allowed, true);
    assert.ok(polls >= 3);
    assert.ok(Date.now() - started >= 1500, "it waited for the other chat");
});

test("at once: a plan of 2 lets a second chat in, and stops the third", { timeout: 40000 }, async () => {
    reset();
    assert.equal((await cloudComputerGate(fakeSsh({ busy: () => "chat-2\n" }), { userId: B, sessionId: "chat-1" })).allowed, true);
    store.clear();
    const r = await cloudComputerGate(fakeSsh({ busy: () => "chat-2\nchat-3\n" }), { userId: B, sessionId: "chat-1" });
    assert.equal(r.allowed, false);
    assert.equal(r.code, "cloud_computers_busy");
    assert.match(r.error, /Your Max plan runs 2 cloud computers at a time/);
});

test("at once: -1 is no limit, and an unknown account is not checked", async () => {
    reset();
    assert.equal((await cloudComputerGate(fakeSsh({ busy: () => "chat-2\nchat-3\nchat-4\n" }), { userId: D, sessionId: "chat-1" })).allowed, true);
    const r = await cloudComputerGate(fakeSsh(), { userId: "", sessionId: "chat-1" });
    assert.deepEqual(r, { allowed: true, label: "" });
});

test("at once: used-up hours refuse before anything else", async () => {
    reset();
    setHours(A, 3);
    const ssh = fakeSsh();
    const r = await cloudComputerGate(ssh, { userId: A, sessionId: "chat-1" });
    assert.equal(r.allowed, false);
    assert.equal(r.code, "cloud_hours_used_up");
    assert.equal(ssh.ran.length, 0);
});

test("the count: one minute the first time, once per account however many containers", async () => {
    reset();
    const ssh = fakeSsh({ ps: `x|${A}\ny|${A}\nide-u-${A}|\nide-u-${B}|\ncaddy|\n` });
    const r = await sampleCloudComputers(ssh);
    assert.equal(r.counted, 2);
    assert.deepEqual(r.stopped, []);
    assert.equal(rows.get(usedKey(A)), 60);
    assert.equal(rows.get(usedKey(B)), 60);
});

test("the count: the time since the last count, two minutes at most", async () => {
    reset();
    store.set("plan:sandbox:lastsample", String(Date.now() - 30000));
    await sampleCloudComputers(fakeSsh({ ps: `ide-u-${B}|\n` }));
    assert.ok(Math.abs(rows.get(usedKey(B)) - 30) < 2);
    store.set("plan:sandbox:lastsample", String(Date.now() - 10 * 60000));
    await sampleCloudComputers(fakeSsh({ ps: `ide-u-${B}|\n` }));
    assert.ok(Math.abs(rows.get(usedKey(B)) - 150) < 3);
});

test("the count: used-up hours switch that account's containers off, and nobody else's", async () => {
    reset();
    setHours(A, 3);
    store.set(`ide:port:${A}`, "41000");
    store.set(`ide:port:${B}`, "41001");
    setHours(D, 5000);
    const ssh = fakeSsh({ ps: `ide-u-${A}|\nide-u-${B}|\nz|${D}\n` });
    const r = await sampleCloudComputers(ssh);
    assert.deepEqual(r.stopped, [A]);
    const stops = ssh.ran.filter((c) => c.includes("docker rm -f"));
    assert.equal(stops.length, 1);
    assert.ok(stops[0].includes(`ide-u-${A} ide-npm-${A} studio-b-${A}`));
    assert.ok(stops[0].includes(`--filter label=cg-user=${A}`));
    assert.ok(!stops[0].includes(B) && !stops[0].includes(D));
    assert.equal(store.has(`ide:port:${A}`), false);
    assert.equal(store.get(`ide:port:${B}`), "41001");
});

test("cloudHoursUsed: hours with one decimal", async () => {
    reset();
    store.set(usedKey(A), 5400);
    assert.equal(await cloudHoursUsed(A), 1.5);
    assert.equal(await cloudHoursUsed("nope"), 0);
});
