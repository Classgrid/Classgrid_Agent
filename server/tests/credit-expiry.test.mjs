// Adding credits to a pool that may already have expired (services/credit-expiry.js, 2026-11-21, owner: "fix all").
// A person's bought credits and gifted credits each have ONE end date. Before that day a new top-up
// (routes/razorpay-webhook.routes.js) or a new gift (grantCredits and grantOrgCredits in
// controllers/super-admin/ai-credits-admin.controller.js) did `$inc` on the stored balance and wrote a new end date, so
// credits that had already expired came back to life with the new ones.
// Checked here:
//   - a pool that has not expired: the new credits are added to the balance
//   - an expired pool: the old balance is dropped, the balance is exactly the new credits, the pool starts again
//   - no end date stored: not expired, the credits are added
//   - an end date of exactly now: still alive, the credits are added (the same "< now" the pools are read with)
//   - zero, negative and not-a-number amounts are refused: nothing changes, not even the end date
//   - a balance below zero in an expired pool does not eat the new credits
//   - bought credits: the first purchase writes the start date, a later one keeps it, a purchase after expiry moves it
//   - a gift writes the dates the super admin chose, expired or not
//   - "in all" (bought in all, gifted in all) goes up by the amount either way
//   - an answer charging the balance at the same moment is not lost; a person who does not exist gets nothing
//   - the end date changed between the two tries: both are tried again
//   - the database updates give the same balance as the plain rule (poolAfterAdding), case by case
//   - Extend: which gifts are in force (success, and the older "active"); paused and revoked never are
// The account is a stand-in: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/credit-expiry.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { POOLS, creditAmount, poolHasExpired, poolAfterAdding, addToPool, giftInForce } = await import("../src/services/credit-expiry.js");

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-21T10:00:00.000Z");
const daysFromNow = (n) => new Date(NOW.getTime() + n * DAY);

// The stand-in account and model. It understands only what addToPool sends: a filter on _id plus one field that is
// `{ $lt: date }`, `{ $not: { $lt: date } }` or `null` (empty or missing), and an update made of $set and $inc.
let account = null;
let beforeWrite = []; // (each runs once just before a write is tried: something else changing the account in between)
let writesTried = 0;
const field = (path) => path.replace("ai_tokens.", "");
const isDateBefore = (value, date) => value instanceof Date && value.getTime() < date.getTime();
const matches = (filter) => {
    if (!account || filter._id !== account._id) return false;
    for (const [path, want] of Object.entries(filter)) {
        if (path === "_id") continue;
        const have = account.ai_tokens[field(path)];
        if (want === null) { if (have !== null && have !== undefined) return false; continue; }
        if (want.$lt) { if (!isDateBefore(have, want.$lt)) return false; continue; }
        if (want.$not?.$lt) { if (isDateBefore(have, want.$not.$lt)) return false; continue; }
        throw new Error(`the stand-in does not know this filter: ${JSON.stringify(want)}`);
    }
    return true;
};
const write = (filter, update) => {
    writesTried++;
    const run = beforeWrite.shift();
    if (run) run();
    if (!matches(filter)) return null;
    for (const [path, v] of Object.entries(update.$set || {})) account.ai_tokens[field(path)] = v;
    for (const [path, by] of Object.entries(update.$inc || {})) account.ai_tokens[field(path)] = (account.ai_tokens[field(path)] || 0) + by;
    return { _id: account._id, ai_tokens: { ...account.ai_tokens } };
};
const chain = (value) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad) }; return q; };
const User = {
    findOneAndUpdate: (filter, update) => chain(() => write(filter, update)),
    updateOne: (filter, update) => chain(() => { write(filter, update); return {}; }),
    findById: (id) => chain(() => (account && account._id === id ? { _id: account._id } : null)),
};

const setPool = (pool, { balance = 0, total = balance, start = null, end = null } = {}) => {
    const f = POOLS[pool];
    account = { _id: USER, ai_tokens: { [field(f.balance)]: balance, [field(f.total)]: total, [field(f.start)]: start, [field(f.end)]: end } };
    beforeWrite = [];
    writesTried = 0;
};
const read = (pool) => {
    const f = POOLS[pool];
    return { balance: account.ai_tokens[field(f.balance)], total: account.ai_tokens[field(f.total)], start: account.ai_tokens[field(f.start)], end: account.ai_tokens[field(f.end)] };
};
// A top-up as the Razorpay webhook makes it: 30 days from now, the start date kept while the pool is alive
const topUp = (amount) => addToPool(User, USER, "bought", amount, { now: NOW, startDate: NOW, endDate: daysFromNow(30), startOnlyIfMissing: true });
// A gift as the super admin makes it: the dates chosen in the dashboard
const gift = (amount, startDate, endDate) => addToPool(User, USER, "gifted", amount, { now: NOW, startDate, endDate });

// ── The plain rule ──

test("the rule: a pool that has not expired adds", () => {
    assert.deepEqual(poolAfterAdding({ balance: 40000, endDate: daysFromNow(5) }, 100000, NOW), { expired: false, balance: 140000 });
});

test("the rule: an expired pool drops the old balance", () => {
    assert.deepEqual(poolAfterAdding({ balance: 40000, endDate: daysFromNow(-1) }, 100000, NOW), { expired: true, balance: 100000 });
    assert.deepEqual(poolAfterAdding({ balance: 40000, endDate: new Date(NOW.getTime() - 1) }, 100000, NOW), { expired: true, balance: 100000 });
});

test("the rule: no end date stored is not expired", () => {
    assert.deepEqual(poolAfterAdding({ balance: 40000, endDate: null }, 100000, NOW), { expired: false, balance: 140000 });
    assert.deepEqual(poolAfterAdding({ balance: 40000 }, 100000, NOW), { expired: false, balance: 140000 });
    assert.deepEqual(poolAfterAdding({}, 100000, NOW), { expired: false, balance: 100000 });
    assert.equal(poolHasExpired(null, NOW), false);
    assert.equal(poolHasExpired(undefined, NOW), false);
});

test("the rule: an end date of exactly now is still alive", () => {
    assert.equal(poolHasExpired(new Date(NOW.getTime()), NOW), false);
    assert.equal(poolHasExpired(new Date(NOW.getTime() - 1), NOW), true);
    assert.equal(poolHasExpired(new Date(NOW.getTime() + 1), NOW), false);
    assert.deepEqual(poolAfterAdding({ balance: 40000, endDate: new Date(NOW.getTime()) }, 100000, NOW), { expired: false, balance: 140000 });
});

test("the rule: the end date may be a date, a number or a saved date string", () => {
    assert.equal(poolHasExpired(daysFromNow(-1).toISOString(), NOW), true);
    assert.equal(poolHasExpired(daysFromNow(-1).getTime(), NOW.getTime()), true);
    assert.equal(poolHasExpired(daysFromNow(1).toISOString(), NOW), false);
    assert.equal(poolHasExpired("not a date", NOW), false);
});

test("the rule: zero, negative and not-a-number amounts are refused", () => {
    for (const bad of [0, -1, -100000, NaN, Infinity, -Infinity, null, undefined, "", "  ", "abc", {}, [], true]) {
        assert.equal(creditAmount(bad), 0, `creditAmount(${String(bad)})`);
        assert.equal(poolAfterAdding({ balance: 40000, endDate: daysFromNow(5) }, bad, NOW), null, `alive, ${String(bad)}`);
        assert.equal(poolAfterAdding({ balance: 40000, endDate: daysFromNow(-5) }, bad, NOW), null, `expired, ${String(bad)}`);
    }
    assert.equal(creditAmount(500), 500);
    assert.equal(creditAmount("500"), 500); // (an amount that arrives as text from a form)
});

test("the rule: a balance below zero in an expired pool does not eat the new credits", () => {
    assert.deepEqual(poolAfterAdding({ balance: -80000, endDate: daysFromNow(-1) }, 100000, NOW), { expired: true, balance: 100000 });
});

// ── A top-up (bought credits) ──

test("top-up, not expired: the credits are added, 30 more days, the first purchase's start date stays", async () => {
    const firstBought = daysFromNow(-10);
    setPool("bought", { balance: 40000, total: 100000, start: firstBought, end: daysFromNow(20) });
    const done = await topUp(100000);
    assert.equal(done.expired, false);
    assert.equal(done.refused, false);
    assert.deepEqual(read("bought"), { balance: 140000, total: 200000, start: firstBought, end: daysFromNow(30) });
    assert.equal(done.user.ai_tokens.ai_credits_balance, 140000);
});

test("top-up, expired: the old balance is dropped, the balance is exactly what was bought, the start date is the purchase", async () => {
    setPool("bought", { balance: 40000, total: 100000, start: daysFromNow(-45), end: daysFromNow(-15) });
    const done = await topUp(100000);
    assert.equal(done.expired, true);
    assert.deepEqual(read("bought"), { balance: 100000, total: 200000, start: NOW, end: daysFromNow(30) });
    assert.equal(done.user.ai_tokens.ai_credits_balance, 100000);
});

test("top-up, the first one ever (no dates stored): added, and the start date is written", async () => {
    setPool("bought");
    const done = await topUp(100000);
    assert.equal(done.expired, false);
    assert.deepEqual(read("bought"), { balance: 100000, total: 100000, start: NOW, end: daysFromNow(30) });
});

test("top-up, a balance with no end date stored: not expired, the credits are added", async () => {
    const firstBought = daysFromNow(-90);
    setPool("bought", { balance: 40000, total: 40000, start: firstBought, end: null });
    const done = await topUp(100000);
    assert.equal(done.expired, false);
    assert.deepEqual(read("bought"), { balance: 140000, total: 140000, start: firstBought, end: daysFromNow(30) });
});

test("top-up, the pool ends exactly now: still alive, the credits are added", async () => {
    const firstBought = daysFromNow(-30);
    setPool("bought", { balance: 40000, total: 40000, start: firstBought, end: new Date(NOW.getTime()) });
    const done = await topUp(100000);
    assert.equal(done.expired, false);
    assert.deepEqual(read("bought"), { balance: 140000, total: 140000, start: firstBought, end: daysFromNow(30) });
});

test("top-up, the pool ended one millisecond ago: expired", async () => {
    setPool("bought", { balance: 40000, total: 40000, start: daysFromNow(-30), end: new Date(NOW.getTime() - 1) });
    const done = await topUp(100000);
    assert.equal(done.expired, true);
    assert.equal(read("bought").balance, 100000);
});

test("top-up of zero, a negative number or not a number: refused, nothing changes, the end date too", async () => {
    for (const bad of [0, -5000, NaN, undefined, null, "abc"]) {
        const expiredEnd = daysFromNow(-15);
        setPool("bought", { balance: 40000, total: 100000, start: daysFromNow(-45), end: expiredEnd });
        const done = await topUp(bad);
        assert.deepEqual(done, { user: null, expired: false, refused: true });
        assert.deepEqual(read("bought"), { balance: 40000, total: 100000, start: daysFromNow(-45), end: expiredEnd });
        assert.equal(writesTried, 0);
    }
});

test("top-up, expired pool with a balance below zero: the new credits are whole", async () => {
    setPool("bought", { balance: -30000, total: 100000, start: daysFromNow(-45), end: daysFromNow(-15) });
    await topUp(100000);
    assert.equal(read("bought").balance, 100000);
});

test("two top-ups one after the other on an expired pool: the first starts the pool again, the second adds to it", async () => {
    setPool("bought", { balance: 40000, total: 100000, start: daysFromNow(-45), end: daysFromNow(-15) });
    assert.equal((await topUp(100000)).expired, true);
    assert.equal((await topUp(50000)).expired, false);
    assert.deepEqual(read("bought"), { balance: 150000, total: 250000, start: NOW, end: daysFromNow(30) });
});

test("an answer charges the balance at the same moment as a top-up: the charge is not lost", async () => {
    setPool("bought", { balance: 40000, total: 100000, start: daysFromNow(-10), end: daysFromNow(20) });
    // (the first write tried is the "expired" one, which does not match; the charge lands before the "alive" one)
    beforeWrite = [null, () => { account.ai_tokens.ai_credits_balance -= 15000; }];
    await topUp(100000);
    assert.equal(read("bought").balance, 125000);
});

test("a person who does not exist: nothing is added", async () => {
    setPool("bought", { balance: 40000 });
    const done = await addToPool(User, "bbbbbbbbbbbbbbbbbbbbbbbb", "bought", 100000, { now: NOW, endDate: daysFromNow(30), startOnlyIfMissing: true });
    assert.deepEqual(done, { user: null, expired: false, refused: false });
    assert.equal(read("bought").balance, 40000);
});

test("the end date is moved into the past between the two tries: tried again, the old balance is dropped", async () => {
    setPool("bought", { balance: 40000, total: 100000, start: daysFromNow(-10), end: daysFromNow(20) });
    // (alive at the first try; the end date is put in the past just before the "alive" write, so that one misses too)
    beforeWrite = [null, () => { account.ai_tokens.ai_credits_end_date = daysFromNow(-1); }];
    const done = await topUp(100000);
    assert.equal(done.expired, true);
    assert.equal(read("bought").balance, 100000);
});

test("an unknown pool name is an error, not a silent no-op", async () => {
    setPool("bought");
    await assert.rejects(() => addToPool(User, USER, "free", 100, { now: NOW, endDate: daysFromNow(30) }), /Unknown credit pool/);
});

// ── A gift (gifted credits) ──

test("gift, not expired: added to the balance, the dates are the ones chosen for this gift", async () => {
    setPool("gifted", { balance: 70000, total: 100000, start: daysFromNow(-20), end: daysFromNow(10) });
    const done = await gift(50000, daysFromNow(0), daysFromNow(60));
    assert.equal(done.expired, false);
    assert.deepEqual(read("gifted"), { balance: 120000, total: 150000, start: daysFromNow(0), end: daysFromNow(60) });
});

test("gift, expired: the expired balance is dropped, the balance is exactly the new gift", async () => {
    setPool("gifted", { balance: 70000, total: 100000, start: daysFromNow(-40), end: daysFromNow(-10) });
    const done = await gift(50000, daysFromNow(0), daysFromNow(60));
    assert.equal(done.expired, true);
    assert.deepEqual(read("gifted"), { balance: 50000, total: 150000, start: daysFromNow(0), end: daysFromNow(60) });
    assert.equal(done.user.ai_tokens.promotion_credits_balance, 50000);
});

test("gift, no end date stored: not expired, added", async () => {
    setPool("gifted", { balance: 70000, total: 100000 });
    const done = await gift(50000, daysFromNow(0), daysFromNow(60));
    assert.equal(done.expired, false);
    assert.equal(read("gifted").balance, 120000);
});

test("gift, the pool ends exactly now: still alive, added", async () => {
    setPool("gifted", { balance: 70000, total: 100000, start: daysFromNow(-30), end: new Date(NOW.getTime()) });
    const done = await gift(50000, daysFromNow(0), daysFromNow(60));
    assert.equal(done.expired, false);
    assert.equal(read("gifted").balance, 120000);
});

test("gift of zero or a negative number: refused, nothing changes", async () => {
    for (const bad of [0, -50000]) {
        setPool("gifted", { balance: 70000, total: 100000, start: daysFromNow(-40), end: daysFromNow(-10) });
        const done = await gift(bad, daysFromNow(0), daysFromNow(60));
        assert.equal(done.refused, true);
        assert.deepEqual(read("gifted"), { balance: 70000, total: 100000, start: daysFromNow(-40), end: daysFromNow(-10) });
    }
});

test("gifts to several people one after the other: each person's own end date decides", async () => {
    const people = [
        { before: { balance: 70000, total: 100000, start: daysFromNow(-40), end: daysFromNow(-10) }, after: 50000 }, // expired
        { before: { balance: 70000, total: 100000, start: daysFromNow(-5), end: daysFromNow(25) }, after: 120000 }, // alive
        { before: {}, after: 50000 }, // never had a gift
    ];
    for (const person of people) {
        setPool("gifted", person.before);
        await gift(50000, daysFromNow(0), daysFromNow(60));
        assert.equal(read("gifted").balance, person.after);
    }
});

test("a gift leaves the bought credits alone, and a top-up leaves the gifted ones alone", async () => {
    setPool("gifted", { balance: 70000, total: 100000, start: daysFromNow(-40), end: daysFromNow(-10) });
    Object.assign(account.ai_tokens, { ai_credits_balance: 9000, total_ai_credits_purchased: 9000, ai_credits_start_date: null, ai_credits_end_date: daysFromNow(-3) });
    await gift(50000, daysFromNow(0), daysFromNow(60));
    assert.equal(read("bought").balance, 9000);
    assert.deepEqual(read("bought").end, daysFromNow(-3));
    await topUp(20000);
    assert.equal(read("bought").balance, 20000); // (the bought pool had expired too: 9,000 dropped)
    assert.equal(read("gifted").balance, 50000);
    assert.deepEqual(read("gifted").end, daysFromNow(60));
});

// ── The database updates and the plain rule agree ──

test("the database updates give the same balance as the plain rule, case by case", async () => {
    const ends = [null, daysFromNow(-400), daysFromNow(-1), new Date(NOW.getTime() - 1), new Date(NOW.getTime()), new Date(NOW.getTime() + 1), daysFromNow(30)];
    const balances = [0, 1, 40000, -80000];
    const amounts = [1, 50000, 0, -7];
    for (const pool of ["bought", "gifted"]) {
        for (const end of ends) for (const balance of balances) for (const amount of amounts) {
            setPool(pool, { balance, total: 100000, start: daysFromNow(-500), end });
            const rule = poolAfterAdding({ balance, endDate: end }, amount, NOW);
            const done = await addToPool(User, USER, pool, amount, { now: NOW, startDate: NOW, endDate: daysFromNow(30), startOnlyIfMissing: pool === "bought" });
            const label = `${pool}, end ${end ? end.toISOString() : "none"}, balance ${balance}, amount ${amount}`;
            if (rule === null) {
                assert.equal(done.refused, true, label);
                assert.equal(read(pool).balance, balance, label);
            } else {
                assert.equal(done.expired, rule.expired, label);
                assert.equal(read(pool).balance, rule.balance, label);
            }
        }
    }
});

// ── Extend ──

test("Extend: a gift is in force when it is saved as success (or the older 'active'); paused and revoked never are", () => {
    assert.equal(giftInForce("success"), true);
    assert.equal(giftInForce("active"), true);
    for (const status of ["paused", "revoked", "expired", "failed", "pending", "", null, undefined]) {
        assert.equal(giftInForce(status), false, `status ${String(status)}`);
    }
});

test("Extend: the newest gift in force is picked, never a revoked or paused one that is newer", () => {
    const gifts = [ // (newest first, as extendGrantedCredits reads them)
        { _id: "g4", status: "revoked" },
        { _id: "g3", status: "paused" },
        { _id: "g2", status: "success" },
        { _id: "g1", status: "success" },
    ];
    assert.equal(gifts.find((g) => giftInForce(g.status))._id, "g2");
    assert.equal([{ _id: "g2", status: "revoked" }, { _id: "g1", status: "paused" }].find((g) => giftInForce(g.status)), undefined);
});
