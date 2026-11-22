// The plan's count limits (answers read out loud and voice minutes per day, cloud computer hours per month) are kept
// in the database; Redis holds a short-lived copy for fast reads (services/plan-usage.service.js). Until 2026-11-21
// they were in Redis alone and a count that could not be read counted as 0, so with Redis away, or after it lost its
// data, these limits stopped nobody. Checked here:
//   - a count is written to the database, and Redis' copy follows it
//   - with Redis away, the count is still added and still read (from the database)
//   - after Redis lost its data, the count is read from the database, not as 0
//   - a count that was only in Redis (from before that day) is carried over the first time it is added to
//   - counts of different people, kinds and days do not mix
//   - a month count works the same way
// Redis and the database are stand-ins: nothing is read from or written to a real one.
// Run: node --experimental-test-module-mocks --test tests/plan-count-kept.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

let redisUp = true;
let kv = new Map();
let rows = new Map();
const needUp = () => { if (!redisUp) throw new Error("Redis is away"); };
mock.module("../src/config/redis.js", {
    defaultExport: {
        get: async (k) => { needUp(); return kv.has(k) ? kv.get(k) : null; },
        set: async (k, v) => { needUp(); kv.set(k, String(v)); return "OK"; },
    },
});
const q = (value) => { const c = { select: () => c, lean: () => c, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: (bad) => Promise.resolve(typeof value === "function" ? value() : value).catch(bad) }; return c; };
mock.module("../src/models/PlanCount.js", {
    defaultExport: {
        exists: async ({ key }) => (rows.has(key) ? { _id: key } : null),
        findOne: ({ key }) => q(() => (rows.has(key) ? { value: rows.get(key) } : null)),
        updateOne: ({ key }, update) => q(() => { if (!rows.has(key)) rows.set(key, update.$setOnInsert.value); return {}; }),
        findOneAndUpdate: ({ key }, update) => q(() => { rows.set(key, (rows.get(key) || 0) + update.$inc.value); return { value: rows.get(key) }; }),
    },
});

const { usedToday, addToday, usedThisMonth, addThisMonth, dayKey, monthKey } = await import("../src/services/plan-usage.service.js");

const A = "aaaaaaaaaaaaaaaaaaaaaaaa", B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const fresh = () => { redisUp = true; kv = new Map(); rows = new Map(); };
const settle = () => new Promise((ok) => setImmediate(ok));

test("a count is written to the database and Redis' copy follows it", async () => {
    fresh();
    await addToday(A, "voice_replies");
    await addToday(A, "voice_replies", 2);
    await settle();
    const key = `plan:voice_replies:${A}:${dayKey()}`;
    assert.equal(rows.get(key), 3);
    assert.equal(kv.get(key), "3");
    assert.equal(await usedToday(A, "voice_replies"), 3);
});

test("with Redis away the count is still added and still read", async () => {
    fresh();
    redisUp = false;
    await addToday(A, "voice_replies", 4);
    await addToday(A, "voice_replies", 1);
    assert.equal(await usedToday(A, "voice_replies"), 5); // (0 before 2026-11-21: the limit stopped nobody)
});

test("after Redis lost its data the count comes from the database, not 0", async () => {
    fresh();
    await addToday(A, "voice_input", 7.5);
    await settle();
    kv = new Map(); // Redis restarted empty
    assert.equal(await usedToday(A, "voice_input"), 7.5);
    await settle();
    assert.equal(kv.get(`plan:voice_input:${A}:${dayKey()}`), "7.5"); // and Redis has its copy again
});

test("a count that was only in Redis is carried over the first time it is added to", async () => {
    fresh();
    const key = `plan:voice_replies:${A}:${dayKey()}`;
    kv.set(key, "12"); // counted before 2026-11-21
    assert.equal(await usedToday(A, "voice_replies"), 12);
    await addToday(A, "voice_replies");
    await settle();
    assert.equal(rows.get(key), 13);
    assert.equal(await usedToday(A, "voice_replies"), 13);
});

test("counts of different people and kinds do not mix", async () => {
    fresh();
    await addToday(A, "voice_replies", 2);
    await addToday(B, "voice_replies", 5);
    await addToday(A, "voice_input", 9);
    await settle();
    assert.equal(await usedToday(A, "voice_replies"), 2);
    assert.equal(await usedToday(B, "voice_replies"), 5);
    assert.equal(await usedToday(A, "voice_input"), 9);
    assert.equal(await usedToday(B, "voice_input"), 0);
});

test("a month count works the same way, Redis away included", async () => {
    fresh();
    await addThisMonth(A, "cloud_hours", 1.25);
    redisUp = false;
    await addThisMonth(A, "cloud_hours", 0.75);
    assert.equal(await usedThisMonth(A, "cloud_hours"), 2);
    assert.equal(rows.get(`plan:cloud_hours:${A}:${monthKey()}`), 2);
});
