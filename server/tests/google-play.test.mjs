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
    assert.deepEqual(R.planForSubscription("classgrid_pro", "pro-yearly"), { key: "pro", term: "year" });
    assert.deepEqual(R.planForSubscription("classgrid_max", "max-monthly"), { key: "max", term: "month" });
    assert.deepEqual(R.planForSubscription("classgrid_max", "max-yearly"), { key: "max", term: "year" });
    // a base plan of the other product, unknown ids, and prototype names give nothing
    assert.equal(R.planForSubscription("classgrid_pro", "max-monthly"), null);
    assert.equal(R.planForSubscription("classgrid_max", "pro-yearly"), null);
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
    assert.equal(r.priceInr, 999);
    assert.equal(r.orderId, "GPA.1111-2222-3333-44444");
    // grace period is still paid
    assert.equal(R.readSubscription(subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" }), { productId: "classgrid_pro", userId: USER, now: NOW }).ok, true);
});

test("a subscription is refused for another account, an inactive state, the wrong product or base plan", () => {
    const other = R.readSubscription(subPurchase({ externalAccountIdentifiers: { obfuscatedExternalAccountId: "someone-else" } }), { productId: "classgrid_pro", userId: USER, now: NOW });
    assert.deepEqual([other.ok, other.status], [false, 403]);
    const none = R.readSubscription(subPurchase({ externalAccountIdentifiers: {} }), { productId: "classgrid_pro", userId: USER, now: NOW });
    assert.deepEqual([none.ok, none.status], [false, 403]);
    for (const state of ["SUBSCRIPTION_STATE_EXPIRED", "SUBSCRIPTION_STATE_PENDING", "SUBSCRIPTION_STATE_ON_HOLD", "SUBSCRIPTION_STATE_PAUSED", "SUBSCRIPTION_STATE_CANCELED"]) {
        const r = R.readSubscription(subPurchase({ subscriptionState: state }), { productId: "classgrid_pro", userId: USER, now: NOW });
        assert.deepEqual([r.ok, r.status], [false, 400], state);
    }
    assert.equal(R.readSubscription(subPurchase(), { productId: "classgrid_max", userId: USER, now: NOW }).ok, false);
    assert.equal(R.readSubscription(subPurchase({}, { offerDetails: { basePlanId: "max-yearly" } }), { productId: "classgrid_pro", userId: USER, now: NOW }).ok, false);
    assert.equal(R.readSubscription(subPurchase({}, { expiryTime: iso(NOW - 1000) }), { productId: "classgrid_pro", userId: USER, now: NOW }).ok, false);
});

test("the plan put on the user: billing play, source google_play, the token kept; paid days of the same plan kept", () => {
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
    // a Pro bought on the website running longer keeps its end date
    const web = { id: "pro", status: "active", billing: "prepaid_yearly", started_at: new Date(NOW - 10 * DAY), expires_at: new Date(NOW + 200 * DAY) };
    const kept = R.planFromSubscription(web, sub, { productId: "classgrid_pro", purchaseToken: "tok", basePlanId: "pro-monthly", now: NOW });
    assert.equal(kept.expires_at.getTime(), NOW + 200 * DAY);
    assert.equal(kept.started_at.getTime(), NOW - 10 * DAY);
    // a gifted plan or another plan does not
    const gift = R.planFromSubscription({ ...web, billing: "granted" }, sub, { productId: "classgrid_pro", purchaseToken: "tok", now: NOW });
    assert.equal(gift.expires_at.getTime(), NOW + 30 * DAY);
    const max = R.planFromSubscription({ ...web, id: "max" }, sub, { productId: "classgrid_pro", purchaseToken: "tok", now: NOW });
    assert.equal(max.expires_at.getTime(), NOW + 30 * DAY);
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
    // on hold: only the state is noted
    const hold = R.playRenewalUpdate(plan, subPurchase({ subscriptionState: "SUBSCRIPTION_STATE_ON_HOLD" }, { expiryTime: iso(NOW - DAY) }), NOW);
    assert.deepEqual(hold.set, { play_state: "SUBSCRIPTION_STATE_ON_HOLD" });
});

test("a credit pack purchase: purchased, for this account and product, not used yet", () => {
    const p = { purchaseState: 0, consumptionState: 0, orderId: "GPA.9999", obfuscatedExternalAccountId: USER, productId: "credits_1000" };
    assert.deepEqual(R.readProductPurchase(p, { productId: "credits_1000", userId: USER }), { ok: true, amountInr: 1000, orderId: "GPA.9999" });
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
    const up = subPurchase({ linkedPurchaseToken: "old-token" }, { productId: "classgrid_max", offerDetails: { basePlanId: "max-yearly" }, expiryTime: iso(NOW + 365 * DAY) });
    const r = R.readSubscription(up, { productId: "classgrid_max", userId: USER, now: NOW });
    assert.equal(r.ok, true);
    assert.deepEqual([r.key, r.term, r.productId, r.basePlanId, r.linkedPurchaseToken], ["max", "year", "classgrid_max", "max-yearly", "old-token"]);
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
    assert.deepEqual(R.planSourceAndTerm({ billing: "play", play_product_id: "classgrid_max", play_base_plan_id: "max-yearly" }, "max"),
        { source: "google_play", term: "year", product_id: "classgrid_max", base_plan_id: "max-yearly" });
    assert.deepEqual(R.planSourceAndTerm({ billing: "manual_monthly" }, "pro"), { source: "website", term: "month", product_id: null, base_plan_id: null });
    assert.deepEqual(R.planSourceAndTerm({ billing: "prepaid_yearly" }, "pro"), { source: "website", term: "year", product_id: null, base_plan_id: null });
    assert.deepEqual(R.planSourceAndTerm({ billing: "granted" }, "max"), { source: "granted", term: null, product_id: null, base_plan_id: null });
    // Free, or a plan that has ended, says nothing
    assert.deepEqual(R.planSourceAndTerm({ billing: "manual_monthly" }, "free"), { source: null, term: null, product_id: null, base_plan_id: null });
    assert.deepEqual(R.planSourceAndTerm({ billing: "none" }, "free"), { source: null, term: null, product_id: null, base_plan_id: null });
    assert.deepEqual(R.planSourceAndTerm(null, "pro"), { source: null, term: null, product_id: null, base_plan_id: null });
});
