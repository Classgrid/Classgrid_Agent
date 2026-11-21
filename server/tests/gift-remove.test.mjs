// Removing or pausing a gift of credits (super admin, AI Usage & Credits) takes off the balance only what is left of
// it. Before 2026-11-21 the whole gift was subtracted whatever had been spent: a gift of 1,00,000 with 80,000 spent
// left the balance at -80,000, and that debt ate the person's next gift (found 2026-11-20 on a real account).
// Checked here (takeFromGifted and lowerGiftedTotal, used by removeGrantedCredits and pauseGrantedCredits):
//   - an unspent gift is taken whole
//   - a partly spent gift gives back only its rest, and the balance ends at 0, not below
//   - a fully spent gift takes nothing
//   - a balance already below zero is not pushed further down
//   - an answer charging the balance at the same moment: the balance is read again, never taken below zero
//   - the "gifted in all" figure follows, and never goes below zero
// The account is a stand-in: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/gift-remove.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

let account = null;
let beforeGuard = null; // (runs once just before a guarded write: another charge landing in between)
const chain = (value) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: () => q }; return q; };
mock.module("../src/models/User.js", {
    defaultExport: {
        findById: () => chain(() => ({ ai_tokens: { ...account.ai_tokens } })),
        updateOne: (_filter, update) => { for (const [path, v] of Object.entries(update.$set || {})) account.ai_tokens[path.replace("ai_tokens.", "")] = v; return chain({}); },
        findOneAndUpdate: (filter, update) => {
            if (beforeGuard) { const run = beforeGuard; beforeGuard = null; run(); }
            const need = filter["ai_tokens.promotion_credits_balance"]?.$gte;
            if (need !== undefined && (account.ai_tokens.promotion_credits_balance || 0) < need) return chain(null);
            for (const [path, by] of Object.entries(update.$inc || {})) account.ai_tokens[path.replace("ai_tokens.", "")] = (account.ai_tokens[path.replace("ai_tokens.", "")] || 0) + by;
            return chain(() => account);
        },
    },
});
mock.module("../src/models/AiCreditSpend.js", { defaultExport: { create: async (row) => row } });
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain(null) } });
mock.module("../src/services/email-queue.service.js", { namedExports: { enqueueEmail: async () => {}, enqueueBulkEmails: async () => {} } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async () => null, isUnlimited: (v) => v === -1 || v === null } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => null, hgetall: async () => null } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => null } });

const { takeFromGifted, lowerGiftedTotal } = await import("../src/services/ai-credits.service.js");

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const setBalance = (balance, total = balance) => { account = { _id: USER, ai_tokens: { promotion_credits_balance: balance, total_promotion_credits_granted: total } }; beforeGuard = null; };

test("an unspent gift is taken whole", async () => {
    setBalance(100000);
    assert.equal(await takeFromGifted(USER, 100000), 100000);
    assert.equal(account.ai_tokens.promotion_credits_balance, 0);
});

test("a partly spent gift gives back only its rest: the balance ends at 0", async () => {
    setBalance(20000); // 1,00,000 gifted, 80,000 spent
    assert.equal(await takeFromGifted(USER, 100000), 20000);
    assert.equal(account.ai_tokens.promotion_credits_balance, 0);
});

test("one of two gifts is removed: the other gift's credits stay", async () => {
    setBalance(150000); // a gift of 1,00,000 and one of 50,000, nothing spent
    assert.equal(await takeFromGifted(USER, 100000), 100000);
    assert.equal(account.ai_tokens.promotion_credits_balance, 50000);
});

test("a fully spent gift takes nothing", async () => {
    setBalance(0);
    assert.equal(await takeFromGifted(USER, 100000), 0);
    assert.equal(account.ai_tokens.promotion_credits_balance, 0);
});

test("a balance already below zero is not pushed further down", async () => {
    setBalance(-80000);
    assert.equal(await takeFromGifted(USER, 100000), 0);
    assert.equal(account.ai_tokens.promotion_credits_balance, -80000);
});

test("an answer charges the balance at the same moment: read again, never below zero", async () => {
    setBalance(60000);
    beforeGuard = () => { account.ai_tokens.promotion_credits_balance = 25000; }; // an answer took 35,000 in between
    assert.equal(await takeFromGifted(USER, 100000), 25000);
    assert.equal(account.ai_tokens.promotion_credits_balance, 0);
});

test("the 'gifted in all' figure follows and never goes below zero", async () => {
    setBalance(0, 150000);
    await lowerGiftedTotal(USER, 100000);
    assert.equal(account.ai_tokens.total_promotion_credits_granted, 50000);
    await lowerGiftedTotal(USER, 100000);
    assert.equal(account.ai_tokens.total_promotion_credits_granted, 0);
});
