// The session limit and the weekly limit are for every model (owner, 2026-11-21: "Claude, and GPT or Gemini if we add
// them, are part of the session limit and the weekly limit; the Claude limit is only a cap inside them; with the
// session or the week at 100 percent no model works"). From 2026-11-14 until that day a Claude answer on a plan with
// Claude counted on the plan's weekly Claude credits only, so Claude went on answering with both limits used up.
// Checked here:
//   - a Claude answer is counted on the Claude credits, the session window and the week in one write, by the same number
//   - a Fable answer is counted on Fable's share as well
//   - nothing is written for a cost of 0
//   - with the session window used up and no credits, the usage check refuses (so a Claude message is refused)
//   - with the week used up and no credits, the usage check refuses, and says the week's end is when it comes back
//   - a Claude answer may use only the smaller of what the Claude credits, the session and the week still have
//   - with the session used up and credits there, the person's credits pay for the Claude answer
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
        findOneAndUpdate: (_filter, update) => { apply(update); return chain(() => account); },
    },
});
mock.module("../src/models/AiCreditSpend.js", { defaultExport: { create: async (row) => row } });
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain(() => config) } });
mock.module("../src/services/email-queue.service.js", { namedExports: { enqueueEmail: async () => {}, enqueueBulkEmails: async () => {} } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async () => plan, isUnlimited: (v) => v === -1 || v === null, planTable: async () => ({ enabled: true, plans: {} }) } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => null, hgetall: async () => null } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ to: () => ({ emit: () => {} }) }) } });

const { countClaudeOnPlan, hasEnoughTokens } = await import("../src/services/ai-credits.service.js");
const { claudeInsidePlan } = await import("../src/services/answer-meter.js");

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const now = Date.now();
// The Free plan of 2026-11-21: 15 lakh a session of 5 hours, 30 lakh a week, 8 lakh of Claude a week
const FREE = { key: "free", name: "Free", tokens_per_window: 1500000, tokens_per_week: 3000000, window_reset_value: 5, window_reset_unit: "hour", claude_credits_per_week: 800000, fable_share_percent: 10 };
const setAccount = (tokens = {}) => {
    plan = FREE;
    writes = [];
    account = { _id: USER, status: "active", plan: { key: "free" }, ai_tokens: { used_this_week: 0, week_used: 0, claude_week_used: 0, fable_week_used: 0, window_start: new Date(now - 60000), week_start: new Date(now - DAY), ...tokens } };
};
const settle = () => new Promise((ok) => setImmediate(ok));

test("a Claude answer is counted on the Claude credits, the session and the week together", async () => {
    setAccount();
    await countClaudeOnPlan(USER, null, 120000);
    await settle();
    assert.deepEqual(writes[0].$inc, { "ai_tokens.claude_week_used": 120000, "ai_tokens.used_this_week": 120000, "ai_tokens.week_used": 120000 });
    assert.equal(account.ai_tokens.claude_week_used, 120000);
    assert.equal(account.ai_tokens.used_this_week, 120000);
    assert.equal(account.ai_tokens.week_used, 120000);
    assert.equal(account.ai_tokens.fable_week_used, 0);
});

test("a Fable answer is counted on Fable's share as well", async () => {
    setAccount();
    await countClaudeOnPlan(USER, null, 30000, { fable: true });
    await settle();
    assert.equal(account.ai_tokens.fable_week_used, 30000);
    assert.equal(account.ai_tokens.claude_week_used, 30000);
    assert.equal(account.ai_tokens.used_this_week, 30000);
    assert.equal(account.ai_tokens.week_used, 30000);
});

test("nothing is written for a cost of 0", async () => {
    setAccount();
    await countClaudeOnPlan(USER, null, 0);
    await countClaudeOnPlan(USER, null, undefined);
    await settle();
    assert.equal(writes.length, 0);
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
    setAccount({ used_this_week: 1500000, week_used: 1500000, ai_credits_balance: 90000, ai_credits_start_date: new Date(now - DAY), ai_credits_end_date: new Date(now + 30 * DAY) });
    const inside = claudeInsidePlan(800000, await hasEnoughTokens(USER, null, 1));
    assert.equal(inside.onCredits, "personal");
    assert.equal(inside.spendable, 90000);
    assert.equal(inside.refuse, undefined);
});

test("Claude answers that used the session up stop the next message of any model", async () => {
    setAccount();
    assert.equal((await hasEnoughTokens(USER, null, 1)).allowed, true);
    await countClaudeOnPlan(USER, null, 800000);
    await countClaudeOnPlan(USER, null, 700000);
    await settle();
    assert.equal(account.ai_tokens.used_this_week, 1500000);
    const check = await hasEnoughTokens(USER, null, 1);
    assert.equal(check.allowed, false);
    assert.equal(check.reason, "Insufficient tokens.");
});
