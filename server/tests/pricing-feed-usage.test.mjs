// The public pricing feed (GET /api/public/ai-pricing, read by classgrid.in/pricing, the phone and the AI's plans
// tool) says how much usage a plan has as a multiple of the first plan that has any, never as a number of credits
// (owner, 2026-11-21: "don't show how many credits; show it like Claude does, 5x, 20x"). Checked here:
//   - the session, weekly and Claude usage of every plan are multiples of the Free plan's (Free itself is 1)
//   - a plan without Claude gets 0, an unlimited one -1, a plan with no number set null
//   - when the first plan has none, the next plan that has some is the 1
//   - no credit number of any plan is anywhere in the feed
// The plan table and the settings are stand-ins: nothing is read from a database.
// Run: node --experimental-test-module-mocks --test tests/pricing-feed-usage.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

let PLANS = {};
const chain = (value) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(value).then(ok, bad), catch: () => q }; return q; };
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain({ credits_per_inr: 3000, updatedAt: "2026-11-21T00:00:00.000Z" }) } });
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planTable: async () => ({ enabled: true, plans: PLANS }) } });
mock.module("../src/controllers/ai-credits-topup.controller.js", { namedExports: { TOPUP_MIN_INR: 299, TOPUP_MAX_INR: 10000 } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => "OK" } });

// (the feed is kept for a short while: each test loads the service afresh, with its own plan table)
let load = 0;
const feedOf = async (plans) => {
    PLANS = plans;
    const { aiPricingData } = await import(`../src/services/ai-pricing.service.js?case=${++load}`);
    return JSON.parse(JSON.stringify(await aiPricingData()));
};
const plan = (key, sort, more) => ({ key, name: key[0].toUpperCase() + key.slice(1), sort, price_inr_monthly: sort * 500, price_inr_yearly: sort * 4000, window_reset_value: 5, window_reset_unit: "hour", images_reset_value: 1, images_reset_unit: "month", models_allowed: [], ...more });
const usage = (feed, key) => { const l = feed.plans.find((p) => p.key === key).limits; return [l.sessionUsageX, l.weeklyUsageX, l.claudeUsageX]; };

// The live numbers of 2026-11-21
const LIVE = {
    free: plan("free", 0, { tokens_per_window: 1500000, tokens_per_week: 3000000, claude_credits_per_week: 800000, fable_share_percent: 10 }),
    pro: plan("pro", 1, { tokens_per_window: 4000000, tokens_per_week: 16000000, claude_credits_per_week: 5000000, fable_share_percent: 30 }),
    max: plan("max", 2, { tokens_per_window: 7000000, tokens_per_week: 28000000, claude_credits_per_week: 25000000, fable_share_percent: 60 }),
};

test("every plan's usage is a multiple of the Free plan's", async () => {
    const feed = await feedOf(LIVE);
    assert.deepEqual(usage(feed, "free"), [1, 1, 1]);
    assert.deepEqual(usage(feed, "pro"), [2.67, 5.33, 6.25]);
    assert.deepEqual(usage(feed, "max"), [4.67, 9.33, 31.25]);
});

test("no Claude is 0, unlimited is -1, nothing set is null", async () => {
    const feed = await feedOf({
        free: plan("free", 0, { tokens_per_window: 100, tokens_per_week: 400, claude_credits_per_week: 0 }),
        pro: plan("pro", 1, { tokens_per_window: -1, tokens_per_week: 800, claude_credits_per_week: 5000 }),
        max: plan("max", 2, { tokens_per_week: 1600, claude_credits_per_week: -1 }),
    });
    assert.deepEqual(usage(feed, "free"), [1, 1, 0]);
    // (Free has no Claude, so Pro is the first plan with some: it is the 1)
    assert.deepEqual(usage(feed, "pro"), [-1, 2, 1]);
    assert.deepEqual(usage(feed, "max"), [null, 4, -1]);
});

test("no credit number of any plan is in the feed", async () => {
    const feed = await feedOf(LIVE);
    const text = JSON.stringify(feed);
    for (const p of Object.values(LIVE)) {
        for (const n of [p.tokens_per_window, p.tokens_per_week, p.claude_credits_per_week]) assert.ok(!text.includes(String(n)), `${n} is in the feed`);
    }
    for (const p of feed.plans) {
        assert.equal("claudeCreditsPerWeek" in p.limits, false);
        assert.deepEqual(Object.keys(p.limits).filter((k) => /credit|token/i.test(k)), ["contextTokens"].filter((k) => k in p.limits));
    }
    // (the price of a top-up is public: it is what a buyer pays)
    assert.equal(feed.creditsPerInr, 3000);
});
