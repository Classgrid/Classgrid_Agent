// The record of credits really spent (owner, 2026-11-20: the Usage page's "Credits used" added what the plan covered
// to what the credits paid, so it never said how many credits were spent). deductTokens writes one row to
// AiCreditSpend each time a balance of credits goes down, with the exact number taken. Checked here:
//   - gifted credits pay: one row, pool "gifted", the number charged
//   - bought credits pay: one row, pool "bought"
//   - a charge bigger than the first pool spills into the other: two rows that add up to the charge, each with its
//     own pool, and the label (what the credits paid for) on both
//   - the plan covers a charge: no row at all
//   - the plan covers part of a charge: one row, for the part the credits paid only
//   - no credits left: no row, and the charge is reported as not charged
//   - a row that cannot be saved never stops or changes the charge
//   - the rows of many charges add up to exactly what left the balances
// The account, the settings and Redis are stand-ins: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/credit-spend-record.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const DAY = 86400000;
let account = null;
let plan = null; // (null = plans off: the global weekly limit below)
let rows = [];
let saveFails = false;
const config = { global_ai_blocked: false, free_limit_per_computer: false, global_user_weekly_limit: 100000, global_token_reset_value: 5, global_token_reset_unit: "hour" };
const chain = (value) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: () => q }; return q; };

const applyInc = (inc) => {
    for (const [path, by] of Object.entries(inc || {})) {
        const key = path.replace("ai_tokens.", "");
        account.ai_tokens[key] = (account.ai_tokens[key] || 0) + by;
    }
};
mock.module("../src/models/User.js", {
    defaultExport: {
        findById: () => chain(() => account),
        findByIdAndUpdate: (_id, update) => { applyInc(update?.$inc); return chain(() => account); },
        updateOne: () => chain({}),
        findOneAndUpdate: (filter, update) => {
            const guardKey = Object.keys(filter).find((k) => k.startsWith("ai_tokens."));
            const field = guardKey?.replace("ai_tokens.", "");
            if (field && (account.ai_tokens[field] || 0) < filter[guardKey].$gte) return chain(null);
            applyInc(update.$inc);
            return chain(() => account);
        },
    },
});
mock.module("../src/models/AiCreditSpend.js", {
    defaultExport: {
        create: async (row) => {
            if (saveFails) throw new Error("the database is away");
            rows.push(row);
            return row;
        },
    },
});
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain(() => config) } });
mock.module("../src/services/email-queue.service.js", { namedExports: { enqueueEmail: async () => {}, enqueueBulkEmails: async () => {} } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async () => plan, isUnlimited: (v) => v === -1 || v === null } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => null, hgetall: async () => null } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ to: () => ({ emit: () => {} }) }) } });

const { deductTokens } = await import("../src/services/ai-credits.service.js");

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const now = Date.now();
const setAccount = (tokens) => { account = { _id: USER, status: "active", ai_tokens: { ...tokens } }; rows = []; saveFails = false; plan = null; };
const gifted = (balance, startDaysAgo = 10) => ({ promotion_credits_balance: balance, promotion_credits_start_date: new Date(now - startDaysAgo * DAY), promotion_credits_end_date: new Date(now + 30 * DAY) });
const bought = (balance, startDaysAgo = 5) => ({ ai_credits_balance: balance, ai_credits_start_date: new Date(now - startDaysAgo * DAY), ai_credits_end_date: new Date(now + 30 * DAY) });
// (the row is written without being waited for: one turn of the event loop lets it land)
const settle = () => new Promise((ok) => setImmediate(ok));
const sum = (list) => list.reduce((a, r) => a + r.credits, 0);

test("gifted credits pay: one row with the number charged", async () => {
    setAccount(gifted(50000));
    const r = await deductTokens(USER, null, 5000, "promotion");
    await settle();
    assert.equal(r.success, true);
    assert.equal(account.ai_tokens.promotion_credits_balance, 45000);
    assert.equal(rows.length, 1);
    assert.deepEqual([rows[0].credits, rows[0].pool, String(rows[0].userId)], [5000, "gifted", USER]);
});

test("bought credits pay: one row, pool bought", async () => {
    setAccount(bought(20000));
    await deductTokens(USER, null, 1234, "personal");
    await settle();
    assert.equal(account.ai_tokens.ai_credits_balance, 18766);
    assert.deepEqual(rows.map((r) => [r.credits, r.pool]), [[1234, "bought"]]);
});

test("a charge bigger than the first pool spills into the other: two rows that add up, the label on both", async () => {
    setAccount({ ...gifted(3000), ...bought(10000) });
    const label = { model: "claude-opus-5-5", what: "Chat" };
    const r = await deductTokens(USER, null, 5000, "promotion", { label });
    await settle();
    assert.equal(account.ai_tokens.promotion_credits_balance, 0);
    assert.equal(account.ai_tokens.ai_credits_balance, 8000);
    assert.equal(r.uncharged, 0);
    assert.deepEqual(rows.map((x) => [x.credits, x.pool]).sort(), [[2000, "bought"], [3000, "gifted"]]);
    assert.equal(sum(rows), 5000);
    for (const x of rows) assert.deepEqual([x.model, x.what], ["claude-opus-5-5", "Chat"]);
});

test("the plan covers the charge: nothing is recorded", async () => {
    setAccount({ ...gifted(50000), used_this_week: 0, week_reset_date: new Date(now + 3600000) });
    const r = await deductTokens(USER, null, 5000, "weekly_free");
    await settle();
    assert.equal(r.type, "free");
    assert.equal(account.ai_tokens.promotion_credits_balance, 50000);
    assert.equal(rows.length, 0);
});

test("the plan covers part of the charge: only the part the credits paid is recorded", async () => {
    setAccount({ ...gifted(50000), used_this_week: 99000, week_reset_date: new Date(now + 3600000) });
    const r = await deductTokens(USER, null, 5000, "weekly_free", { label: { what: "Chat" } });
    await settle();
    assert.equal(r.spilledTo, "promotion");
    assert.equal(account.ai_tokens.used_this_week, 100000);
    assert.equal(account.ai_tokens.promotion_credits_balance, 46000);
    assert.deepEqual(rows.map((x) => [x.credits, x.pool, x.what]), [[4000, "gifted", "Chat"]]);
});

test("no credits left: nothing is recorded and the charge is reported as not charged", async () => {
    setAccount({ ...gifted(0), ...bought(0) });
    const r = await deductTokens(USER, null, 5000, "promotion");
    await settle();
    assert.equal(r.uncharged, 5000);
    assert.equal(rows.length, 0);
});

test("only what the balance holds is recorded when the charge is bigger than every pool", async () => {
    setAccount({ ...gifted(700), ...bought(300) });
    const r = await deductTokens(USER, null, 5000, "promotion");
    await settle();
    assert.equal(r.uncharged, 4000);
    assert.equal(sum(rows), 1000);
    assert.deepEqual([account.ai_tokens.promotion_credits_balance, account.ai_tokens.ai_credits_balance], [0, 0]);
});

test("a row that cannot be saved never stops or changes the charge", async () => {
    setAccount(gifted(50000));
    saveFails = true;
    const quiet = mock.method(console, "error", () => {});
    const r = await deductTokens(USER, null, 5000, "promotion");
    await settle();
    quiet.mock.restore();
    assert.equal(r.success, true);
    assert.equal(r.uncharged, 0);
    assert.equal(account.ai_tokens.promotion_credits_balance, 45000);
});

test("the rows of many charges add up to exactly what left the balances", async () => {
    setAccount({ ...gifted(40000), ...bought(60000) });
    const before = 100000;
    for (const amount of [1, 999, 12345, 30000, 7, 25000, 31648]) await deductTokens(USER, null, amount, "promotion");
    await settle();
    const after = account.ai_tokens.promotion_credits_balance + account.ai_tokens.ai_credits_balance;
    assert.equal(after, 0);
    assert.equal(sum(rows), before - after);
});
