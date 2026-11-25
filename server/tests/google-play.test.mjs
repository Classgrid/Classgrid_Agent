// Google Play purchases (owner, 2026-11-22): the fixed rules in services/google-play-rules.js, with no database and
// no Google call. Checked here: the product names -> plan, term and pack amount; the website's credit packs; the
// account check; what a subscription and a credit pack purchase give; renewals; and the idempotency decision.
// Run: node --test tests/google-play.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const R = await import("../src/services/google-play-rules.js");

const USER = "6650f0c2a1b2c3d4e5f60718";
const NOW = new Date("2026-11-22T10:00:00.000Z").getTime();
const DAY = 24 * 3600 * 1000;
const iso = (ms) => new Date(ms).toISOString();

const subPurchase = (over = {}, item = {}) => ({
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    latestOrderId: "GPA.1111-2222-3333-44444",
    externalAccountIdentifiers: { obfuscatedExternalAccountId: USER },
    lineItems: [{
        productId: "classgrid_pro",
        expiryTime: iso(NOW + 30 * DAY),
        offerDetails: { basePlanId: "pro-monthly" },
        autoRenewingPlan: { autoRenewEnabled: true, recurringPrice: { currencyCode: "INR", units: "999", nanos: 0 } },
        latestSuccessfulOrderId: "GPA.1111-2222-3333-44444",
        ...item,
    }],
    ...over,
});

test("subscription products and base plans map to a plan key and a term", () => {
    assert.deepEqual(R.planForSubscription("classgrid_pro", "pro-monthly"), { key: "pro", term: "month" });
    assert.deepEqual(R.planForSubscription("classgrid_pro", "pro-annual"), { key: "pro", term: "year" });
    assert.deepEqual(R.planForSubscription("classgrid_max", "max-monthly"), { key: "max", term: "month" });
    assert.deepEqual(R.planForSubscription("classgrid_max", "max-annual"), { key: "max", term: "year" });
    // a base plan of the other product, unknown ids, and prototype names give nothing
    assert.equal(R.planForSubscription("classgrid_pro", "max-monthly"), null);
    assert.equal(R.planForSubscription("classgrid_max", "pro-annual"), null);
    assert.equal(R.planForSubscription("classgrid_ultra", "pro-monthly"), null);
    assert.equal(R.planForSubscription("classgrid_pro", "toString"), null);
    assert.equal(R.planKeyForProduct("constructor"), null);
    assert.equal(R.planKeyForProduct("credits_500"), null);
});

test("credit pack ids give their rupee amount; anything else is refused", () => {
    assert.equal(R.packAmountInr("credits_500"), 500);
    assert.equal(R.packAmountInr("credits_1000"), 1000);
    assert.equal(R.packAmountInr("credits_2000"), 2000);
    assert.equal(R.packAmountInr("credits_5000"), 5000);
    for (const bad of ["credits_300", "credits_0500", "credits_10000", "credits_", "credits_500x", "classgrid_pro", "", null, undefined]) {
        assert.equal(R.packAmountInr(bad), null, String(bad));
    }
});

test("website top-ups: only the packs, except the low-minimum accounts (any whole amount up to 10,000)", () => {
    for (const ok of [500, 1000, 2000, 5000, "1000"]) assert.equal(R.topupAmountAllowed(ok), true, String(ok));
    for (const bad of [1, 299, 300, 499, 501, 1500, 10000, 500.5, "", null, undefined, "abc", NaN, [500]]) assert.equal(R.topupAmountAllowed(bad), false, String(bad));
    assert.equal(R.topupAmountAllowed(1, { anyAmount: true }), true);
    assert.equal(R.topupAmountAllowed(777, { anyAmount: true }), true);
    assert.equal(R.topupAmountAllowed(10000, { anyAmount: true }), true);
    assert.equal(R.topupAmountAllowed(10001, { anyAmount: true }), false);
    assert.equal(R.topupAmountAllowed(0, { anyAmount: true }), false);
    // a ?topup= link opens the pack at or above it
    assert.equal(R.packAtOrAbove(300), 500);
    assert.equal(R.packAtOrAbove(500), 500);
    assert.equal(R.packAtOrAbove(1200), 2000);
    assert.equal(R.packAtOrAbove(9000), 5000);
});

test("the purchase must carry the signed-in user's id", () => {
    assert.equal(R.accountMatches(USER, USER), true);
    assert.equal(R.accountMatches(USER, { toString: () => USER }), true);
    assert.equal(R.accountMatches("6650f0c2a1b2c3d4e5f60719", USER), false);
    assert.equal(R.accountMatches("", ""), false);
    assert.equal(R.accountMatches(undefined, USER), false);
    assert.equal(R.accountMatches(null, null), false);
});

test("the service account key is read as raw JSON or base64", () => {
    const key = { type: "service_account", client_email: "play@x.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n" };
    const raw = JSON.stringify(key);
    const a = R.parseServiceAccount(raw);
    assert.equal(a.client_email, key.client_email);
    assert.match(a.private_key, /\nabc\n/);
    const b = R.parseServiceAccount(Buffer.from(raw).toString("base64"));
    assert.equal(b.client_email, key.client_email);
    assert.equal(R.parseServiceAccount(""), null);
    assert.equal(R.parseServiceAccount(undefined), null);
    assert.equal(R.parseServiceAccount("not json"), null);
    assert.equal(R.parseServiceAccount(JSON.stringify({ client_email: "x" })), null);
});

test("a new subscription gives its plan with Google's expiry", () => {
    const r = R.readSubscription(subPurchase(), { productId: "classgrid_pro", userId: USER, now: NOW });
    assert.equal(r.ok, true);
    assert.equal(r.key, "pro");
    assert.equal(r.term, "month");
    assert.equal(r.expiresAt.getTime(), NOW + 30 * DAY);
    assert.equal(r.needsAck, true);
    assert.deepEqual(r.recurringPrice, { currency: "INR", amount: 999 });
    assert.equal(r.orderId, "GPA.1111-2222-3333-44444");
    // grace period is still paid
    assert.equal(R.readSubscription(subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" }), { productId: "classgrid_pro", userId: USER, now: NOW }).ok, true);
});

test("a subscription is refused for another account, an inactive state, the wrong product or base plan", () => {
    const other = R.readSubscription(subPurchase({ externalAccountIdentifiers: { obfuscatedExternalAccountId: "someone-else" } }), { productId: "classgrid_pro", userId: USER, now: NOW });
    assert.deepEqual([other.ok, other.status], [false, 403]);
    const none = R.readSubscription(subPurchase({ externalAccountIdentifiers: {} }), { productId: "classgrid_pro", userId: USER, now: NOW });
    assert.deepEqual([none.ok, none.status], [false, 403]);
    for (const state of ["SUBSCRIPTION_STATE_EXPIRED", "SUBSCRIPTION_STATE_PENDING", "SUBSCRIPTION_STATE_ON_HOLD", "SUBSCRIPTION_STATE_PAUSED"]) {
        const r = R.readSubscription(subPurchase({ subscriptionState: state }), { productId: "classgrid_pro", userId: USER, now: NOW });
        assert.deepEqual([r.ok, r.status], [false, 400], state);
    }
    assert.equal(R.readSubscription(subPurchase(), { productId: "classgrid_max", userId: USER, now: NOW }).ok, false);
    assert.equal(R.readSubscription(subPurchase({}, { offerDetails: { basePlanId: "max-annual" } }), { productId: "classgrid_pro", userId: USER, now: NOW }).ok, false);
    assert.equal(R.readSubscription(subPurchase({}, { expiryTime: iso(NOW - 1000) }), { productId: "classgrid_pro", userId: USER, now: NOW }).ok, false);
});

test("the plan put on the user: billing play, source google_play, the token kept, Google's end date", () => {
    const sub = R.readSubscription(subPurchase(), { productId: "classgrid_pro", userId: USER, now: NOW });
    const fresh = R.planFromSubscription({ id: "free" }, sub, { productId: "classgrid_pro", purchaseToken: "tok", basePlanId: "pro-monthly", now: NOW });
    assert.equal(fresh.id, "pro");
    assert.equal(fresh.billing, "play");
    assert.equal(fresh.source, "google_play");
    assert.equal(fresh.status, "active");
    assert.equal(fresh.play_purchase_token, "tok");
    assert.equal(fresh.play_base_plan_id, "pro-monthly");
    assert.equal(fresh.expires_at.getTime(), NOW + 30 * DAY);
    assert.equal(fresh.cancel_at_period_end, false);
    // the end date is always Google's (a longer plan from elsewhere is refused before: otherPlanDecision)
    const web = { id: "pro", status: "active", billing: "prepaid_yearly", started_at: new Date(NOW - 10 * DAY), expires_at: new Date(NOW + 200 * DAY) };
    assert.equal(R.planFromSubscription(web, sub, { productId: "classgrid_pro", purchaseToken: "tok", now: NOW }).expires_at.getTime(), NOW + 30 * DAY);
    // the same Play plan running on (a re-signup) keeps its start date
    const play = { id: "pro", status: "active", billing: "play", play_purchase_token: "old", started_at: new Date(NOW - 40 * DAY), expires_at: new Date(NOW + 2 * DAY) };
    assert.equal(R.planFromSubscription(play, sub, { productId: "classgrid_pro", purchaseToken: "tok", now: NOW }).started_at.getTime(), NOW - 40 * DAY);
});

test("renewal checks: only for Google Play plans near or past their end, not after Google says it is over", () => {
    const plan = { billing: "play", play_purchase_token: "tok", expires_at: new Date(NOW + 2 * 3600 * 1000) };
    assert.equal(R.playRefreshDue(plan, NOW), false); // 2 hours left
    assert.equal(R.playRefreshDue({ ...plan, expires_at: new Date(NOW + 30 * 60 * 1000) }, NOW), true);
    assert.equal(R.playRefreshDue({ ...plan, expires_at: new Date(NOW - DAY) }, NOW), true);
    assert.equal(R.playRefreshDue({ ...plan, expires_at: new Date(NOW - 200 * DAY) }, NOW), false);
    assert.equal(R.playRefreshDue({ ...plan, expires_at: new Date(NOW - DAY), play_state: "SUBSCRIPTION_STATE_EXPIRED" }, NOW), false);
    assert.equal(R.playRefreshDue({ ...plan, billing: "manual_monthly", expires_at: new Date(NOW - DAY) }, NOW), false);
    assert.equal(R.playRefreshDue({ ...plan, play_purchase_token: "", expires_at: new Date(NOW - DAY) }, NOW), false);
    assert.equal(R.playRefreshDue(null, NOW), false);
});

test("a renewal moves the end date to Google's; an expired subscription ends", () => {
    const plan = { id: "pro", billing: "play", play_purchase_token: "tok", play_product_id: "classgrid_pro", expires_at: new Date(NOW - 3600 * 1000), status: "expired" };
    const renewed = R.playRenewalUpdate(plan, subPurchase({ latestOrderId: "GPA.1111-2222-3333-44444..0" }, { expiryTime: iso(NOW + 29 * DAY), latestSuccessfulOrderId: "GPA.1111-2222-3333-44444..0" }), NOW);
    assert.equal(renewed.extended, true);
    assert.equal(renewed.set.expires_at.getTime(), NOW + 29 * DAY);
    assert.equal(renewed.set.status, "active");
    assert.equal(renewed.set.id, "pro");
    assert.equal(renewed.orderId, "GPA.1111-2222-3333-44444..0");
    // cancelled (auto-renew off) but still paid: the end moves, and it is marked to stop at the period's end
    const cancelled = R.playRenewalUpdate(plan, subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED" }, { expiryTime: iso(NOW + 5 * DAY), autoRenewingPlan: { autoRenewEnabled: false } }), NOW);
    assert.equal(cancelled.extended, true);
    assert.equal(cancelled.set.cancel_at_period_end, true);
    // not renewed yet: nothing extended
    const same = R.playRenewalUpdate({ ...plan, expires_at: new Date(NOW + 10 * 60 * 1000) }, subPurchase({}, { expiryTime: iso(NOW + 10 * 60 * 1000) }), NOW);
    assert.equal(same.extended, false);
    assert.equal(same.set.expires_at, undefined);
    // expired (or refunded): ends at Google's end when that is earlier
    const ended = R.playRenewalUpdate({ ...plan, expires_at: new Date(NOW + 10 * DAY) }, subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_EXPIRED" }, { expiryTime: iso(NOW - DAY) }), NOW);
    assert.equal(ended.extended, false);
    assert.equal(ended.set.play_state, "SUBSCRIPTION_STATE_EXPIRED");
    assert.equal(ended.set.expires_at.getTime(), NOW - DAY);
    // on hold (the renewal payment failed): not paid, the plan ends at Google's end
    const hold = R.playRenewalUpdate(plan, subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_ON_HOLD" }, { expiryTime: iso(NOW - DAY) }), NOW);
    assert.equal(hold.set.play_state, "SUBSCRIPTION_STATE_ON_HOLD");
    assert.equal(hold.set.expires_at.getTime(), NOW - DAY);
    // revoked: Google's state is expired with the revoke time as the end; a plan paid far ahead ends then
    const revoked = R.playRenewalUpdate({ ...plan, expires_at: new Date(NOW + 20 * DAY) }, subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_EXPIRED" }, { expiryTime: iso(NOW - 60 * 1000) }), NOW);
    assert.equal(revoked.set.expires_at.getTime(), NOW - 60 * 1000);
});

test("a credit pack purchase: purchased, for this account and product, not used yet", () => {
    const p = { purchaseState: 0, consumptionState: 0, orderId: "GPA.9999", obfuscatedExternalAccountId: USER, productId: "credits_1000" };
    assert.deepEqual(R.readProductPurchase({ ...p, regionCode: "in", purchaseTimeMillis: String(NOW) }, { productId: "credits_1000", userId: USER }), { ok: true, amountInr: 1000, orderId: "GPA.9999", regionCode: "IN", paidAt: new Date(NOW) });
    assert.equal(R.readProductPurchase({ ...p, productId: undefined }, { productId: "credits_1000", userId: USER }).ok, true);
    assert.deepEqual(R.readProductPurchase(p, { productId: "credits_300", userId: USER }).status, 400);
    assert.deepEqual(R.readProductPurchase({ ...p, obfuscatedExternalAccountId: "x" }, { productId: "credits_1000", userId: USER }).status, 403);
    assert.deepEqual(R.readProductPurchase({ ...p, obfuscatedExternalAccountId: undefined }, { productId: "credits_1000", userId: USER }).status, 403);
    assert.equal(R.readProductPurchase({ ...p, purchaseState: 1 }, { productId: "credits_1000", userId: USER }).ok, false);
    assert.match(R.readProductPurchase({ ...p, purchaseState: 2 }, { productId: "credits_1000", userId: USER }).error, /not complete/);
    assert.equal(R.readProductPurchase({ ...p, consumptionState: 1 }, { productId: "credits_1000", userId: USER }).ok, false);
    assert.equal(R.readProductPurchase({ ...p, productId: "credits_5000" }, { productId: "credits_1000", userId: USER }).ok, false);
});

test("idempotency: what to do with a token that was seen before", () => {
    const base = { userId: USER, productId: "credits_500", status: "granted", granted: { credits_added: 1500000 }, updatedAt: new Date(NOW - 1000) };
    assert.equal(R.purchaseDecision(null, { userId: USER, productId: "credits_500", now: NOW }), "new");
    assert.equal(R.purchaseDecision(base, { userId: USER, productId: "credits_500", now: NOW }), "granted");
    assert.equal(R.purchaseDecision(base, { userId: "someone-else", productId: "credits_500", now: NOW }), "other_account");
    assert.equal(R.purchaseDecision(base, { userId: USER, productId: "credits_1000", now: NOW }), "wrong_product");
    const granting = { ...base, status: "granting", granted: null };
    assert.equal(R.purchaseDecision(granting, { userId: USER, productId: "credits_500", now: NOW }), "in_progress");
    assert.equal(R.purchaseDecision({ ...granting, updatedAt: new Date(NOW - R.CLAIM_STALE_MS - 1) }, { userId: USER, productId: "credits_500", now: NOW }), "stale");
    // (an ObjectId-like user id compares by its string)
    assert.equal(R.purchaseDecision({ ...base, userId: { toString: () => USER } }, { userId: USER, productId: "credits_500", now: NOW }), "granted");
});

test("plan changes: an upgrade's new token gives the new plan and names the token it replaced", () => {
    const up = subPurchase({ linkedPurchaseToken: "old-token" }, { productId: "classgrid_max", offerDetails: { basePlanId: "max-annual" }, expiryTime: iso(NOW + 365 * DAY) });
    const r = R.readSubscription(up, { productId: "classgrid_max", userId: USER, now: NOW });
    assert.equal(r.ok, true);
    assert.deepEqual([r.key, r.term, r.productId, r.basePlanId, r.linkedPurchaseToken], ["max", "year", "classgrid_max", "max-annual", "old-token"]);
    const plan = R.planFromSubscription({ id: "pro", billing: "play", status: "active", play_purchase_token: "old-token", expires_at: new Date(NOW + 5 * DAY) }, r, { productId: "classgrid_max", purchaseToken: "new-token", now: NOW });
    assert.equal(plan.play_purchase_token, "new-token");
    assert.equal(plan.id, "max");
    assert.equal(plan.expires_at.getTime(), NOW + 365 * DAY);
});

test("a deferred downgrade keeps the higher plan until Google renews it as the lower one", () => {
    // the new token right after the change: still the Max line item, to be replaced by Pro at renewal
    const deferred = subPurchase({ linkedPurchaseToken: "old-token" }, {
        productId: "classgrid_max", offerDetails: { basePlanId: "max-monthly" }, expiryTime: iso(NOW + 10 * DAY),
        deferredItemReplacement: { productId: "classgrid_pro" },
    });
    const r = R.readSubscription(deferred, { productId: "classgrid_pro", userId: USER, now: NOW });
    assert.equal(r.ok, true);
    assert.deepEqual([r.key, r.term, r.productId], ["max", "month", "classgrid_max"]);
    assert.equal(r.expiresAt.getTime(), NOW + 10 * DAY);
    const plan = R.planFromSubscription({ id: "max", billing: "play", status: "active", expires_at: new Date(NOW + 10 * DAY) }, r, { productId: "classgrid_pro", purchaseToken: "new-token", now: NOW });
    assert.equal(plan.id, "max");
    assert.equal(plan.play_product_id, "classgrid_max");
    // a product the purchase does not name at all is still refused
    assert.equal(R.readSubscription(deferred, { productId: "classgrid_ultra", userId: USER, now: NOW }).ok, false);
    // the renewal: Google now shows the Pro line item, and the plan becomes Pro
    const later = NOW + 10 * DAY + 60 * 1000;
    const renewed = R.playRenewalUpdate(
        { ...plan, play_purchase_token: "new-token" },
        subPurchase({}, { productId: "classgrid_pro", offerDetails: { basePlanId: "pro-monthly" }, expiryTime: iso(later + 30 * DAY), latestSuccessfulOrderId: "GPA.5..0" }),
        later,
    );
    assert.equal(renewed.extended, true);
    assert.deepEqual([renewed.set.id, renewed.set.play_product_id, renewed.set.play_base_plan_id, renewed.key, renewed.term], ["pro", "classgrid_pro", "pro-monthly", "pro", "month"]);
    // while the Max item is still running, a check changes nothing
    const before = R.playRenewalUpdate({ ...plan, play_purchase_token: "new-token" }, deferred, NOW + DAY);
    assert.equal(before.extended, false);
    assert.equal(before.set.id, undefined);
});

test("the overview's plan source and term", () => {
    assert.deepEqual(R.planSourceAndTerm({ billing: "play", play_product_id: "classgrid_max", play_base_plan_id: "max-annual" }, "max"),
        { source: "google_play", term: "year", product_id: "classgrid_max", base_plan_id: "max-annual" });
    assert.deepEqual(R.planSourceAndTerm({ billing: "manual_monthly" }, "pro"), { source: "website", term: "month", product_id: null, base_plan_id: null });
    assert.deepEqual(R.planSourceAndTerm({ billing: "prepaid_yearly" }, "pro"), { source: "website", term: "year", product_id: null, base_plan_id: null });
    assert.deepEqual(R.planSourceAndTerm({ billing: "granted" }, "max"), { source: "granted", term: null, product_id: null, base_plan_id: null });
    // Free, or a plan that has ended, says nothing
    assert.deepEqual(R.planSourceAndTerm({ billing: "manual_monthly" }, "free"), { source: null, term: null, product_id: null, base_plan_id: null });
    assert.deepEqual(R.planSourceAndTerm({ billing: "none" }, "free"), { source: null, term: null, product_id: null, base_plan_id: null });
    assert.deepEqual(R.planSourceAndTerm(null, "pro"), { source: null, term: null, product_id: null, base_plan_id: null });
});

test("a cancelled subscription (auto-renew off) is paid until its expiry: it is given until then", () => {
    const r = R.readSubscription(subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED" }, { expiryTime: iso(NOW + 12 * DAY), autoRenewingPlan: { autoRenewEnabled: false } }), { productId: "classgrid_pro", userId: USER, now: NOW });
    assert.equal(r.ok, true);
    assert.equal(r.expiresAt.getTime(), NOW + 12 * DAY);
    assert.equal(r.autoRenew, false);
    const plan = R.planFromSubscription(null, r, { productId: "classgrid_pro", purchaseToken: "tok", now: NOW });
    assert.equal(plan.cancel_at_period_end, true);
    assert.equal(plan.expires_at.getTime(), NOW + 12 * DAY);
    // its expiry passed: not given
    assert.equal(R.readSubscription(subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED" }, { expiryTime: iso(NOW - 1000) }), { productId: "classgrid_pro", userId: USER, now: NOW }).ok, false);
});

test("another paid plan: the same or a higher tier from elsewhere blocks a Play purchase; a lower one is upgraded", () => {
    const at = (over) => ({ id: "pro", status: "active", billing: "manual_monthly", expires_at: new Date(NOW + 10 * DAY), ...over });
    const ask = (plan, key = "pro", extra = {}) => R.otherPlanDecision(plan, { key, purchaseToken: "new", now: NOW, ...extra });
    assert.equal(ask(at({}), "pro").block, true); // website Pro, buying Pro
    assert.equal(ask(at({ id: "max", billing: "prepaid_yearly" }), "pro").block, true); // website Max, buying Pro
    assert.equal(ask(at({ billing: "granted", expires_at: null }), "pro").block, true); // a gift with no end
    assert.equal(ask(at({ billing: "upi_autopay" }), "pro").block, true);
    assert.deepEqual(ask(at({}), "max"), { block: false, replaces: "manual_monthly" }); // website Pro, upgrading to Max
    // nothing running: ended, cancelled, or Free
    assert.equal(ask(at({ expires_at: new Date(NOW - 1000) }), "pro").block, false);
    assert.equal(ask(at({ status: "expired" }), "pro").block, false);
    assert.equal(ask({ id: "free" }, "pro").block, false);
    assert.equal(ask(null, "pro").block, false);
    // the same Play subscription, or the one this purchase replaces: never blocked
    assert.equal(ask(at({ billing: "play", play_purchase_token: "new" }), "pro").block, false);
    assert.equal(ask(at({ id: "max", billing: "play", play_purchase_token: "old" }), "pro", { linkedPurchaseToken: "old" }).block, false);
    // another Play subscription this one does not replace, same tier: blocked
    assert.equal(ask(at({ billing: "play", play_purchase_token: "other" }), "pro").block, true);
});

test("student offers: read from the line item; an approved student is the GET /api/ai/student rule (verified, not run out)", () => {
    const r = R.readSubscription(subPurchase({}, { offerDetails: { basePlanId: "pro-annual", offerId: "student-yearly" }, expiryTime: iso(NOW + 365 * DAY) }), { productId: "classgrid_pro", userId: USER, now: NOW });
    assert.equal(r.studentOffer, true);
    assert.equal(r.offerId, "student-yearly");
    assert.equal(R.planFromSubscription(null, r, { productId: "classgrid_pro", purchaseToken: "t", now: NOW }).note, "student price");
    assert.equal(R.readSubscription(subPurchase({}, { offerDetails: { basePlanId: "pro-monthly", offerId: "intro-50" } }), { productId: "classgrid_pro", userId: USER, now: NOW }).studentOffer, false);
    assert.equal(R.studentVerified({ verified_at: new Date(NOW - DAY), expires_at: new Date(NOW + DAY) }, NOW), true);
    assert.equal(R.studentVerified({ verified_at: new Date(NOW - DAY) }, NOW), true);
    assert.equal(R.studentVerified({ verified_at: new Date(NOW - 400 * DAY), expires_at: new Date(NOW - DAY) }, NOW), false); // run out
    assert.equal(R.studentVerified({ verified_at: null }, NOW), false);
    assert.equal(R.studentVerified(undefined, NOW), false);
});

test("amounts: what Google charged for the order; else the fallback; a pack bought abroad is booked in its money", () => {
    assert.deepEqual(R.chargedAmount({ total: { currencyCode: "INR", units: "399", nanos: 0 } }, { currency: "INR", amount: 999 }), { currency: "INR", amount: 399, inr: 399, known: true });
    assert.deepEqual(R.chargedAmount(null, { currency: "INR", amount: 999 }), { currency: "INR", amount: 999, inr: 999, known: true });
    assert.deepEqual(R.chargedAmount(null, null), { currency: "", amount: 0, inr: 0, known: false });
    assert.deepEqual(R.chargedAmount({ total: { currencyCode: "USD", units: "5", nanos: 990000000 } }), { currency: "USD", amount: 5.99, inr: 0, known: true });
    assert.deepEqual(R.packFallbackPrice({ amountInr: 500, regionCode: "IN" }), { currency: "INR", amount: 500 });
    assert.equal(R.packFallbackPrice({ amountInr: 500, regionCode: "US" }), null);
});

test("a renewal under an unchanged end date still books its new order", () => {
    const plan = { id: "pro", billing: "play", play_purchase_token: "tok", play_product_id: "classgrid_pro", play_base_plan_id: "pro-monthly", last_payment_id: "GPA.1", expires_at: new Date(NOW + 30 * DAY) };
    const u = R.playRenewalUpdate(plan, subPurchase({ latestOrderId: "GPA.1..0" }, { latestSuccessfulOrderId: "GPA.1..0", expiryTime: iso(NOW + 30 * DAY) }), NOW);
    assert.equal(u.extended, false);
    assert.equal(u.newOrder, "GPA.1..0");
    assert.equal(u.set.last_payment_id, "GPA.1..0");
    // the same order again: nothing new
    assert.equal(R.playRenewalUpdate({ ...plan, last_payment_id: "GPA.1..0" }, subPurchase({}, { latestSuccessfulOrderId: "GPA.1..0", expiryTime: iso(NOW + 30 * DAY) }), NOW).newOrder, null);
});

test("a voided subscription order ends the plan only when it pays for now or Google no longer says it is paid", () => {
    const plan = { id: "pro", billing: "play", play_purchase_token: "tok", play_product_id: "classgrid_pro", last_payment_id: "GPA.1..1" };
    const paid = subPurchase({}, { latestSuccessfulOrderId: "GPA.1..1" });
    assert.equal(R.voidEndsPlan(plan, { purchaseToken: "tok", orderId: "GPA.1..1" }, paid, NOW), true);
    assert.equal(R.voidEndsPlan(plan, { purchaseToken: "tok", orderId: "GPA.1..0" }, paid, NOW), false); // an older period
    assert.equal(R.voidEndsPlan(plan, { purchaseToken: "tok", orderId: "GPA.1..0" }, subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_EXPIRED" }, { expiryTime: iso(NOW - 1000) }), NOW), true);
    assert.equal(R.voidEndsPlan(plan, { purchaseToken: "other", orderId: "GPA.1..1" }, paid, NOW), false);
    assert.equal(R.voidEndsPlan({ ...plan, billing: "manual_monthly" }, { purchaseToken: "tok", orderId: "GPA.1..1" }, paid, NOW), false);
});

test("real-time notifications are read from the Pub/Sub push body", () => {
    const push = (data) => ({ message: { data: Buffer.from(JSON.stringify(data)).toString("base64"), messageId: "m1" }, subscription: "projects/x/subscriptions/y" });
    const base = { version: "1.0", packageName: "com.classgrid.mobile", eventTimeMillis: String(NOW) };
    assert.deepEqual(R.parseRtdnPush(push({ ...base, subscriptionNotification: { version: "1.0", notificationType: 12, purchaseToken: "tok" } })),
        { ok: true, messageId: "m1", token: "tok", orderId: "", productId: "", type: "SUBSCRIPTION_REVOKED", kind: "subscription" });
    for (const [n, name] of [[1, "SUBSCRIPTION_RECOVERED"], [2, "SUBSCRIPTION_RENEWED"], [3, "SUBSCRIPTION_CANCELED"], [5, "SUBSCRIPTION_ON_HOLD"], [13, "SUBSCRIPTION_EXPIRED"]]) {
        assert.equal(R.parseRtdnPush(push({ ...base, subscriptionNotification: { notificationType: n, purchaseToken: "tok" } })).type, name);
    }
    const p = R.parseRtdnPush(push({ ...base, oneTimeProductNotification: { notificationType: 2, purchaseToken: "pt", sku: "credits_500" } }));
    assert.deepEqual([p.kind, p.type, p.token, p.productId], ["product", "ONE_TIME_PRODUCT_CANCELED", "pt", "credits_500"]);
    const v = R.parseRtdnPush(push({ ...base, voidedPurchaseNotification: { purchaseToken: "vt", orderId: "GPA.9", productType: 1, refundType: 1 } }));
    assert.deepEqual([v.kind, v.token, v.orderId], ["voided", "vt", "GPA.9"]);
    assert.equal(R.parseRtdnPush(push({ ...base, testNotification: { version: "1.0" } })).kind, "test");
    assert.equal(R.parseRtdnPush(push({ ...base, packageName: "com.other.app", testNotification: {} })).ok, false);
    assert.equal(R.parseRtdnPush({ message: { data: "not base64 json" } }).ok, false);
    assert.equal(R.parseRtdnPush({}).ok, false);
});

test("the credited mark is short and fixed per token", () => {
    assert.equal(R.creditMark("abc"), R.creditMark("abc"));
    assert.notEqual(R.creditMark("abc"), R.creditMark("abd"));
    assert.equal(R.creditMark("x".repeat(500)).length, 32);
});

test("the turned-off pro-yearly base plan (monthly by mistake) and max-yearly are never sold or granted", () => {
    assert.equal(R.planForSubscription("classgrid_pro", "pro-yearly"), null);
    assert.equal(R.planForSubscription("classgrid_max", "max-yearly"), null);
    assert.deepEqual(R.planForSubscription("classgrid_pro", "pro-annual"), { key: "pro", term: "year" });
    assert.deepEqual(R.planForSubscription("classgrid_max", "max-annual"), { key: "max", term: "year" });
});
