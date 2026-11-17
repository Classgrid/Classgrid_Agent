// The plan's coding agent runs a month and its runs with a Claude model (owner, 2026-11-17: "check every plan limit
// is really used and fix what isn't"; these two were only shown on the plan card). Checked here:
//   - a run is counted and let through until the plan's number is used, then refused with the plan's name and number
//   - -1 = no limit (nothing counted against a limit), 0 = not included (refused at once, nothing counted)
//   - a premium run (a Claude model) counts on both numbers; refused on the premium number, the coding run it took
//     is given back, so a refused run never uses up a run
//   - two messages at the same moment on the last run: only one passes (one atomic INCR, the loser gives it back)
//   - plans off or a staff account (no plan row): never limited, nothing counted
//   - one count per account: the key is the user id, so the emails added to an account share it
//   - Redis failing never blocks a run
// Redis is a stand-in map: nothing is read from or written to a real Redis.
// Run: node --experimental-test-module-mocks --test tests/coding-runs.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
let broken = false;
const fail = () => { throw new Error("redis down"); };
const redis = {
    incr: async (k) => { if (broken) fail(); const v = (Number(store.get(k)) || 0) + 1; store.set(k, v); return v; },
    decr: async (k) => { if (broken) fail(); const v = (Number(store.get(k)) || 0) - 1; store.set(k, v); return v; },
    expire: async () => 1,
    mget: async (...ks) => { if (broken) fail(); return ks.map((k) => (store.has(k) ? String(store.get(k)) : null)); },
    get: async (k) => (store.has(k) ? String(store.get(k)) : null),
    incrbyfloat: async (k, n) => { const v = (Number(store.get(k)) || 0) + Number(n); store.set(k, v); return String(v); },
};
mock.module("../src/config/redis.js", { defaultExport: redis });

const { takeCodingRun, codingRunsUsed } = await import("../src/services/coding-run-limit.service.js");

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const FREE = { key: "free", name: "Free", coding_runs_per_month: 3, premium_runs_per_month: 0 };
const PRO = { key: "pro", name: "Pro", coding_runs_per_month: 5, premium_runs_per_month: 2 };
const reset = () => { store.clear(); broken = false; };

test("runs are counted and let through until the plan's number is used", async () => {
    reset();
    for (let i = 0; i < 3; i++) assert.equal((await takeCodingRun(USER, FREE)).allowed, true);
    const fourth = await takeCodingRun(USER, FREE);
    assert.equal(fourth.allowed, false);
    assert.equal(fourth.code, "coding_runs_cap_reached");
    assert.match(fourth.error, /3 coding agent runs a month of your Free plan/);
    assert.deepEqual(await codingRunsUsed(USER), { runs: 3, premium: 0 }); // the refused run was given back
});

test("-1 is no limit and 0 is not included", async () => {
    reset();
    for (let i = 0; i < 50; i++) assert.equal((await takeCodingRun(USER, { name: "Max", coding_runs_per_month: -1, premium_runs_per_month: -1 }, { premium: true })).allowed, true);
    assert.deepEqual(await codingRunsUsed(USER), { runs: 0, premium: 0 });
    const none = await takeCodingRun(USER, { name: "Free", coding_runs_per_month: 0, premium_runs_per_month: 0 });
    assert.equal(none.allowed, false);
    assert.equal(none.code, "coding_runs_not_included");
    assert.deepEqual(await codingRunsUsed(USER), { runs: 0, premium: 0 });
});

test("a Claude run on a plan without premium runs is refused and uses up nothing", async () => {
    reset();
    const r = await takeCodingRun(USER, FREE, { premium: true });
    assert.equal(r.allowed, false);
    assert.equal(r.code, "premium_runs_not_included");
    assert.deepEqual(await codingRunsUsed(USER), { runs: 0, premium: 0 });
});

test("premium runs count on both numbers, and a refused premium run gives its coding run back", async () => {
    reset();
    assert.equal((await takeCodingRun(USER, PRO, { premium: true })).allowed, true);
    assert.equal((await takeCodingRun(USER, PRO, { premium: true })).allowed, true);
    assert.deepEqual(await codingRunsUsed(USER), { runs: 2, premium: 2 });
    const third = await takeCodingRun(USER, PRO, { premium: true });
    assert.equal(third.allowed, false);
    assert.equal(third.code, "premium_runs_cap_reached");
    assert.match(third.error, /2 project runs with Claude a month of your Pro plan/);
    assert.deepEqual(await codingRunsUsed(USER), { runs: 2, premium: 2 });
    // another model still works until the coding runs are used
    for (let i = 0; i < 3; i++) assert.equal((await takeCodingRun(USER, PRO)).allowed, true);
    assert.equal((await takeCodingRun(USER, PRO)).allowed, false);
});

test("two messages at the same moment on the last run: only one passes", async () => {
    reset();
    await takeCodingRun(USER, FREE);
    await takeCodingRun(USER, FREE);
    const results = await Promise.all([takeCodingRun(USER, FREE), takeCodingRun(USER, FREE), takeCodingRun(USER, FREE)]);
    assert.equal(results.filter((r) => r.allowed).length, 1);
    assert.deepEqual(await codingRunsUsed(USER), { runs: 3, premium: 0 });
});

test("no plan row (plans off, or a staff account) is never limited", async () => {
    reset();
    for (let i = 0; i < 20; i++) assert.equal((await takeCodingRun(USER, null, { premium: true })).allowed, true);
    assert.equal(store.size, 0);
});

test("the count is per account (the user id), not per email", async () => {
    reset();
    await takeCodingRun(USER, FREE);
    const keys = [...store.keys()];
    assert.equal(keys.length, 1);
    assert.ok(keys[0].startsWith(`plan:codingrun:${USER}:`));
    assert.deepEqual(await codingRunsUsed("bbbbbbbbbbbbbbbbbbbbbbbb"), { runs: 0, premium: 0 });
});

test("Redis failing never blocks a run", async () => {
    reset();
    broken = true;
    assert.equal((await takeCodingRun(USER, FREE)).allowed, true);
    assert.deepEqual(await codingRunsUsed(USER), { runs: 0, premium: 0 });
});
