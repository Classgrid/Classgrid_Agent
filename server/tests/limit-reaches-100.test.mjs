// A limit is used all the way to 100 percent (owner, 2026-11-16: "usage never went to 100 percent, at 93-97 it
// shows limit reached"). Two parts:
//   - services/answer-meter.js: the rules of one answer's rounds (the first round always runs; the rest use only
//     what is really left)
//   - services/ai-credits.service.js hasEnoughTokens: a message starts whenever anything is left, and a refusal
//     says when the limit that ran out comes back (the session window, or the week)
// The accounts, the settings, the plan and Redis are stand-ins: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/limit-reaches-100.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const meter = await import("../src/services/answer-meter.js");
const newMeter = (spendable) => ({ spent: 0, spendable, stopped: false, firstRoundDone: false });

test("the first round of an answer always runs, even with 1 credit left", () => {
    const m = newMeter(1);
    // (the old rule: an input that alone costs more than what is left was cut before a word was written)
    assert.equal(meter.roundInputTooBig(m, "Agent", 5000), false);
    assert.equal(meter.roundTokensLeft(m, "Agent"), 1);
    // it may write a normal reply, not 1 credit's worth of words
    assert.equal(meter.roundMaxOutput(m, "Agent", 0.303), meter.REPLY_TOKEN_ALLOWANCE);
    assert.equal(meter.REPLY_TOKEN_ALLOWANCE, 2000);
});

test("after the first round only what is really left may be used, and with nothing left the answer stops", () => {
    const m = newMeter(6447); // (the free account measured on 2026-11-16: 93,553 of 100,000 used)
    meter.addRound(m, "Agent", 3200); // the first round's real cost
    assert.equal(m.firstRoundDone, true);
    assert.equal(meter.roundTokensLeft(m, "Agent"), 3247);
    assert.equal(Math.floor(meter.roundMaxOutput(m, "Agent", 0.303)), Math.floor(3247 / 0.303));
    assert.equal(meter.roundInputTooBig(m, "Agent", 3000), false);
    assert.equal(meter.roundInputTooBig(m, "Agent", 3247), true); // this round's input alone uses up what is left
    meter.addRound(m, "Agent", 4000, true);
    assert.equal(meter.roundTokensLeft(m, "Agent"), -753); // nothing left: the answer stops here
    assert.equal(meter.roundMaxOutput(m, "Agent", 0.303), 0);
    assert.equal(m.stopped, true);
});

test("a first round that used more than was left still ran in full: the limit is reached, not skipped", () => {
    const m = newMeter(500);
    assert.equal(meter.roundInputTooBig(m, "Agent", 3200), false);
    meter.addRound(m, "Agent", 3800);
    assert.ok(m.spent > m.spendable); // (what is past the limit is not charged: deductTokens stops at the limit)
    assert.ok(meter.roundTokensLeft(m, "Agent") <= 0); // the next round does not start
});

test("helpers never get the first round's room", () => {
    const m = newMeter(1);
    assert.equal(meter.roundInputTooBig(m, "Helper 1", 50), true);
    assert.equal(meter.roundTokensLeft(m, "Helper 1"), 1);
    assert.equal(Math.floor(meter.roundMaxOutput(m, "File reader", 0.303)), 3);
    meter.addRound(m, "Helper 1", 1);
    assert.equal(m.firstRoundDone, false); // (a helper's round is not the answer's first round)
    assert.equal(meter.isFirstRound(m, "Agent"), true);
});

test("no limit (staff, unlimited plans): nothing is capped", () => {
    const m = newMeter(undefined);
    assert.equal(meter.roundTokensLeft(m, "Agent"), undefined);
    assert.equal(meter.roundMaxOutput(m, "Agent", 0.303), undefined);
    assert.equal(meter.roundInputTooBig(m, "Agent", 10 ** 9), false);
});

// ── hasEnoughTokens, with stand-ins ──
const HOUR = 3600000;
const WEEK = 7 * 24 * HOUR;
let account = null;
const PLAN = { key: "free", tokens_per_window: 100000, tokens_per_week: 400000, window_reset_value: 5, window_reset_unit: "hour" };
const chain = (value) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(value).then(ok, bad), catch: () => q }; return q; };
mock.module("../src/models/User.js", {
    defaultExport: { findById: () => chain(account), findByIdAndUpdate: () => chain(null), updateOne: () => chain({}) },
});
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain({ global_ai_blocked: false, free_limit_per_computer: false }) } });
mock.module("../src/services/email-queue.service.js", { namedExports: { enqueueEmail: async () => {} } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async () => PLAN, isUnlimited: (v) => v === -1 || v === null } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, hgetall: async () => null } });
const { hasEnoughTokens } = await import("../src/services/ai-credits.service.js");

const user = ({ used, weekUsed = 0, windowStartedAgo = HOUR, weekStartedAgo = 24 * HOUR, promo = 0, paid = 0 }) => ({
    _id: "aaaaaaaaaaaaaaaaaaaaaaaa", status: "active",
    ai_tokens: {
        used_this_week: used, window_start: new Date(Date.now() - windowStartedAgo), week_reset_date: new Date(Date.now() - windowStartedAgo + 5 * HOUR),
        week_used: weekUsed, week_start: new Date(Date.now() - weekStartedAgo), promotion_credits_balance: promo, ai_credits_balance: paid,
    },
});
const near = (iso, ms) => Math.abs(new Date(iso).getTime() - ms) < 5000;

test("a message starts with anything left: 94 percent used, and 99.999 percent used", async () => {
    account = user({ used: 93553 });
    const at94 = await hasEnoughTokens(account._id, null, 1);
    assert.equal(at94.allowed, true);
    assert.equal(at94.spendable, 6447);
    account = user({ used: 99999 });
    const last = await hasEnoughTokens(account._id, null, 1);
    assert.deepEqual([last.allowed, last.source, last.spendable], [true, "weekly_free", 1]);
});

test("at 100 percent the message is refused, and the card is told when the session limit comes back", async () => {
    account = user({ used: 100000, windowStartedAgo: 2 * HOUR });
    const out = await hasEnoughTokens(account._id, null, 1);
    assert.equal(out.allowed, false);
    assert.equal(out.reason, "Insufficient tokens.");
    assert.ok(near(out.resetAt, Date.now() + 3 * HOUR), out.resetAt); // (5 hours after the window started)
});

test("when the week is what ran out, the reset shown is the week's end, not the session's", async () => {
    account = user({ used: 20000, weekUsed: 400000, windowStartedAgo: HOUR, weekStartedAgo: 2 * 24 * HOUR });
    const out = await hasEnoughTokens(account._id, null, 1);
    assert.equal(out.allowed, false);
    assert.ok(near(out.resetAt, Date.now() - 2 * 24 * HOUR + WEEK), out.resetAt);
});

test("granted or top-up credits keep a person going past the free limit", async () => {
    account = user({ used: 100000, promo: 2500 });
    const out = await hasEnoughTokens(account._id, null, 1);
    assert.deepEqual([out.allowed, out.source, out.spendable], [true, "promotion", 2500]);
});
