// The session limit and the weekly limit are for every model (owner, 2026-11-21: "Claude, and GPT or Gemini if we add
// them, are part of the session limit and the weekly limit; the Claude limit is only a cap inside them; with the
// session or the week at 100 percent no model works"). From 2026-11-14 until that day a Claude answer on a plan with
// Claude counted on the plan's weekly Claude credits only, so Claude went on answering with both limits used up, and
// a helper on a Claude model was not counted on the Claude credits at all.
// Checked here (chargeClaudeOnPlan, the one place a Claude use of the plan is charged):
//   - a Claude use is counted on the Claude credits, the session window, the week and the lifetime total in one
//     write, by the same number
//   - a Fable use is counted on Fable's share as well, and stops at Fable's share
//   - nothing is written for a cost of 0
//   - a use bigger than what the Claude credits have left: the rest goes to the person's credits
//   - the same with no credits: the rest is counted on the session and the week alone, never on the Claude credits
//   - a use bigger than what the session has left, no credits: the bars end at 100 percent, the rest is not charged
//   - the session used up, credits there: nothing on the plan, all of it from the credits
// and the check before a Claude message (claudeInsidePlan on hasEnoughTokens' answer):
//   - with the session window used up and no credits it is refused
//   - with the week used up and no credits it is refused, and the week's end is when it comes back
//   - a Claude answer may use only the smaller of what the Claude credits, the session and the week still have
//   - with the session used up and credits there, the person's credits pay
//   - after Claude answers used the session up, the next message of any model is refused
// The account, the plan, the settings and Redis are stand-ins: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/claude-inside-plan.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const DAY = 86400000;
let account = null;
let plan = null;
let writes = [];
const config = { global_ai_blocked: false, free_limit_per_computer: false, global_user_weekly_limit: 100000, global_token_reset_value: 5, global_token_reset_unit: "hour" };
const chain = (value) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: () => q }; return q; };
const apply = (update) => {
    for (const [path, by] of Object.entries(update?.$inc || {})) {
        const key = path.replace("ai_tokens.", "");
        account.ai_tokens[key] = (account.ai_tokens[key] || 0) + by;
    }
    for (const [path, value] of Object.entries(update?.$set || {})) account.ai_tokens[path.replace("ai_tokens.", "")] = value;
};
mock.module("../src/models/User.js", {
    defaultExport: {
        findById: () => chain(() => account),
        findByIdAndUpdate: (_id, update) => { apply(update); return chain(() => account); },
        updateOne: (_filter, update) => { writes.push(update); apply(update); return chain({}); },
        findOneAndUpdate: (filter, update) => {
            const guardKey = Object.keys(filter).find((k) => k.startsWith("ai_tokens."));
            const field = guardKey?.replace("ai_tokens.", "");
            if (field && (account.ai_tokens[field] || 0) < filter[guardKey].$gte) return chain(null);
            apply(update);
            return chain(() => account);
        },
    },
});
mock.module("../src/models/AiCreditSpend.js", { defaultExport: { create: async (row) => row } });
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain(() => config) } });
mock.module("../src/services/email-queue.service.js", { namedExports: { enqueueEmail: async () => {}, enqueueBulkEmails: async () => {} } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async () => plan, isUnlimited: (v) => v === -1 || v === null, planTable: async () => ({ enabled: true, plans: {} }) } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => null, hgetall: async () => null } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ to: () => ({ emit: () => {} }) }) } });

const { chargeClaudeOnPlan, hasEnoughTokens } = await import("../src/services/ai-credits.service.js");
const { claudeInsidePlan } = await import("../src/services/answer-meter.js");

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const now = Date.now();
// The Free plan of 2026-11-21: 15 lakh a session of 5 hours, 30 lakh a week, 8 lakh of Claude a week, Fable 10% of it
const FREE = { key: "free", name: "Free", tokens_per_window: 1500000, tokens_per_week: 3000000, window_reset_value: 5, window_reset_unit: "hour", claude_credits_per_week: 800000, fable_share_percent: 10 };
const setAccount = (tokens = {}) => {
    plan = FREE;
    writes = [];
    account = { _id: USER, status: "active", plan: { key: "free" }, ai_tokens: { used_this_week: 0, week_used: 0, claude_week_used: 0, fable_week_used: 0, total_ai_tokens_used: 0, window_start: new Date(now - 60000), week_start: new Date(now - DAY), ...tokens } };
};
const bought = (balance) => ({ ai_credits_balance: balance, ai_credits_start_date: new Date(now - DAY), ai_credits_end_date: new Date(now + 30 * DAY) });
const settle = () => new Promise((ok) => setImmediate(ok));
const T = () => account.ai_tokens;

test("a Claude use is counted on the Claude credits, the session, the week and the lifetime total together", async () => {
    setAccount();
    const r = await chargeClaudeOnPlan(USER, null, 120000);
    await settle();
    assert.deepEqual(writes[0].$inc, { "ai_tokens.claude_week_used": 120000, "ai_tokens.used_this_week": 120000, "ai_tokens.week_used": 120000, "ai_tokens.total_ai_tokens_used": 120000 });
    assert.deepEqual([T().claude_week_used, T().used_this_week, T().week_used, T().total_ai_tokens_used, T().fable_week_used], [120000, 120000, 120000, 120000, 0]);
    assert.equal(r.onPlan, 120000);
    assert.equal(r.uncharged, 0);
});

test("a Fable use is counted on Fable's share as well, and stops at Fable's share", async () => {
    setAccount();
    await chargeClaudeOnPlan(USER, null, 30000, { fable: true });
    await settle();
    assert.deepEqual([T().fable_week_used, T().claude_week_used, T().used_this_week, T().week_used], [30000, 30000, 30000, 30000]);
    // Fable's share is 10% of 8 lakh = 80,000: 50,000 of it are left. A use of 70,000 puts 50,000 on Fable and the
    // Claude credits; the other 20,000 (no credits) are counted on the session and the week alone
    const r = await chargeClaudeOnPlan(USER, null, 70000, { fable: true });
    await settle();
    assert.equal(T().fable_week_used, 80000);
    assert.equal(T().claude_week_used, 80000);
    assert.equal(T().used_this_week, 100000);
    assert.equal(r.onPlan, 50000);
    assert.equal(r.onPlanOnly, 20000);
    assert.equal(r.uncharged, 0);
});

test("nothing is written for a cost of 0", async () => {
    setAccount();
    await chargeClaudeOnPlan(USER, null, 0);
    await chargeClaudeOnPlan(USER, null, undefined);
    await settle();
    assert.equal(writes.length, 0);
});

test("more than the Claude credits have left: the rest goes to the person's credits", async () => {
    setAccount({ claude_week_used: 750000, week_used: 750000, ...bought(500000) });
    const r = await chargeClaudeOnPlan(USER, null, 200000, { label: { model: "claude-sonnet-5-5", what: "Chat" } });
    await settle();
    assert.equal(T().claude_week_used, 800000); // ends at the Claude limit
    assert.equal(T().used_this_week, 50000); // the session counts only what the plan paid
    assert.equal(T().week_used, 800000);
    assert.equal(T().ai_credits_balance, 350000); // the other 150,000 came from the bought credits
    assert.equal(r.onPlan, 50000);
    assert.equal(r.spilledTo, "personal");
    assert.equal(r.spilledTokens, 150000);
    assert.equal(r.uncharged, 0);
});

test("the same with no credits: the rest is counted on the session and the week alone", async () => {
    setAccount({ claude_week_used: 750000, week_used: 750000 });
    const r = await chargeClaudeOnPlan(USER, null, 200000);
    await settle();
    assert.equal(T().claude_week_used, 800000); // never past the Claude limit
    assert.equal(T().used_this_week, 200000);
    assert.equal(T().week_used, 950000);
    assert.equal(r.onPlan, 50000);
    assert.equal(r.onPlanOnly, 150000);
    assert.equal(r.uncharged, 0);
});

test("more than the session has left, no credits: the bars end at 100 percent and the rest is not charged", async () => {
    setAccount({ used_this_week: 1400000, week_used: 1400000 });
    const r = await chargeClaudeOnPlan(USER, null, 250000);
    await settle();
    assert.equal(T().used_this_week, 1500000); // the session limit, exactly
    assert.equal(T().claude_week_used, 100000);
    assert.equal(r.onPlan, 100000);
    assert.equal(r.onPlanOnly, 0);
    assert.equal(r.uncharged, 150000);
    assert.equal((await hasEnoughTokens(USER, null, 1)).allowed, false);
});

test("the session used up, credits there: nothing on the plan, all of it from the credits", async () => {
    setAccount({ used_this_week: 1500000, week_used: 1500000, ...bought(90000) });
    const r = await chargeClaudeOnPlan(USER, null, 60000);
    await settle();
    assert.equal(T().claude_week_used, 0);
    assert.equal(T().used_this_week, 1500000);
    assert.equal(T().ai_credits_balance, 30000);
    assert.equal(r.onPlan, 0);
    assert.equal(r.uncharged, 0);
});

test("the session window used up, no credits: the check refuses, so a Claude message is refused", async () => {
    setAccount({ used_this_week: 1500000, week_used: 1500000 });
    const check = await hasEnoughTokens(USER, null, 1);
    assert.equal(check.allowed, false);
    const inside = claudeInsidePlan(800000, check);
    assert.equal(inside.refuse, check);
    assert.equal(inside.room, undefined);
});

test("the week used up, no credits: refused, and it comes back at the week's end", async () => {
    setAccount({ used_this_week: 0, week_used: 3000000 });
    const check = await hasEnoughTokens(USER, null, 1);
    assert.equal(check.allowed, false);
    assert.equal(new Date(check.resetAt).getTime(), new Date(account.ai_tokens.week_start).getTime() + 7 * DAY);
    assert.ok(claudeInsidePlan(800000, check).refuse);
});

test("a Claude answer may use the smaller of what the Claude credits, the session and the week have left", async () => {
    // the session has 2 lakh left, the Claude credits 8 lakh
    setAccount({ used_this_week: 1300000, week_used: 1300000 });
    let inside = claudeInsidePlan(800000, await hasEnoughTokens(USER, null, 1));
    assert.equal(inside.room, 200000);
    // the Claude credits have 50,000 left, the session 15 lakh
    setAccount({ claude_week_used: 750000, week_used: 750000 });
    inside = claudeInsidePlan(50000, await hasEnoughTokens(USER, null, 1));
    assert.equal(inside.room, 50000);
    // the week has 1 lakh left, the session 15 lakh, the Claude credits 8 lakh
    setAccount({ used_this_week: 0, week_used: 2900000 });
    inside = claudeInsidePlan(800000, await hasEnoughTokens(USER, null, 1));
    assert.equal(inside.room, 100000);
    // Claude credits with no end: the session still caps the answer
    setAccount({ used_this_week: 1000000, week_used: 1000000 });
    inside = claudeInsidePlan(undefined, await hasEnoughTokens(USER, null, 1));
    assert.equal(inside.room, 500000);
});

test("the session used up, credits there: the person's credits pay for the Claude answer", async () => {
    setAccount({ used_this_week: 1500000, week_used: 1500000, ...bought(90000) });
    const inside = claudeInsidePlan(800000, await hasEnoughTokens(USER, null, 1));
    assert.equal(inside.onCredits, "personal");
    assert.equal(inside.spendable, 90000);
    assert.equal(inside.refuse, undefined);
});

test("Claude answers that used the session up stop the next message of any model", async () => {
    setAccount();
    assert.equal((await hasEnoughTokens(USER, null, 1)).allowed, true);
    await chargeClaudeOnPlan(USER, null, 800000);
    await chargeClaudeOnPlan(USER, null, 700000);
    await settle();
    assert.equal(T().used_this_week, 1500000);
    assert.equal(T().claude_week_used, 800000);
    const check = await hasEnoughTokens(USER, null, 1);
    assert.equal(check.allowed, false);
    assert.equal(check.reason, "Insufficient tokens.");
});
