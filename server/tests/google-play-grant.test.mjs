// Google Play grants end to end (services/google-play.service.js), with stand-ins for the database, Redis and Google:
//   - a credit pack is credited once even when a step after the credits fails, and a retry finishes it (no double grant)
//   - a pack whose Invoices row exists but whose credits were never added is credited (the row is never proof)
//   - a pack whose credits could not be added lets go of its claim and is not consumed
//   - a plan change that replaces another account's token is refused and not acknowledged
//   - a cancelled subscription still paid until its expiry is given until then
//   - another plan of the same or a higher tier refuses the Play purchase (has_other_plan) without acknowledging it
//   - a student offer is refused for a user who is not an approved student (not_student), given for one who is
// Nothing here reaches a database, Redis or Google.
// Run: node --experimental-test-module-mocks --test tests/google-play-grant.test.mjs
import test, { mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ── A tiny in-memory stand-in for the Mongoose calls the service makes ──
const get = (doc, path) => path.split(".").reduce((at, k) => (at === null || at === undefined ? undefined : at[k]), doc);
const setPath = (doc, path, value) => {
    const keys = path.split(".");
    let at = doc;
    for (const k of keys.slice(0, -1)) { if (at[k] === null || at[k] === undefined || typeof at[k] !== "object") at[k] = {}; at = at[k]; }
    if (value === undefined) delete at[keys[keys.length - 1]]; else at[keys[keys.length - 1]] = value;
};
const same = (a, b) => {
    if (a instanceof Date || b instanceof Date) return a !== undefined && b !== undefined && a !== null && b !== null && new Date(a).getTime() === new Date(b).getTime();
    if (a && typeof a === "object" && typeof a.toString === "function" && !Array.isArray(a)) return String(a) === String(b);
    return String(a) === String(b);
};
const has = (v, want) => (Array.isArray(v) ? v.some((x) => same(x, want)) : v !== undefined && v !== null && same(v, want));
const num = (v) => (v instanceof Date ? v.getTime() : typeof v === "string" && !/^-?\d+(\.\d+)?$/.test(v) ? new Date(v).getTime() : Number(v));
function matchValue(v, cond) {
    if (cond && typeof cond === "object" && !(cond instanceof Date) && Object.keys(cond).some((k) => k.startsWith("$"))) {
        return Object.entries(cond).every(([op, x]) => {
            if (op === "$ne") return !has(v, x);
            if (op === "$lt") return v !== undefined && v !== null && num(v) < num(x);
            if (op === "$gte") return v !== undefined && v !== null && num(v) >= num(x);
            if (op === "$in") return x.some((y) => (y === null ? v === undefined || v === null : has(v, y)));
            if (op === "$nin") return !x.some((y) => has(v, y));
            if (op === "$not") return !matchValue(v, x);
            throw new Error(`stand-in: no ${op}`);
        });
    }
    if (cond === null) return v === undefined || v === null;
    return has(v, cond);
}
const matches = (doc, filter = {}) => Object.entries(filter).every(([k, cond]) => {
    if (k === "$or") return cond.some((f) => matches(doc, f));
    return matchValue(get(doc, k), cond);
});
const clone = (v) => (v === undefined ? undefined : structuredClone(v));
function query(result) {
    const q = { select: () => q, lean: () => q, populate: () => q, limit: () => q, sort: () => q, maxTimeMS: () => q };
    q.then = (ok, bad) => Promise.resolve().then(() => clone(typeof result === "function" ? result() : result)).then(ok, bad);
    q.catch = (bad) => q.then(undefined, bad);
    return q;
}
let ids = 0;
function model({ unique = [], timestamps = false } = {}) {
    const rows = [];
    const failNext = {};
    const fail = (op, update) => { const f = failNext[op]; if (f && f(update)) { delete failNext[op]; throw new Error(`stand-in: ${op} failed`); } };
    const apply = (doc, update, { stamp = true } = {}) => {
        for (const [k, v] of Object.entries(update.$set || {})) setPath(doc, k, clone(v));
        for (const [k, v] of Object.entries(update.$inc || {})) setPath(doc, k, (Number(get(doc, k)) || 0) + v);
        for (const [k, v] of Object.entries(update.$addToSet || {})) { const arr = get(doc, k) || []; if (!arr.some((x) => same(x, v))) arr.push(v); setPath(doc, k, arr); }
        for (const k of Object.keys(update.$unset || {})) setPath(doc, k, undefined);
        if (!Object.keys(update).some((k) => k.startsWith("$"))) Object.assign(doc, clone(update));
        if (timestamps && stamp && !(update.$set && "updatedAt" in update.$set)) doc.updatedAt = new Date();
    };
    const m = {
        rows, failNext,
        init: async () => {},
        async create(fields) {
            fail("create", fields);
            for (const u of unique) if (fields[u] !== undefined && rows.some((r) => same(r[u], fields[u]))) { const e = new Error("E11000 duplicate key"); e.code = 11000; throw e; }
            const doc = { _id: `id${++ids}`, ...clone(fields) };
            if (timestamps) { doc.createdAt = new Date(); doc.updatedAt = new Date(); }
            rows.push(doc);
            const out = clone(doc);
            return { ...out, toObject: () => clone(doc), save: async () => {} };
        },
        findOne: (f) => query(() => rows.find((r) => matches(r, f)) || null),
        findById: (id) => query(() => rows.find((r) => same(r._id, id)) || null),
        find: (f) => query(() => rows.filter((r) => matches(r, f))),
        exists: (f) => query(() => (rows.find((r) => matches(r, f)) ? { _id: 1 } : null)),
        updateOne: (f, u) => query(() => { fail("updateOne", u); const r = rows.find((x) => matches(x, f)); if (r) apply(r, u); return { modifiedCount: r ? 1 : 0 }; }),
        updateMany: (f, u) => query(() => { const list = rows.filter((x) => matches(x, f)); list.forEach((r) => apply(r, u)); return { modifiedCount: list.length }; }),
        deleteOne: (f) => query(() => { const i = rows.findIndex((x) => matches(x, f)); if (i >= 0) rows.splice(i, 1); return { deletedCount: i >= 0 ? 1 : 0 }; }),
        findOneAndUpdate: (f, u, o = {}) => query(() => {
            fail("findOneAndUpdate", u);
            const r = rows.find((x) => matches(x, f));
            if (!r) return null;
            const before = clone(r);
            apply(r, u, { stamp: o.timestamps !== false });
            return o.returnDocument === "after" ? r : before;
        }),
    };
    return m;
}

const User = model();
const GooglePlayPurchase = model({ unique: ["purchaseToken"], timestamps: true });
const AiCreditTransaction = model({ unique: ["razorpay_payment_id"] });
const PlatformTransaction = model();
mock.module("../src/models/User.js", { defaultExport: User });
mock.module("../src/models/GooglePlayPurchase.js", { defaultExport: GooglePlayPurchase });
mock.module("../src/models/AiCreditTransaction.js", { defaultExport: AiCreditTransaction });
mock.module("../src/models/PlatformTransaction.js", { defaultExport: PlatformTransaction });
mock.module("../src/config/redis.js", { defaultExport: { set: async () => "OK", del: async () => 1 } });
// The receipts and team alerts (play-emails.js): recorded, never sent
const sentEmails = [];
mock.module("../src/services/play-emails.js", { namedExports: {
    sendPlayPlanEmails: async (args) => { sentEmails.push({ kind: "plan", ...args }); },
    sendPlayPackEmails: async (args) => { sentEmails.push({ kind: "pack", ...args }); },
    sendPlayNoticeEmails: async (args) => { sentEmails.push({ ...args, email: "notice" }); },
    sendPlayRefundEmails: async (args) => { sentEmails.push({ ...args, email: "refund" }); },
    moneyText: (c) => (c?.known ? `${c.currency === "INR" ? "₹" : `${c.currency} `}${c.amount}` : ""),
} });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => null } });
mock.module("../src/services/plan-limits.service.js", {
    namedExports: { planKeyOf: (u) => (u?.plan?.id && u.plan.status !== "expired" && (!u.plan.expires_at || new Date(u.plan.expires_at) > new Date()) ? u.plan.id : "free") },
});
mock.module("../src/controllers/ai-credits-topup.controller.js", {
    namedExports: { topupBlockedByPlan: async (user) => user?.plan?.id === "free", TOPUP_NEEDS_PLAN: "Top-ups are for the Pro and Max plans. Upgrade your plan first." },
});
mock.module("../src/services/ai-credits.service.js", { namedExports: { calculateCreditsFromAmount: async (inr) => inr * 3000 } });

const S = await import("../src/services/google-play.service.js");
const { creditMark } = await import("../src/services/google-play-rules.js");

// ── Google stand-in ──
const google = { subs: {}, products: {}, orders: {}, acks: [], consumes: [] };
S.usePlayClientForTests({
    purchases: {
        subscriptionsv2: { get: async ({ token }) => { if (!google.subs[token]) { const e = new Error("not found"); e.response = { status: 404 }; throw e; } return { data: structuredClone(google.subs[token]) }; } },
        subscriptions: { acknowledge: async (p) => { google.acks.push(p); return { data: {} }; } },
        products: {
            get: async ({ token }) => ({ data: structuredClone(google.products[token]) }),
            consume: async (p) => { google.consumes.push(p); return { data: {} }; },
        },
        voidedpurchases: { list: async () => ({ data: { voidedPurchases: [] } }) },
    },
    orders: { get: async ({ orderId }) => { if (!google.orders[orderId]) throw new Error("no order"); return { data: google.orders[orderId] }; } },
});

const DAY = 86400000;
const ME = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const iso = (ms) => new Date(ms).toISOString();

beforeEach(() => {
    for (const m of [User, GooglePlayPurchase, AiCreditTransaction, PlatformTransaction]) { m.rows.length = 0; for (const k of Object.keys(m.failNext)) delete m.failNext[k]; }
    google.subs = {}; google.products = {}; google.orders = {}; google.acks = []; google.consumes = [];
    User.rows.push(
        { _id: ME, name: "Asha", email: "asha@example.com", plan: { id: "pro", status: "active", billing: "manual_monthly", expires_at: new Date(Date.now() + 10 * DAY) }, ai_tokens: { ai_credits_balance: 0, total_ai_credits_purchased: 0, ai_credits_end_date: null } },
        { _id: OTHER, name: "Ravi", email: "ravi@example.com", plan: { id: "free" }, ai_tokens: {} },
    );
});

const pack = (token, over = {}) => { google.products[token] = { purchaseState: 0, consumptionState: 0, orderId: `GPA.${token}`, obfuscatedExternalAccountId: ME, productId: "credits_500", regionCode: "IN", purchaseTimeMillis: String(Date.now()), ...over }; };
const me = () => User.rows.find((u) => u._id === ME);
const verifyPack = (token) => S.verifyPlayPurchase({ user: me(), type: "product", productId: "credits_500", purchaseToken: token });
const ageClaim = (token) => { const r = GooglePlayPurchase.rows.find((x) => x.purchaseToken === token); r.updatedAt = new Date(Date.now() - 3 * 60 * 1000); };

test("a pack is credited once when marking it granted fails; the next verify finishes it", async () => {
    pack("t1");
    google.orders["GPA.t1"] = { total: { currencyCode: "INR", units: "500" } };
    GooglePlayPurchase.failNext.updateOne = (u) => u?.$set?.status === "granted";
    await assert.rejects(verifyPack("t1"), (e) => e.status === 500 && e.body.code === "finishing");
    assert.equal(me().ai_tokens.ai_credits_balance, 1500000);
    assert.deepEqual(me().play_credited, [creditMark("t1")]);
    assert.equal(GooglePlayPurchase.rows[0].status, "granting"); // (kept, not rolled back)
    assert.equal(google.consumes.length, 0);
    ageClaim("t1");
    const again = await verifyPack("t1");
    assert.deepEqual(again, { ok: true, credits_added: 1500000 });
    assert.equal(me().ai_tokens.ai_credits_balance, 1500000); // still once
    assert.equal(AiCreditTransaction.rows.filter((r) => r.type === "topup").length, 1);
    assert.equal(PlatformTransaction.rows.length, 1);
    assert.equal(AiCreditTransaction.rows[0].amount_inr, 500);
    assert.equal(GooglePlayPurchase.rows[0].status, "granted");
    assert.equal(google.consumes.length, 1);
    // and a third time: the same answer, nothing more
    assert.deepEqual(await verifyPack("t1"), { ok: true, credits_added: 1500000 });
    assert.equal(me().ai_tokens.ai_credits_balance, 1500000);
});

test("the 30-minute job finishes a credited pack whose request stopped", async () => {
    pack("t2");
    GooglePlayPurchase.failNext.updateOne = (u) => u?.$set?.status === "granted";
    await assert.rejects(verifyPack("t2"));
    ageClaim("t2");
    const out = await S.retryUnfinished();
    assert.equal(out.finished, 1);
    assert.equal(GooglePlayPurchase.rows[0].status, "granted");
    assert.equal(me().ai_tokens.ai_credits_balance, 1500000);
    assert.equal(google.consumes.length, 1);
});

test("an Invoices row without the credits is never proof: the credits are added, then it is finished", async () => {
    pack("t3");
    // what a request that stopped between its Invoices row and the credits left behind
    GooglePlayPurchase.rows.push({ _id: "old", purchaseToken: "t3", userId: ME, type: "product", productId: "credits_500", orderId: "GPA.t3", status: "granting", creditsPlanned: 1500000, credited: false, createdAt: new Date(Date.now() - DAY), updatedAt: new Date(Date.now() - 10 * 60 * 1000) });
    AiCreditTransaction.rows.push({ _id: "inv", razorpay_payment_id: "gplay:GPA.t3", type: "topup", status: "success", credits_added: 1500000, amount_inr: 500, userId: ME });
    const r = await verifyPack("t3");
    assert.deepEqual(r, { ok: true, credits_added: 1500000 });
    assert.equal(me().ai_tokens.ai_credits_balance, 1500000);
    assert.equal(AiCreditTransaction.rows.length, 1); // (the row that was there)
    assert.equal(google.consumes.length, 1);
});

test("credits that could not be added: the claim is let go, nothing is booked or consumed, a retry credits once", async () => {
    pack("t4");
    User.failNext.findOneAndUpdate = (u) => !!u?.$inc;
    await assert.rejects(verifyPack("t4"), /failed/);
    assert.equal(GooglePlayPurchase.rows.length, 0);
    assert.equal(AiCreditTransaction.rows.length, 0);
    assert.equal(google.consumes.length, 0);
    assert.equal(me().ai_tokens.ai_credits_balance, 0);
    assert.deepEqual(await verifyPack("t4"), { ok: true, credits_added: 1500000 });
    assert.equal(me().ai_tokens.ai_credits_balance, 1500000);
});

// ── Subscriptions ──
const sub = (token, { state = "SUBSCRIPTION_STATE_ACTIVE", productId = "classgrid_max", basePlanId = "max-monthly", offerId, expiry = Date.now() + 30 * DAY, linked, account = ME } = {}) => {
    google.subs[token] = {
        subscriptionState: state, acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING", latestOrderId: `GPA.${token}`,
        externalAccountIdentifiers: { obfuscatedExternalAccountId: account }, ...(linked ? { linkedPurchaseToken: linked } : {}),
        lineItems: [{ productId, expiryTime: iso(expiry), offerDetails: { basePlanId, ...(offerId ? { offerId } : {}) }, latestSuccessfulOrderId: `GPA.${token}`, autoRenewingPlan: { autoRenewEnabled: state !== "SUBSCRIPTION_STATE_CANCELED", recurringPrice: { currencyCode: "INR", units: "2999" } } }],
    };
};
const verifySub = (token, productId = "classgrid_max") => S.verifyPlayPurchase({ user: me(), type: "subscription", productId, purchaseToken: token });

test("a plan change replacing another account's token is refused and not acknowledged", async () => {
    GooglePlayPurchase.rows.push({ _id: "a", purchaseToken: "A", userId: OTHER, type: "subscription", productId: "classgrid_pro", status: "granted", createdAt: new Date(), updatedAt: new Date() });
    sub("B", { linked: "A" });
    await assert.rejects(verifySub("B"), (e) => e.status === 403 && e.body.code === "other_account");
    assert.equal(google.acks.length, 0);
    assert.equal(me().plan.billing, "manual_monthly");
    // also when the other account holds it on its plan without a row
    GooglePlayPurchase.rows.length = 0;
    User.rows.find((u) => u._id === OTHER).plan = { id: "pro", status: "active", billing: "play", play_purchase_token: "A", expires_at: new Date(Date.now() + DAY) };
    await assert.rejects(verifySub("B"), (e) => e.body.code === "other_account");
});

test("a plan change of the same account: the new token becomes the plan, the old one is never given again", async () => {
    me().plan = { id: "pro", status: "active", billing: "play", play_purchase_token: "A", play_product_id: "classgrid_pro", expires_at: new Date(Date.now() + 5 * DAY) };
    GooglePlayPurchase.rows.push({ _id: "a", purchaseToken: "A", userId: ME, type: "subscription", productId: "classgrid_pro", status: "granted", acknowledged: true, granted: { plan: { key: "pro" } }, createdAt: new Date(), updatedAt: new Date() });
    sub("B", { linked: "A" });
    google.orders["GPA.B"] = { total: { currencyCode: "INR", units: "1799" } };
    const r = await verifySub("B");
    assert.equal(r.plan.key, "max");
    assert.equal(me().plan.play_purchase_token, "B");
    assert.equal(GooglePlayPurchase.rows.find((x) => x.purchaseToken === "A").replacedBy, "B");
    assert.deepEqual(google.acks.map((a) => a.subscriptionId), ["classgrid_max"]);
    assert.equal(AiCreditTransaction.rows[0].amount_inr, 1799); // what the order charged, not the recurring price
    // the old token sent again: the current plan, nothing changed
    sub("A", { productId: "classgrid_pro", basePlanId: "pro-monthly" });
    const old = await verifySub("A", "classgrid_pro");
    assert.equal(old.plan.key, "max");
    assert.equal(me().plan.play_purchase_token, "B");
});

test("a cancelled subscription still paid until its expiry is given until then", async () => {
    me().plan = { id: "free" };
    const end = Date.now() + 9 * DAY;
    sub("C", { state: "SUBSCRIPTION_STATE_CANCELED", expiry: end });
    const r = await verifySub("C");
    assert.equal(r.plan.key, "max");
    assert.equal(new Date(me().plan.expires_at).getTime(), end);
    assert.equal(me().plan.cancel_at_period_end, true);
});

test("another plan of the same or a higher tier refuses the Play purchase: has_other_plan, not acknowledged", async () => {
    me().plan = { id: "max", status: "active", billing: "prepaid_yearly", expires_at: new Date(Date.now() + 100 * DAY) };
    sub("D");
    await assert.rejects(verifySub("D"), (e) => e.status === 409 && e.body.code === "has_other_plan");
    assert.equal(google.acks.length, 0);
    assert.equal(GooglePlayPurchase.rows.length, 0);
    assert.equal(me().plan.billing, "prepaid_yearly");
    // a lower website plan (Pro) upgraded to Max on Play: taken
    me().plan = { id: "pro", status: "active", billing: "manual_monthly", expires_at: new Date(Date.now() + 10 * DAY) };
    const r = await verifySub("D");
    assert.equal(r.plan.key, "max");
    assert.equal(me().plan.billing, "play");
});

test("a student offer: refused (not_student, not acknowledged) unless the user is an approved student", async () => {
    me().plan = { id: "free" };
    sub("E", { productId: "classgrid_pro", basePlanId: "pro-monthly", offerId: "student-monthly" });
    await assert.rejects(verifySub("E", "classgrid_pro"), (e) => e.status === 403 && e.body.code === "not_student");
    assert.equal(google.acks.length, 0);
    me().student_verification = { verified_at: new Date(Date.now() - 400 * DAY), expires_at: new Date(Date.now() - DAY) }; // run out
    await assert.rejects(verifySub("E", "classgrid_pro"), (e) => e.body.code === "not_student");
    me().student_verification = { verified_at: new Date(Date.now() - DAY), expires_at: new Date(Date.now() + 300 * DAY) };
    const r = await verifySub("E", "classgrid_pro");
    assert.equal(r.plan.key, "pro");
    assert.equal(me().plan.note, "student price");
    assert.equal(google.acks.length, 1);
});

test("a voided pack takes back what is left of its credits, once", async () => {
    pack("v1");
    await verifyPack("v1");
    me().ai_tokens.ai_credits_balance = 1000000; // (500,000 spent)
    assert.equal(await S.applyVoidedPurchase({ purchaseToken: "v1", orderId: "GPA.v1", reason: 1 }), "applied");
    assert.equal(me().ai_tokens.ai_credits_balance, 0);
    assert.equal(await S.applyVoidedPurchase({ purchaseToken: "v1", orderId: "GPA.v1", reason: 1 }), "already");
    const refund = AiCreditTransaction.rows.find((r) => r.type === "refund");
    assert.equal(refund.status, "success");
    assert.equal(refund.metadata.credits_taken, 1000000);
    assert.ok(PlatformTransaction.rows.some((r) => r.type === "refund" && r.status === "refunded"));
    // One refund email, with the credits taken back (the second run stopped at "already")
    const refundMails = sentEmails.filter((e) => e.email === "refund" && e.orderId === "GPA.v1");
    assert.equal(refundMails.length, 1);
    assert.equal(refundMails[0].type, "product");
    assert.equal(refundMails[0].creditsTaken, 1000000);
});

// ── Receipts, test purchases, and purchases Google tells of before the phone sends them (2026-11-26) ──

const flush = () => new Promise((r) => setTimeout(r, 20));

test("a pack's receipt and team alert go out once per Google order; a test purchase is booked at 0 and marked", async () => {
    sentEmails.length = 0;
    pack("e1", { purchaseType: 0 });
    google.orders["GPA.e1"] = { total: { currencyCode: "INR", units: "500" } };
    await verifyPack("e1");
    await verifyPack("e1");
    await flush();
    assert.equal(sentEmails.filter((e) => e.kind === "pack").length, 1);
    assert.equal(sentEmails[0].test, true);
    assert.equal(sentEmails[0].charged.amount, 500); // (the email shows the price; the books show 0)
    const inv = AiCreditTransaction.rows.find((r) => r.razorpay_payment_id === "gplay:GPA.e1");
    assert.equal(inv.amount_inr, 0);
    assert.equal(inv.metadata.test_purchase, true);
    assert.equal(PlatformTransaction.rows[0].amount, 0);
    assert.match(PlatformTransaction.rows[0].note, /test purchase/);
    assert.equal(me().ai_tokens.ai_credits_balance, 1500000); // (a tester still gets the credits)
});

test("a plan's receipt goes out once; a real purchase is booked at what Google charged", async () => {
    sentEmails.length = 0;
    sub("e2");
    google.orders["GPA.e2"] = { total: { currencyCode: "INR", units: "2999" } };
    await verifySub("e2");
    await verifySub("e2");
    await flush();
    const plans = sentEmails.filter((e) => e.kind === "plan");
    assert.equal(plans.length, 1);
    assert.equal(plans[0].key, "max");
    assert.equal(plans[0].test, false);
    assert.equal(AiCreditTransaction.rows.find((r) => r.razorpay_payment_id === "gplay:GPA.e2").amount_inr, 2999);
});

test("a subscription Google tells of before the phone sent it is given to the account named in it", async () => {
    sub("n1");
    const r = await S.handlePlayNotification({ kind: "subscription", type: "SUBSCRIPTION_PURCHASED", token: "n1" });
    assert.equal(r, "granted");
    assert.equal(me().plan.id, "max");
    assert.equal(me().plan.play_purchase_token, "n1");
    assert.equal(google.acks.length, 1);
    // the phone's own verify afterwards: the same answer, nothing given twice
    assert.equal((await verifySub("n1")).ok, true);
    assert.equal(AiCreditTransaction.rows.filter((x) => x.type === "plan").length, 1);
});

test("a pack Google tells of before the phone sent it is credited once; a refused one is not retried", async () => {
    pack("n2");
    assert.equal(await S.handlePlayNotification({ kind: "product", type: "ONE_TIME_PRODUCT_PURCHASED", token: "n2", productId: "credits_500" }), "granted");
    assert.equal(me().ai_tokens.ai_credits_balance, 1500000);
    assert.equal(google.consumes.length, 1);
    // a pending payment is left for its own notification when it completes
    pack("n3", { purchaseState: 2 });
    assert.equal(await S.handlePlayNotification({ kind: "product", type: "ONE_TIME_PRODUCT_PURCHASED", token: "n3", productId: "credits_500" }), "not_paid");
    // Ravi is on Free: top-ups need a plan, so it is refused for good (204 to Pub/Sub, Google refunds it)
    pack("n4", { obfuscatedExternalAccountId: OTHER });
    assert.equal(await S.handlePlayNotification({ kind: "product", type: "ONE_TIME_PRODUCT_PURCHASED", token: "n4", productId: "credits_500" }), "refused");
});

test("a notification for a token Google no longer knows is answered as done, not sent again", async () => {
    assert.equal(await S.handlePlayNotification({ kind: "subscription", type: "SUBSCRIPTION_EXPIRED", token: "gone-token" }), "gone");
});
