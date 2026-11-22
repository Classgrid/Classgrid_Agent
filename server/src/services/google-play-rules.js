// Google Play purchases from the Android app (com.classgrid.mobile): the fixed rules, with no database or network,
// so they can be tested alone (tests/google-play.test.mjs). The Google calls and the granting live in
// services/google-play.service.js.
//
// The products made in the Play Console (the phone app uses exactly these names):
//   subscriptions: classgrid_pro (base plans pro-monthly, pro-yearly) and classgrid_max (max-monthly, max-yearly)
//   one-time credit packs (consumable): credits_500, credits_1000, credits_2000, credits_5000 (the rupee amount)
// The phone puts the user's Mongo id in obfuscatedAccountId on every purchase; a purchase is only given to that user.

export const PLAY_PACKAGE_NAME = "com.classgrid.mobile";

// The credit packs sold on the website and in the phone app (owner, 2026-11-22: fixed packs, no free amount)
export const CREDIT_PACKS_INR = Object.freeze([500, 1000, 2000, 5000]);

const SUBSCRIPTION_PLANS = Object.freeze({ classgrid_pro: "pro", classgrid_max: "max" });
const BASE_PLANS = Object.freeze({
    "pro-monthly": { key: "pro", term: "month" },
    "pro-yearly": { key: "pro", term: "year" },
    "max-monthly": { key: "max", term: "month" },
    "max-yearly": { key: "max", term: "year" },
});

/** The plan key of a subscription product ("classgrid_pro" -> "pro"), or null for any other id */
export function planKeyForProduct(productId) {
    return Object.prototype.hasOwnProperty.call(SUBSCRIPTION_PLANS, productId) ? SUBSCRIPTION_PLANS[productId] : null;
}

/** { key, term } for a subscription product and its base plan, or null when they are unknown or do not belong together */
export function planForSubscription(productId, basePlanId) {
    const key = planKeyForProduct(productId);
    if (!key || !Object.prototype.hasOwnProperty.call(BASE_PLANS, basePlanId)) return null;
    const base = BASE_PLANS[basePlanId];
    return base.key === key ? { key: base.key, term: base.term } : null;
}

/** The rupee amount of a credit pack ("credits_1000" -> 1000), or null for any id that is not one of the packs */
export function packAmountInr(productId) {
    const m = /^credits_(\d+)$/.exec(String(productId || ""));
    if (!m) return null;
    const amount = Number(m[1]);
    return CREDIT_PACKS_INR.includes(amount) && `credits_${amount}` === productId ? amount : null;
}

export const isCreditPack = (amount) => CREDIT_PACKS_INR.includes(Number(amount));

/** Whether a website top-up amount is allowed: one of the packs, or any whole amount from 1 to `anyMax` for the
 *  accounts on the low-minimum list (the owner's own test payments) */
export function topupAmountAllowed(amount, { anyAmount = false, anyMax = 10000 } = {}) {
    if (typeof amount !== "number" && typeof amount !== "string") return false;
    if (typeof amount === "string" && amount.trim() === "") return false;
    const n = Number(amount);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return false;
    if (anyAmount) return n >= 1 && n <= anyMax;
    return isCreditPack(n);
}

/** The pack a link like ?topup=300 opens: that pack, or the nearest pack above it (at most the largest) */
export function packAtOrAbove(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return CREDIT_PACKS_INR[0];
    return CREDIT_PACKS_INR.find((p) => p >= n) ?? CREDIT_PACKS_INR[CREDIT_PACKS_INR.length - 1];
}

/** The purchase was made for this user: Google's obfuscated account id equals the user's id (never empty) */
export function accountMatches(obfuscatedAccountId, userId) {
    const a = String(obfuscatedAccountId ?? "").trim();
    const b = String(userId ?? "").trim();
    return a !== "" && b !== "" && a === b;
}

/**
 * The service account key from GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: the whole JSON, as it is or in base64.
 * null when it is missing or is not a service account key.
 */
export function parseServiceAccount(raw) {
    const text = String(raw ?? "").trim();
    if (!text) return null;
    const tryJson = (s) => { try { return JSON.parse(s); } catch { return null; } };
    let key = text.startsWith("{") ? tryJson(text) : null;
    if (!key) {
        const decoded = (() => { try { return Buffer.from(text, "base64").toString("utf8").trim(); } catch { return ""; } })();
        if (decoded.startsWith("{")) key = tryJson(decoded);
    }
    if (!key || typeof key !== "object" || !key.client_email || !key.private_key) return null;
    // (a key pasted into a one-line setting often carries its line breaks as the two characters \n)
    if (typeof key.private_key === "string" && key.private_key.includes("\\n")) key = { ...key, private_key: key.private_key.replace(/\\n/g, "\n") };
    return key;
}

// ── Subscriptions (purchases.subscriptionsv2.get) ──

export const SUB_ACTIVE = "SUBSCRIPTION_STATE_ACTIVE";
export const SUB_GRACE = "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
export const SUB_CANCELED = "SUBSCRIPTION_STATE_CANCELED"; // auto-renew turned off; paid until the expiry time
export const SUB_EXPIRED = "SUBSCRIPTION_STATE_EXPIRED";
export const ACK_PENDING = "ACKNOWLEDGEMENT_STATE_PENDING";

/** A new subscription gives the plan only while Google says it is active or in its grace period */
export const subscriptionGrantable = (state) => state === SUB_ACTIVE || state === SUB_GRACE;

/** The line item of a subscription purchase for a product (the first one when no product is named) */
export function subscriptionLineItem(purchase, productId = null) {
    const items = Array.isArray(purchase?.lineItems) ? purchase.lineItems : [];
    if (productId) return items.find((li) => li?.productId === productId) || null;
    return items.find((li) => planKeyForProduct(li?.productId)) || null;
}

const ms = (v) => {
    if (v === null || v === undefined || v === "") return NaN;
    const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
    return Number.isFinite(t) ? t : NaN;
};

/**
 * The line item that is paid for right now: one of our plans, not expired. The named product's item when it is one
 * of them, else the one running longest. A plan change bought with the DEFERRED replacement mode (a downgrade) keeps
 * the old product's item, with deferredItemReplacement naming the new product, until it renews; so the plan given is
 * always what Google says is active now, never the product asked for.
 */
export function activeSubscriptionItem(purchase, productId = null, now = Date.now()) {
    const items = (Array.isArray(purchase?.lineItems) ? purchase.lineItems : [])
        .filter((li) => planForSubscription(li?.productId, li?.offerDetails?.basePlanId) && ms(li?.expiryTime) > ms(now));
    if (!items.length) return null;
    return (productId && items.find((li) => li.productId === productId))
        || items.reduce((a, b) => (ms(b.expiryTime) > ms(a.expiryTime) ? b : a));
}

/** The purchase is about this product: one of its line items is it, or will be replaced by it (a deferred change) */
export const purchaseNamesProduct = (purchase, productId) => (Array.isArray(purchase?.lineItems) ? purchase.lineItems : [])
    .some((li) => li?.productId === productId || li?.deferredItemReplacement?.productId === productId);

/** A Google Money value ({ currencyCode, units, nanos }) in rupees, or 0 when it is not in rupees */
export function moneyInr(money) {
    if (!money || money.currencyCode !== "INR") return 0;
    const v = Number(money.units || 0) + Number(money.nanos || 0) / 1e9;
    return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0;
}

/**
 * What a new subscription purchase gives, or why it gives nothing.
 * { ok: true, key, term, expiresAt (Date), state, autoRenew, orderId, priceInr, needsAck } or { ok: false, status, error }
 */
export function readSubscription(purchase, { productId, userId, now = Date.now() }) {
    if (!accountMatches(purchase?.externalAccountIdentifiers?.obfuscatedExternalAccountId, userId)) {
        return { ok: false, status: 403, error: "This purchase was made from another Classgrid account." };
    }
    if (!planKeyForProduct(productId)) return { ok: false, status: 400, error: "This subscription plan is not sold by Classgrid." };
    const state = purchase?.subscriptionState || "";
    if (!subscriptionGrantable(state)) return { ok: false, status: 400, error: "This subscription is not active." };
    if (!purchaseNamesProduct(purchase, productId)) return { ok: false, status: 400, error: "This purchase is not for that product." };
    // What is paid for now (after a deferred downgrade: still the higher plan, until Google renews it as the lower one)
    const li = activeSubscriptionItem(purchase, productId, now);
    if (!li) {
        const named = subscriptionLineItem(purchase, productId);
        if (named && !planForSubscription(named.productId, named.offerDetails?.basePlanId)) return { ok: false, status: 400, error: "This subscription plan is not sold by Classgrid." };
        return { ok: false, status: 400, error: "This subscription is not active." };
    }
    const plan = planForSubscription(li.productId, li.offerDetails?.basePlanId);
    const expiry = ms(li.expiryTime);
    return {
        ok: true,
        key: plan.key,
        term: plan.term,
        productId: li.productId,
        basePlanId: li.offerDetails?.basePlanId || "",
        // (a plan change or a re-signup: the token it replaces, which is no longer this user's subscription)
        linkedPurchaseToken: purchase.linkedPurchaseToken || "",
        expiresAt: new Date(expiry),
        state,
        autoRenew: li.autoRenewingPlan?.autoRenewEnabled !== false,
        orderId: li.latestSuccessfulOrderId || purchase.latestOrderId || "",
        priceInr: moneyInr(li.autoRenewingPlan?.recurringPrice),
        needsAck: purchase.acknowledgementState === ACK_PENDING,
    };
}

/**
 * The plan a Google Play subscription becomes on the user, given what the user has now: the plan bought, with
 * Google's expiry. When the user already pays for the same plan (not a gift) for longer, those days are kept.
 */
export function planFromSubscription(current, sub, { productId, purchaseToken, basePlanId, now = Date.now() }) {
    const cur = current || {};
    const sameActive = cur.id === sub.key && (cur.status || "active") === "active" && cur.billing !== "granted"
        && Number.isFinite(ms(cur.expires_at)) && ms(cur.expires_at) > ms(now);
    const expires = sameActive && ms(cur.expires_at) > sub.expiresAt.getTime() ? new Date(ms(cur.expires_at)) : sub.expiresAt;
    return {
        id: sub.key,
        status: "active",
        billing: "play",
        started_at: sameActive && cur.started_at ? cur.started_at : new Date(ms(now)),
        expires_at: expires,
        cancel_at_period_end: sub.state === SUB_CANCELED || sub.autoRenew === false,
        last_payment_id: sub.orderId || "",
        source: "google_play",
        set_by: "",
        note: "",
        play_purchase_token: purchaseToken,
        // (the product paid for now, which after a deferred downgrade is the old one until it renews)
        play_product_id: sub.productId || productId,
        play_base_plan_id: sub.basePlanId || basePlanId || "",
        play_state: sub.state,
    };
}

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
// Past this, a lapsed subscription is not looked at again (Google keeps an account on hold or paused for less)
const STOP_CHECKING_AFTER = 100 * DAY;

/**
 * Whether a Google Play plan should be checked with Google now: it came from Google Play, its end has passed or is
 * within the next hour, Google has not said it is over for good, and it ended less than 100 days ago.
 */
export function playRefreshDue(plan, now = Date.now()) {
    if (!plan || plan.billing !== "play" || !plan.play_purchase_token) return false;
    if (plan.play_state === SUB_EXPIRED) return false;
    const end = ms(plan.expires_at);
    if (!Number.isFinite(end)) return false;
    const t = ms(now);
    return end - t <= HOUR && t - end < STOP_CHECKING_AFTER;
}

/**
 * What a renewal check changes on the plan (the fields of user.plan to set), from Google's answer for the plan's own
 * token. null when nothing changes. `extended` = the plan runs longer than before (a renewal, or a grace period).
 */
export function playRenewalUpdate(plan, purchase, now = Date.now()) {
    if (!plan || !purchase) return null;
    const state = purchase.subscriptionState || "";
    const end = ms(plan.expires_at);
    const t = ms(now);
    const set = { play_state: state };
    // What is paid for now: after a deferred downgrade renews, this is the new (lower) plan's line item
    const li = state === SUB_ACTIVE || state === SUB_GRACE || state === SUB_CANCELED ? activeSubscriptionItem(purchase, plan.play_product_id || null, t) : null;
    if (li) {
        const expiry = ms(li.expiryTime);
        const mapped = planForSubscription(li.productId, li.offerDetails?.basePlanId);
        set.cancel_at_period_end = state === SUB_CANCELED || li.autoRenewingPlan?.autoRenewEnabled === false;
        if (mapped.key !== plan.id || li.productId !== plan.play_product_id || li.offerDetails.basePlanId !== plan.play_base_plan_id) {
            set.id = mapped.key; set.play_product_id = li.productId; set.play_base_plan_id = li.offerDetails.basePlanId;
        }
        if (!Number.isFinite(end) || expiry > end) {
            set.expires_at = new Date(expiry);
            set.status = "active";
            const orderId = li.latestSuccessfulOrderId || purchase.latestOrderId || "";
            if (orderId) set.last_payment_id = orderId;
            return { set, extended: true, term: mapped.term, key: mapped.key, orderId, priceInr: moneyInr(li.autoRenewingPlan?.recurringPrice) };
        }
        return { set, extended: false };
    }
    // Over (expired, refunded, on hold, paused): the plan ends at Google's end if that is earlier than ours
    const last = subscriptionLineItem(purchase, plan.play_product_id || null) || subscriptionLineItem(purchase);
    const expiry = ms(last?.expiryTime);
    if (state === SUB_EXPIRED && Number.isFinite(expiry) && Number.isFinite(end) && expiry < end) set.expires_at = new Date(expiry);
    return { set, extended: false };
}

/**
 * Where the user's current plan came from and its term, as the plan overview reports them for the apps:
 * source "google_play" | "website" | "granted" | null and term "month" | "year" | null (null on Free or an ended
 * plan), plus the Google Play product and base plan.
 */
export function planSourceAndTerm(plan, effectiveKey) {
    const none = { source: null, term: null, product_id: null, base_plan_id: null };
    if (!plan || !effectiveKey || effectiveKey === "free") return none;
    switch (plan.billing) {
        case "play": {
            const mapped = planForSubscription(plan.play_product_id, plan.play_base_plan_id);
            return { source: "google_play", term: mapped?.term || null, product_id: plan.play_product_id || null, base_plan_id: plan.play_base_plan_id || null };
        }
        case "granted": return { ...none, source: "granted" };
        case "prepaid_yearly": return { ...none, source: "website", term: "year" };
        case "manual_monthly": return { ...none, source: "website", term: "month" };
        case "upi_autopay": return { ...none, source: "website" };
        default: return none;
    }
}

// ── One-time products (purchases.products.get) ──

/** What a credit pack purchase gives, or why it gives nothing: { ok: true, amountInr, orderId } or { ok: false, status, error } */
export function readProductPurchase(purchase, { productId, userId }) {
    const amountInr = packAmountInr(productId);
    if (!amountInr) return { ok: false, status: 400, error: "This product is not sold by Classgrid." };
    if (!accountMatches(purchase?.obfuscatedExternalAccountId, userId)) {
        return { ok: false, status: 403, error: "This purchase was made from another Classgrid account." };
    }
    if (purchase?.productId && purchase.productId !== productId) return { ok: false, status: 400, error: "This purchase is not for that product." };
    if (purchase?.purchaseState === 2) return { ok: false, status: 400, error: "This payment is not complete yet." };
    if (purchase?.purchaseState !== 0) return { ok: false, status: 400, error: "This purchase was cancelled." };
    if (purchase?.consumptionState === 1) return { ok: false, status: 400, error: "This purchase has already been used." };
    return { ok: true, amountInr, orderId: purchase.orderId || "" };
}

// ── Idempotency ──

// A claim older than this is taken as left behind by a request that stopped half-way, and may be finished again
export const CLAIM_STALE_MS = 2 * 60 * 1000;

/**
 * What to do with a purchase token given its saved row (GooglePlayPurchase), before asking Google:
 *   "new"           no row: check with Google and grant
 *   "other_account" the token was given to another user: refuse
 *   "wrong_product" the token was given for another product: refuse
 *   "granted"       already given: answer with what was given (finishing any acknowledge/consume left undone)
 *   "in_progress"   another request is granting it right now: wait for it
 *   "stale"         a request stopped half-way: check with Google and finish
 */
export function purchaseDecision(row, { userId, productId, now = Date.now() }) {
    if (!row) return "new";
    if (String(row.userId) !== String(userId)) return "other_account";
    if (productId && row.productId && row.productId !== productId) return "wrong_product";
    if (row.status === "granted") return "granted";
    const at = ms(row.updatedAt || row.createdAt);
    return Number.isFinite(at) && ms(now) - at < CLAIM_STALE_MS ? "in_progress" : "stale";
}
