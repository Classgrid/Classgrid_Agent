// Google Play purchases from the Android app (com.classgrid.mobile): the fixed rules, with no database or network,
// so they can be tested alone (tests/google-play.test.mjs). The Google calls and the granting live in
// services/google-play.service.js.
//
// The products made in the Play Console (the phone app uses exactly these names):
//   subscriptions: classgrid_pro (base plans pro-monthly, pro-annual) and classgrid_max (max-monthly, max-annual);
//     student prices are developer-determined offers on those base plans: student-monthly and student-yearly
//     (The yearly base plans are "-annual": the first "pro-yearly" was made in the Play Console with a monthly billing
//     period by mistake on 2026-11-25, and Google lets neither the period of an active base plan be changed nor an id
//     be used again. pro-yearly was turned off there and is not sold.)
//   one-time credit packs (consumable): credits_500, credits_1000, credits_2000, credits_5000 (the rupee amount)
// The phone puts the user's Mongo id in obfuscatedAccountId on every purchase; a purchase is only given to that user.
import crypto from "crypto";

export const PLAY_PACKAGE_NAME = "com.classgrid.mobile";

// The credit packs sold on the website and in the phone app (owner, 2026-11-22: fixed packs, no free amount)
export const CREDIT_PACKS_INR = Object.freeze([500, 1000, 2000, 5000]);

const SUBSCRIPTION_PLANS = Object.freeze({ classgrid_pro: "pro", classgrid_max: "max" });
const BASE_PLANS = Object.freeze({
    "pro-monthly": { key: "pro", term: "month" },
    "pro-annual": { key: "pro", term: "year" },
    "max-monthly": { key: "max", term: "month" },
    "max-annual": { key: "max", term: "year" },
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

/// ── Subscriptions (purchases.subscriptionsv2.get) ──

export const SUB_ACTIVE = "SUBSCRIPTION_STATE_ACTIVE";
export const SUB_GRACE = "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
export const SUB_CANCELED = "SUBSCRIPTION_STATE_CANCELED"; // auto-renew turned off; paid until the expiry time
export const SUB_EXPIRED = "SUBSCRIPTION_STATE_EXPIRED";
export const ACK_PENDING = "ACKNOWLEDGEMENT_STATE_PENDING";

/**
 * The states in which the subscription is paid for: active, in its grace period, or cancelled (auto-renew turned off)
 * while its line item's expiry is still ahead. The expiry itself is checked on the line item (activeSubscriptionItem).
 */
export const subscriptionGrantable = (state) => state === SUB_ACTIVE || state === SUB_GRACE || state === SUB_CANCELED;

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

/** The line item paid for now, only while the subscription's state is a paid one */
export const entitledItem = (purchase, productId = null, now = Date.now()) =>
    (subscriptionGrantable(purchase?.subscriptionState) ? activeSubscriptionItem(purchase, productId, now) : null);

/** The purchase is about this product: one of its line items is it, or will be replaced by it (a deferred change) */
export const purchaseNamesProduct = (purchase, productId) => (Array.isArray(purchase?.lineItems) ? purchase.lineItems : [])
    .some((li) => li?.productId === productId || li?.deferredItemReplacement?.productId === productId);

/** A Google Money value ({ currencyCode, units, nanos }) as { currency, amount }, or null when it has no amount */
export function moneyValue(money) {
    if (!money || !money.currencyCode) return null;
    const v = Number(money.units || 0) + Number(money.nanos || 0) / 1e9;
    return Number.isFinite(v) && v >= 0 ? { currency: String(money.currencyCode), amount: Math.round(v * 100) / 100 } : null;
}

/** A Google Money value in rupees, or 0 when it is not in rupees */
export function moneyInr(money) {
    const m = moneyValue(money);
    return m && m.currency === "INR" ? m.amount : 0;
}

/**
 * What a payment is booked at: what Google charged for the order (orders.get: the total, tax included) when it could
 * be read, else `fallback` (a renewal's recurring price; a pack's own size when bought in India). Rows keep the
 * rupee amount in amount_inr (0 when the money was not rupees) and the real currency and amount beside it.
 */
export function chargedAmount(order, fallback = null) {
    const total = moneyValue(order?.total);
    const charged = total || (fallback && fallback.currency ? { currency: fallback.currency, amount: Number(fallback.amount) || 0 } : null);
    if (!charged) return { currency: "", amount: 0, inr: 0, known: false };
    return { ...charged, inr: charged.currency === "INR" ? charged.amount : 0, known: true };
}

// Student offers on the same base plans (Play Console: developer-determined offers on classgrid_pro and classgrid_max)
export const STUDENT_OFFER_IDS = Object.freeze(["student-monthly", "student-yearly"]);
export const isStudentOffer = (li) => STUDENT_OFFER_IDS.includes(String(li?.offerDetails?.offerId || ""));

/** An approved student whose approval has not run out (the same check the website's student purchase uses) */
export function studentVerified(sv, now = Date.now()) {
    return !!sv?.verified_at && !(sv.expires_at && ms(sv.expires_at) < ms(now));
}

/**
 * What a new subscription purchase gives, or why it gives nothing.
 * { ok: true, key, term, productId, basePlanId, offerId, studentOffer, linkedPurchaseToken, expiresAt, state,
 *   autoRenew, orderId, recurringPrice, needsAck } or { ok: false, status, error, code? }
 */
export function readSubscription(purchase, { productId, userId, now = Date.now() }) {
    if (!accountMatches(purchase?.externalAccountIdentifiers?.obfuscatedExternalAccountId, userId)) {
        return { ok: false, status: 403, error: "This purchase was made from another Classgrid account.", code: "other_account" };
    }
    if (!planKeyForProduct(productId)) return { ok: false, status: 400, error: "This subscription plan is not sold by Classgrid." };
    const state = purchase?.subscriptionState || "";
    if (!subscriptionGrantable(state)) return { ok: false, status: 400, error: "This subscription is not active." };
    if (!purchaseNamesProduct(purchase, productId)) return { ok: false, status: 400, error: "This purchase is not for that product." };
    // What is paid for now (after a deferred downgrade: still the higher plan, until Google renews it as the lower one;
    // a cancelled subscription: until its expiry)
    const li = activeSubscriptionItem(purchase, productId, now);
    if (!li) {
        const named = subscriptionLineItem(purchase, productId);
        if (named && !planForSubscription(named.productId, named.offerDetails?.basePlanId)) return { ok: false, status: 400, error: "This subscription plan is not sold by Classgrid." };
        return { ok: false, status: 400, error: "This subscription is not active." };
    }
    const plan = planForSubscription(li.productId, li.offerDetails?.basePlanId);
    return {
        ok: true,
        key: plan.key,
        term: plan.term,
        productId: li.productId,
        basePlanId: li.offerDetails?.basePlanId || "",
        offerId: li.offerDetails?.offerId || "",
        studentOffer: isStudentOffer(li),
        // (a plan change or a re-signup: the token it replaces, which is no longer anyone's subscription)
        linkedPurchaseToken: purchase.linkedPurchaseToken || "",
        expiresAt: new Date(ms(li.expiryTime)),
        state,
        autoRenew: state !== SUB_CANCELED && li.autoRenewingPlan?.autoRenewEnabled !== false,
        orderId: li.latestSuccessfulOrderId || purchase.latestOrderId || "",
        recurringPrice: moneyValue(li.autoRenewingPlan?.recurringPrice),
        needsAck: purchase.acknowledgementState === ACK_PENDING,
    };
}

// The plans in order: a higher tier gives more
const PLAN_TIER = Object.freeze({ free: 0, pro: 1, max: 2, enterprise: 3 });
export const planTier = (key) => PLAN_TIER[key] ?? 0;

/** The user's plan is a paid one that is on now (not ended, not cancelled; a plan with no end date runs until removed) */
export function paidPlanOn(plan, now = Date.now()) {
    if (!plan || planTier(plan.id) === 0) return false;
    if (plan.status && !["active", "past_due"].includes(plan.status)) return false;
    return !plan.expires_at || ms(plan.expires_at) > ms(now);
}

/**
 * Whether a Google Play subscription may replace the plan the user has now:
 *   { block: true }   the user already has a plan from somewhere else (the website, a gift, a seat, or another Google
 *                     Play subscription that this one does not replace) of the same or a higher tier, still running:
 *                     the purchase is refused (code has_other_plan) and not acknowledged, so Google refunds it
 *   { block: false, replaces }   nothing paid is running, it is this same subscription or the one it replaces, or a
 *                     lower tier that this purchase upgrades (replaces = that plan's billing, e.g. "manual_monthly")
 */
export function otherPlanDecision(current, { key, purchaseToken, linkedPurchaseToken = "", now = Date.now() }) {
    if (!paidPlanOn(current, now)) return { block: false, replaces: null };
    if (current.billing === "play" && current.play_purchase_token && (current.play_purchase_token === purchaseToken || current.play_purchase_token === linkedPurchaseToken)) {
        return { block: false, replaces: null };
    }
    if (planTier(current.id) >= planTier(key)) return { block: true, replaces: null };
    return { block: false, replaces: current.billing || "none" };
}

/** The plan a Google Play subscription becomes on the user: the plan paid for now, until Google's expiry */
export function planFromSubscription(current, sub, { productId, purchaseToken, basePlanId, now = Date.now() }) {
    const cur = current || {};
    // (the same plan from Google Play running on, e.g. a re-signup or a term change: its start date stays)
    const samePlayPlan = cur.billing === "play" && cur.id === sub.key && paidPlanOn(cur, now);
    return {
        id: sub.key,
        status: "active",
        billing: "play",
        started_at: samePlayPlan && cur.started_at ? cur.started_at : new Date(ms(now)),
        expires_at: sub.expiresAt,
        cancel_at_period_end: sub.state === SUB_CANCELED || sub.autoRenew === false,
        last_payment_id: sub.orderId || "",
        source: "google_play",
        set_by: "",
        note: sub.studentOffer ? "student price" : "",
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
 * (Google's real-time notifications check it at once whatever its end date: google-play.service.js.)
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
 * What Google's answer for the plan's own token changes on the plan (the fields of user.plan to set). The plan
 * follows Google: its end date is Google's expiry, its plan is the line item paid for now.
 *   extended   the plan runs longer than before (a renewal, or a grace period)
 *   newOrder   a Google order the plan has not booked yet (a renewal): its Invoices row is written, whatever the end
 *              date did
 */
export function playRenewalUpdate(plan, purchase, now = Date.now()) {
    if (!plan || !purchase) return null;
    const state = purchase.subscriptionState || "";
    const end = ms(plan.expires_at);
    const t = ms(now);
    const set = { play_state: state };
    const li = entitledItem(purchase, plan.play_product_id || null, t);
    if (li) {
        const expiry = ms(li.expiryTime);
        const mapped = planForSubscription(li.productId, li.offerDetails?.basePlanId);
        set.cancel_at_period_end = state === SUB_CANCELED || li.autoRenewingPlan?.autoRenewEnabled === false;
        if (mapped.key !== plan.id || li.productId !== plan.play_product_id || li.offerDetails.basePlanId !== plan.play_base_plan_id) {
            set.id = mapped.key; set.play_product_id = li.productId; set.play_base_plan_id = li.offerDetails.basePlanId;
        }
        if (!Number.isFinite(end) || expiry !== end) set.expires_at = new Date(expiry);
        set.status = "active";
        const orderId = li.latestSuccessfulOrderId || purchase.latestOrderId || "";
        const newOrder = orderId && orderId !== plan.last_payment_id ? orderId : null;
        if (newOrder) set.last_payment_id = newOrder;
        return {
            set, extended: !Number.isFinite(end) || expiry > end, newOrder, orderId,
            key: mapped.key, term: mapped.term, recurringPrice: moneyValue(li.autoRenewingPlan?.recurringPrice),
        };
    }
    // Not paid now (expired, revoked, refunded, on hold, paused): the plan ends at Google's end, or now, if that is
    // earlier than ours
    const last = subscriptionLineItem(purchase, plan.play_product_id || null) || subscriptionLineItem(purchase);
    const expiry = ms(last?.expiryTime);
    const endAt = Number.isFinite(expiry) ? Math.min(expiry, t) : t;
    if (!Number.isFinite(end) || endAt < end) set.expires_at = new Date(endAt);
    return { set, extended: false, newOrder: null };
}

/**
 * A voided (refunded, charged back, revoked) subscription order: whether the user's Play plan ends. It ends when the
 * plan is this token's and the voided order is the one paying for now, or Google no longer says it is paid; a refund
 * of an older period leaves the period paid now alone.
 */
export function voidEndsPlan(plan, { purchaseToken, orderId }, purchase, now = Date.now()) {
    if (!plan || plan.billing !== "play" || plan.play_purchase_token !== purchaseToken) return false;
    const li = entitledItem(purchase, plan.play_product_id || null, now);
    if (!li) return true;
    const current = li.latestSuccessfulOrderId || purchase?.latestOrderId || "";
    return !orderId || orderId === current || orderId === plan.last_payment_id;
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

/**
 * What a credit pack purchase gives, or why it gives nothing:
 * { ok: true, amountInr (the pack's size: what the credits are counted from), orderId, regionCode, paidAt }
 * or { ok: false, status, error }. A pack bought outside India still gives its pack size in credits; what was
 * really charged (in that country's money) is booked from the order (chargedAmount).
 */
export function readProductPurchase(purchase, { productId, userId }) {
    const amountInr = packAmountInr(productId);
    if (!amountInr) return { ok: false, status: 400, error: "This product is not sold by Classgrid." };
    if (!accountMatches(purchase?.obfuscatedExternalAccountId, userId)) {
        return { ok: false, status: 403, error: "This purchase was made from another Classgrid account.", code: "other_account" };
    }
    if (purchase?.productId && purchase.productId !== productId) return { ok: false, status: 400, error: "This purchase is not for that product." };
    if (purchase?.purchaseState === 2) return { ok: false, status: 400, error: "This payment is not complete yet." };
    if (purchase?.purchaseState !== 0) return { ok: false, status: 400, error: "This purchase was cancelled." };
    if (purchase?.consumptionState === 1) return { ok: false, status: 400, error: "This purchase has already been used." };
    const paid = Number(purchase.purchaseTimeMillis);
    return {
        ok: true, amountInr, orderId: purchase.orderId || "", regionCode: String(purchase.regionCode || "").toUpperCase(),
        paidAt: paid > 0 ? new Date(paid) : null,
    };
}

/** What a pack is booked at when Google's order could not be read: its own size in rupees when bought in India */
export const packFallbackPrice = (pack) => (pack.regionCode === "IN" || !pack.regionCode ? { currency: "INR", amount: pack.amountInr } : null);

/**
 * The short, fixed mark of a purchase token kept on the user when its credits are added (User.play_credited). The
 * credits and the mark are written in one database step, so a pack's credits can never be added twice, and whether
 * they were added can always be read back (google-play.service.js grantCreditPack).
 */
export const creditMark = (purchaseToken) => crypto.createHash("sha256").update(String(purchaseToken)).digest("hex").slice(0, 32);

// ── Real-time developer notifications (Pub/Sub push to POST /api/billing/google-play/rtdn) ──

// Google's notification types (developer.android.com/google/play/billing/rtdn-reference)
export const SUBSCRIPTION_NOTIFICATIONS = Object.freeze({
    1: "SUBSCRIPTION_RECOVERED", 2: "SUBSCRIPTION_RENEWED", 3: "SUBSCRIPTION_CANCELED", 4: "SUBSCRIPTION_PURCHASED",
    5: "SUBSCRIPTION_ON_HOLD", 6: "SUBSCRIPTION_IN_GRACE_PERIOD", 7: "SUBSCRIPTION_RESTARTED",
    8: "SUBSCRIPTION_PRICE_CHANGE_CONFIRMED", 9: "SUBSCRIPTION_DEFERRED", 10: "SUBSCRIPTION_PAUSED",
    11: "SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED", 12: "SUBSCRIPTION_REVOKED", 13: "SUBSCRIPTION_EXPIRED",
    17: "SUBSCRIPTION_ITEMS_CHANGED", 18: "SUBSCRIPTION_CANCELLATION_SCHEDULED", 19: "SUBSCRIPTION_PRICE_CHANGE_UPDATED",
    20: "SUBSCRIPTION_PENDING_PURCHASE_CANCELED", 22: "SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED",
});
export const ONE_TIME_NOTIFICATIONS = Object.freeze({ 1: "ONE_TIME_PRODUCT_PURCHASED", 2: "ONE_TIME_PRODUCT_CANCELED" });

/**
 * A Pub/Sub push body ({ message: { data: base64 JSON, messageId }, subscription }) read as one notification:
 * { ok: true, kind: "subscription" | "product" | "voided" | "test" | "other", type, token, orderId, productId,
 *   messageId } or { ok: false, error } when it is not a notification for this app.
 */
export function parseRtdnPush(body) {
    const message = body?.message;
    if (!message || typeof message.data !== "string") return { ok: false, error: "not a Pub/Sub push message" };
    let data;
    try { data = JSON.parse(Buffer.from(message.data, "base64").toString("utf8")); } catch { return { ok: false, error: "the message data is not JSON" }; }
    if (!data || data.packageName !== PLAY_PACKAGE_NAME) return { ok: false, error: "not for this app" };
    const base = { ok: true, messageId: String(message.messageId || message.message_id || ""), token: "", orderId: "", productId: "", type: "" };
    if (data.subscriptionNotification) {
        const n = data.subscriptionNotification;
        return { ...base, kind: "subscription", type: SUBSCRIPTION_NOTIFICATIONS[n.notificationType] || `SUBSCRIPTION_${n.notificationType}`, token: String(n.purchaseToken || "") };
    }
    if (data.oneTimeProductNotification) {
        const n = data.oneTimeProductNotification;
        return { ...base, kind: "product", type: ONE_TIME_NOTIFICATIONS[n.notificationType] || `ONE_TIME_${n.notificationType}`, token: String(n.purchaseToken || ""), productId: String(n.sku || "") };
    }
    if (data.voidedPurchaseNotification) {
        const n = data.voidedPurchaseNotification;
        // productType 1 = subscription, 2 = one-time product
        return { ...base, kind: "voided", type: n.productType === 1 ? "VOIDED_SUBSCRIPTION" : "VOIDED_PRODUCT", token: String(n.purchaseToken || ""), orderId: String(n.orderId || "") };
    }
    if (data.testNotification) return { ...base, kind: "test", type: "TEST" };
    return { ...base, kind: "other", type: "OTHER" };
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
