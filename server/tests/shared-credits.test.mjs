// One shared pool of credits for everything past a plan limit (owner, 2026-11-17: "gifted credits work everywhere
// bought credits work"). Until then pictures, WhatsApp messages, read-alouds and voice minutes past the plan's number
// could be paid from bought (top-up) credits only, so an account with gifted credits and nothing bought was stopped.
// Checked here:
//   - creditsAvailable: gifted + bought together; an expired pool counts as nothing; the pool that started first is
//     used first; nothing while the account's AI is blocked, the account is not active, or AI is blocked for everyone
//   - canPayExtra: an account with only gifted credits can pay an extra; the price times the count must be covered
//     by both pools together; price 0 = the extra is off
//   - chargeExtra: the older pool pays, and what it can't cover is taken from the other one (never the plan's limit)
// The account, the settings and Redis are stand-ins: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/shared-credits.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const DAY = 86400000;
let account = null;
let config = { global_ai_blocked: false, extra_image_credits: 5000, extra_whatsapp_credits: 2000, extra_voice_reply_credits: 3000, extra_voice_input_credits_per_minute: 2000 };
const chain = (value) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: () => q }; return q; };

// A stand-in for the account in the database: the balance updates deductTokens makes are applied to `account`
const applyInc = (inc) => {
    for (const [path, by] of Object.entries(inc || {})) {
        const key = path.replace("ai_tokens.", "");
        account.ai_tokens[key] = (account.ai_tokens[key] || 0) + by;
    }
};
mock.module("../src/models/User.js", {
    defaultExport: {
        findById: () => chain(() => account),
        findByIdAndUpdate: () => chain(null),
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
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain(() => config) } });
mock.module("../src/services/email-queue.service.js", { namedExports: { enqueueEmail: async () => {}, enqueueBulkEmails: async () => {} } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async () => null, isUnlimited: (v) => v === -1 || v === null } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => null, hgetall: async () => null } });
// (deductTokens tells the person's open pages their balance changed: a stand-in, so no socket server or Redis is opened)
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ to: () => ({ emit: () => {} }) }) } });

const { creditsAvailable } = await import("../src/services/ai-credits.service.js");
const { canPayExtra, chargeExtra } = await import("../src/services/extra-usage.service.js");

const USER = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", email: "x@example.com" };
const now = Date.now();
const setAccount = (tokens, extra = {}) => { account = { _id: USER._id, status: "active", ai_tokens: { ...tokens }, ...extra }; };
const gifted = (balance, startDaysAgo = 10, endInDays = 30) => ({
    promotion_credits_balance: balance, promotion_credits_start_date: new Date(now - startDaysAgo * DAY), promotion_credits_end_date: new Date(now + endInDays * DAY),
});
const bought = (balance, startDaysAgo = 5, endInDays = 30) => ({
    ai_credits_balance: balance, ai_credits_start_date: new Date(now - startDaysAgo * DAY), ai_credits_end_date: new Date(now + endInDays * DAY),
});

test("creditsAvailable: gifted and bought together, the older pool first", async () => {
    setAccount({ ...gifted(40000, 10), ...bought(15000, 5) });
    assert.deepEqual(await creditsAvailable(USER._id), { total: 55000, gifted: 40000, bought: 15000, source: "promotion" });
    setAccount({ ...gifted(40000, 2), ...bought(15000, 9) });
    assert.equal((await creditsAvailable(USER._id)).source, "personal");
});

test("creditsAvailable: only gifted, only bought, none", async () => {
    setAccount(gifted(457725618));
    assert.deepEqual(await creditsAvailable(USER._id), { total: 457725618, gifted: 457725618, bought: 0, source: "promotion" });
    setAccount(bought(9000));
    assert.deepEqual(await creditsAvailable(USER._id), { total: 9000, gifted: 0, bought: 9000, source: "personal" });
    setAccount({});
    assert.deepEqual(await creditsAvailable(USER._id), { total: 0, gifted: 0, bought: 0, source: null });
});

test("creditsAvailable: an expired pool counts as nothing", async () => {
    setAccount({ ...gifted(40000, 40, -1), ...bought(15000, 5) });
    assert.deepEqual(await creditsAvailable(USER._id), { total: 15000, gifted: 0, bought: 15000, source: "personal" });
});

test("creditsAvailable: nothing while AI is blocked or the account is not active", async () => {
    setAccount({ ...gifted(40000), is_ai_blocked: true });
    assert.equal((await creditsAvailable(USER._id)).total, 0);
    setAccount(gifted(40000), { status: "suspended" });
    assert.equal((await creditsAvailable(USER._id)).total, 0);
    setAccount(gifted(40000));
    config = { ...config, global_ai_blocked: true };
    assert.equal((await creditsAvailable(USER._id)).total, 0);
    config = { ...config, global_ai_blocked: false };
    account = null;
    assert.equal((await creditsAvailable(USER._id)).total, 0);
});

test("canPayExtra: an account with only gifted credits can pay an extra", async () => {
    setAccount(gifted(457725618));
    assert.deepEqual(await canPayExtra(USER, "whatsapp"), { allowed: true, price: 2000, total: 2000 });
    assert.deepEqual(await canPayExtra(USER, "image"), { allowed: true, price: 5000, total: 5000 });
    assert.deepEqual(await canPayExtra(USER, "voicereply"), { allowed: true, price: 3000, total: 3000 });
    assert.deepEqual(await canPayExtra(USER, "voiceinput", 3), { allowed: true, price: 2000, total: 6000 });
});

test("canPayExtra: both pools together must cover the price; price 0 is off", async () => {
    setAccount({ ...gifted(3000), ...bought(2500) });
    assert.equal((await canPayExtra(USER, "image")).allowed, true); // 5,000 from 3,000 + 2,500
    setAccount({ ...gifted(3000), ...bought(1500) });
    const short = await canPayExtra(USER, "image");
    assert.equal(short.allowed, false);
    assert.equal(short.reason, "no_credits");
    assert.equal(short.remaining, 4500);
    config = { ...config, extra_image_credits: 0 };
    setAccount(gifted(999999));
    assert.deepEqual(await canPayExtra(USER, "image"), { allowed: false, price: 0, total: 0, reason: "off" });
    config = { ...config, extra_image_credits: 5000 };
});

test("chargeExtra: gifted credits pay; nothing else is touched", async () => {
    setAccount(gifted(60000));
    const charged = await chargeExtra(USER, "whatsapp", 3);
    assert.equal(charged, 6000);
    assert.equal(account.ai_tokens.promotion_credits_balance, 54000);
    assert.equal(account.ai_tokens.ai_credits_balance || 0, 0);
});

test("chargeExtra: the older pool pays first and the rest comes from the other one", async () => {
    setAccount({ ...gifted(3000, 10), ...bought(10000, 5) });
    await chargeExtra(USER, "image"); // 5,000: 3,000 gifted + 2,000 bought
    assert.equal(account.ai_tokens.promotion_credits_balance, 0);
    assert.equal(account.ai_tokens.ai_credits_balance, 8000);
    setAccount({ ...gifted(10000, 2), ...bought(1000, 9) });
    await chargeExtra(USER, "voicereply"); // 3,000: bought is older, 1,000 from it + 2,000 gifted
    assert.equal(account.ai_tokens.ai_credits_balance, 0);
    assert.equal(account.ai_tokens.promotion_credits_balance, 8000);
});
