// Google Play purchases from the Android app (owner, 2026-11-22: the app goes on Google Play, and Google requires
// plans and credits bought inside the app to go through Google Play Billing).
//
// The phone buys through Google, then sends the purchase token to POST /api/billing/google-play/verify
// (controllers/google-play.controller.js). Here the token is checked with Google (Android Publisher API v3, with the
// service account key in GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) and the plan or the credits are given:
//   - a subscription (classgrid_pro, classgrid_max) puts the plan on the user like a plan bought on the website, with
//     billing "play", source "google_play", Google's expiry, and the purchase token kept so renewals can be checked;
//     it is acknowledged with Google (Google refunds a purchase not acknowledged within 3 days)
//   - a credit pack (credits_500 ... credits_5000) adds bought credits like a paid website top-up (the pack's rupees x
//     the live credits_per_inr, 30 days, a row on the Invoices tab), then is consumed so it can be bought again
// The fixed rules (product names, the account check, what a purchase gives) are in services/google-play-rules.js.
//
// Renewals are read from Google, without Google's push messages: when a Google Play plan's end has passed or is
// within the hour, the plan overview, the plan check before a request (plan-limits.service.js planOf, in the
// background) and the hourly plan-end worker ask Google again, at most once per 10 minutes per user.
import crypto from "crypto";
import User from "../models/User.js";
import GooglePlayPurchase from "../models/GooglePlayPurchase.js";
import AiCreditTransaction from "../models/AiCreditTransaction.js";
import redis from "../config/redis.js";
import {
    PLAY_PACKAGE_NAME, parseServiceAccount, readSubscription, planFromSubscription, readProductPurchase,
    purchaseDecision, playRefreshDue, playRenewalUpdate, planSourceAndTerm, ACK_PENDING,
} from "./google-play-rules.js";
import { planKeyOf } from "./plan-limits.service.js";

const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const DAY = 24 * 60 * 60 * 1000;

/** An answer the controller sends as it is: res.status(status).json(body) */
export class PlayError extends Error {
    constructor(status, error, code = undefined) {
        super(error);
        this.status = status;
        this.body = code ? { error, code } : { error };
    }
}

// ── The Google client ──

let clientPromise = null;
let clientFor = "";

/** The Android Publisher client, or null when GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing or not a service account key */
async function playClient() {
    const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "";
    const key = parseServiceAccount(raw);
    if (!key) return null;
    if (!clientPromise || clientFor !== raw) {
        clientFor = raw;
        clientPromise = (async () => {
            const { google } = await import("googleapis");
            const auth = new google.auth.GoogleAuth({ credentials: key, scopes: [SCOPE] });
            return google.androidpublisher({ version: "v3", auth });
        })();
        clientPromise.catch(() => { clientPromise = null; });
    }
    return clientPromise;
}

export const playConfigured = () => !!parseServiceAccount(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "");

async function requireClient() {
    const client = await playClient().catch((e) => { console.error("[Google Play] client failed:", e.message); return null; });
    if (!client) throw new PlayError(503, "Google Play purchases are not set up on the server yet.", "play_not_configured");
    return client;
}

const googleStatus = (err) => Number(err?.response?.status || err?.code) || 0;

// A Google call; its failure becomes a plain answer (an unknown token is the phone's mistake, anything else Google's)
async function askGoogle(what, fn) {
    try {
        return (await fn()).data;
    } catch (err) {
        const status = googleStatus(err);
        console.error(`[Google Play] ${what} failed (${status || "no status"}):`, err?.response?.data?.error?.message || err.message);
        if (status === 400 || status === 404 || status === 410) throw new PlayError(400, "Google Play could not find this purchase.", "purchase_not_found");
        throw new PlayError(502, "Google Play could not be reached. Please try again in a moment.", "google_unavailable");
    }
}

// ── Idempotency ──

let indexReady = null;
const ensureIndex = () => (indexReady ||= GooglePlayPurchase.init().catch((e) => { indexReady = null; throw e; }));

const grantedAnswer = (row) => ({ ok: true, ...(row.granted || {}) });

// The token's row, created atomically. { row, mine: true } = this request granted nothing yet and owns the claim;
// { row, mine: false } = another request made it first.
async function claim({ purchaseToken, userId, type, productId, orderId }) {
    await ensureIndex();
    try {
        const row = await GooglePlayPurchase.create({ purchaseToken, userId, type, productId, orderId, status: "granting" });
        return { row: row.toObject(), mine: true };
    } catch (err) {
        if (err?.code !== 11000) throw err;
        return { row: await GooglePlayPurchase.findOne({ purchaseToken }).lean(), mine: false };
    }
}

// Take over a claim left behind by a request that stopped half-way (only one request wins)
async function takeOver(row) {
    return GooglePlayPurchase.findOneAndUpdate(
        { _id: row._id, status: "granting", updatedAt: row.updatedAt },
        { $set: { updatedAt: new Date() } },
        { returnDocument: "after", timestamps: false },
    ).lean();
}

// Another request is granting this token: wait a few seconds for it to finish
async function waitForGrant(purchaseToken) {
    for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const row = await GooglePlayPurchase.findOne({ purchaseToken }).lean();
        if (!row) return null; // (it failed and let go of the token)
        if (row.status === "granted") return row;
    }
    throw new PlayError(409, "This purchase is still being processed. Try again in a moment.", "in_progress");
}

// ── Telling Google it is done ──

async function acknowledgeSubscription(client, row) {
    try {
        await client.purchases.subscriptions.acknowledge({ packageName: PLAY_PACKAGE_NAME, subscriptionId: row.productId, token: row.purchaseToken, requestBody: {} });
        await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { acknowledged: true } });
    } catch (err) {
        // (already acknowledged, e.g. by the phone, also lands here; checked again on the next verify)
        console.error("[Google Play] acknowledge failed:", err?.response?.data?.error?.message || err.message);
    }
}

async function consumeProduct(client, row) {
    try {
        await client.purchases.products.consume({ packageName: PLAY_PACKAGE_NAME, productId: row.productId, token: row.purchaseToken });
        await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { consumed: true } });
    } catch (err) {
        console.error("[Google Play] consume failed:", err?.response?.data?.error?.message || err.message);
    }
}

// A purchase already given: finish what Google was not told yet, then answer with what was given
async function answerGranted(client, row) {
    if (row.type === "subscription" && !row.acknowledged) {
        const sub = await askGoogle("subscription read", () => client.purchases.subscriptionsv2.get({ packageName: PLAY_PACKAGE_NAME, token: row.purchaseToken })).catch(() => null);
        if (sub?.acknowledgementState === ACK_PENDING) await acknowledgeSubscription(client, row);
        else if (sub) await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { acknowledged: true } }).catch(() => {});
    }
    if (row.type === "product" && !row.consumed) await consumeProduct(client, row);
    return grantedAnswer(row);
}

const userInfo = (user) => ({
    userName: user?.name || "Unknown",
    userEmail: user?.email || "",
    userMobile: user?.phoneNumber || "",
    userRole: user?.role || "",
    organizationName: user?.organization_id?.name || "",
});

// The id the Invoices row is kept under (unique across all payments): Google's order id, else the token's hash
const playPaymentId = (orderId, purchaseToken) => `gplay:${orderId || `token:${crypto.createHash("sha256").update(purchaseToken).digest("hex").slice(0, 40)}`}`;

// The user's plan now, in the answer's shape (for a replaced token sent again)
async function currentPlanAnswer(userId) {
    const me = await User.findById(userId).select("plan").lean();
    const p = me?.plan || {};
    const key = planKeyOf(me);
    return { ok: true, plan: { key, term: planSourceAndTerm(p, key).term, expires_at: p.expires_at ? new Date(p.expires_at).toISOString() : null } };
}

// The super admin's copy of a Google Play payment (PlatformTransaction, the same kind of row a website payment writes;
// the revenue pages drop it when the Invoices row with the same payment id exists, so nothing counts twice)
async function recordPlatformPayment({ user, flow, amountInr, paymentId, orderId, note, paidAt, expiresAt = null }) {
    try {
        const { default: PlatformTransaction } = await import("../models/PlatformTransaction.js");
        await PlatformTransaction.create({
            organizationId: user?.organization_id?._id || null,
            organizationName: user?.organization_id?.name || "",
            type: "google_play",
            paymentFlow: flow,
            amount: Number(amountInr) || 0,
            currency: "INR",
            status: "success",
            razorpayOrderId: orderId || null,
            razorpayPaymentId: paymentId,
            note,
            userName: user?.name || "Unknown",
            userEmail: user?.email || "",
            userMobile: user?.phoneNumber || "",
            userId: user?._id || null,
            userRole: user?.role || "",
            paymentMethod: "google_play",
            paymentTime: paidAt || new Date(),
            newExpiresAt: expiresAt,
        });
    } catch (e) {
        console.error("[Google Play] PlatformTransaction failed:", e.message);
    }
}

// The Invoices row; true when it was written now (false when the same Google order was already recorded)
async function writeInvoiceRow(fields) {
    try {
        await AiCreditTransaction.create(fields);
        return true;
    } catch (e) {
        if (e?.code !== 11000) console.error("[Google Play] invoice row failed:", e.message);
        return false;
    }
}

const termText = (term) => (term === "year" ? "1 year" : "1 month");

function announce(io, userId, events) {
    if (!io) return;
    for (const [name, payload] of events) io.to(String(userId)).emit(name, payload);
    io.to("superadmin:ai_usage").emit("ai_usage_updated");
}

// ── Verify and grant ──

/**
 * Checks one purchase with Google and gives it to the signed-in user, once.
 * Answers { ok: true, plan?: { key, term, expires_at }, credits_added?: number }; throws PlayError otherwise.
 */
export async function verifyPlayPurchase({ user, type, productId, purchaseToken, io = null }) {
    const userId = String(user._id);
    const client = await requireClient();

    // A subscription token that a later plan change (or re-signup) replaced: never given again, so it can't undo the
    // newer plan; the answer is the plan the user has now
    if (type === "subscription") {
        const newer = await GooglePlayPurchase.findOne({ linkedPurchaseToken: purchaseToken }).select("userId").lean();
        if (newer) {
            if (String(newer.userId) !== userId) throw new PlayError(403, "This purchase belongs to another Classgrid account.", "other_account");
            return currentPlanAnswer(userId);
        }
    }

    const existing = await GooglePlayPurchase.findOne({ purchaseToken }).lean();
    let decision = purchaseDecision(existing, { userId, productId });
    if (existing && existing.type !== type && decision !== "other_account") decision = "wrong_product";
    if (decision === "other_account") throw new PlayError(403, "This purchase belongs to another Classgrid account.", "other_account");
    if (decision === "wrong_product") throw new PlayError(400, "This purchase is not for that product.", "wrong_product");
    if (decision === "granted") return answerGranted(client, existing);
    if (decision === "in_progress") {
        const done = await waitForGrant(purchaseToken);
        if (done) return answerGranted(client, done);
    }

    return type === "subscription"
        ? grantSubscription({ client, user, userId, productId, purchaseToken, existing: decision === "stale" ? existing : null, io })
        : grantCreditPack({ client, user, userId, productId, purchaseToken, existing: decision === "stale" ? existing : null, io });
}

// Claim the token (or take over a stale claim). Returns the row this request owns, or an answer when another request
// owns it / already granted it.
async function ownClaim({ client, existing, purchaseToken, userId, type, productId, orderId }) {
    if (existing) {
        const row = await takeOver(existing);
        if (row) return { row };
        const now = await GooglePlayPurchase.findOne({ purchaseToken }).lean();
        if (now?.status === "granted") return { answer: await answerGranted(client, now) };
        throw new PlayError(409, "This purchase is still being processed. Try again in a moment.", "in_progress");
    }
    const { row, mine } = await claim({ purchaseToken, userId, type, productId, orderId });
    if (mine) return { row };
    if (!row) throw new PlayError(409, "This purchase is still being processed. Try again in a moment.", "in_progress");
    if (String(row.userId) !== userId) throw new PlayError(403, "This purchase belongs to another Classgrid account.", "other_account");
    if (row.status === "granted") return { answer: await answerGranted(client, row) };
    const done = await waitForGrant(purchaseToken);
    if (done) return { answer: await answerGranted(client, done) };
    throw new PlayError(409, "This purchase is still being processed. Try again in a moment.", "in_progress");
}

async function grantSubscription({ client, user, userId, productId, purchaseToken, existing, io }) {
    const purchase = await askGoogle("subscription check", () => client.purchases.subscriptionsv2.get({ packageName: PLAY_PACKAGE_NAME, token: purchaseToken }));
    const sub = readSubscription(purchase, { productId, userId });
    if (!sub.ok) throw new PlayError(sub.status, sub.error);
    const basePlanId = sub.basePlanId;

    const owned = await ownClaim({ client, existing, purchaseToken, userId, type: "subscription", productId, orderId: sub.orderId });
    if (owned.answer) return owned.answer;
    const row = owned.row;

    try {
        // The link to the replaced token is saved first, so that token can't be given while this one is being given
        if (sub.linkedPurchaseToken) await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { linkedPurchaseToken: sub.linkedPurchaseToken } });
        const me = await User.findById(userId).select("plan name email phoneNumber role organization_id").populate("organization_id", "name").lean();
        if (!me) throw new PlayError(404, "Your account was not found.");
        const now = new Date();
        // (a plan change: the new token becomes the user's subscription; renewals are read from it, never the old one)
        const plan = planFromSubscription(me.plan, sub, { productId, purchaseToken, basePlanId, now });
        await User.updateOne({ _id: userId }, { $set: { plan } });

        // The Invoices row (one per Google order; the same order sent again adds nothing) and the super admin's copy
        const paymentId = playPaymentId(sub.orderId, purchaseToken);
        const written = await writeInvoiceRow({
            userId, orgId: null, amount_inr: sub.priceInr, credits_added: 0,
            razorpay_payment_id: paymentId, razorpay_order_id: sub.orderId || "google_play",
            type: "plan", status: "success", plan_key: sub.key, plan_term: sub.term, plan_period_start: now, plan_period_end: plan.expires_at,
            ...userInfo(me), paymentMethod: "google_play", paymentTime: now,
            metadata: { source: "google_play", productId: sub.productId, basePlanId, linkedPurchaseToken: sub.linkedPurchaseToken || undefined },
        });
        if (written) await recordPlatformPayment({ user: me, flow: "ai_plan", amountInr: sub.priceInr, paymentId, orderId: sub.orderId, note: `Classgrid ${sub.key} plan, ${termText(sub.term)} (Google Play)`, paidAt: now, expiresAt: plan.expires_at });

        const granted = { plan: { key: sub.key, term: sub.term, expires_at: plan.expires_at.toISOString() } };
        await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { status: "granted", granted, orderId: sub.orderId, acknowledged: !sub.needsAck } });
        if (sub.needsAck) await acknowledgeSubscription(client, { ...row, productId, purchaseToken });
        announce(io, userId, [["ai_token_update"], ["plan_update", { plan: sub.key }]]);
        console.log(`[Google Play] plan ${sub.key} (${sub.term}) on user ${userId} until ${plan.expires_at.toISOString()}`);
        return { ok: true, ...granted };
    } catch (err) {
        // Nothing was finished: let go of the token so the phone can send it again
        await GooglePlayPurchase.deleteOne({ _id: row._id, status: "granting" }).catch(() => {});
        throw err;
    }
}

async function grantCreditPack({ client, user, userId, productId, purchaseToken, existing, io }) {
    const purchase = await askGoogle("product check", () => client.purchases.products.get({ packageName: PLAY_PACKAGE_NAME, productId, token: purchaseToken }));
    const pack = readProductPurchase(purchase, { productId, userId });
    if (!pack.ok) throw new PlayError(pack.status, pack.error);

    // Top-ups are for the Pro and Max plans, as on the website (not consumed or acknowledged: Google refunds it)
    const { topupBlockedByPlan, TOPUP_NEEDS_PLAN } = await import("../controllers/ai-credits-topup.controller.js");
    if (await topupBlockedByPlan(user)) throw new PlayError(403, TOPUP_NEEDS_PLAN, "topup_needs_plan");

    const { calculateCreditsFromAmount } = await import("./ai-credits.service.js");
    const credits = await calculateCreditsFromAmount(pack.amountInr);
    if (!(credits > 0)) throw new PlayError(500, "Credits can't be added right now. Please try again later.");

    const owned = await ownClaim({ client, existing, purchaseToken, userId, type: "product", productId, orderId: pack.orderId });
    if (owned.answer) return owned.answer;
    const row = owned.row;
    const paymentId = playPaymentId(pack.orderId, purchaseToken);

    // A claim taken over: if its Invoices row exists, the credits were added before that request stopped
    if (existing) {
        const done = await AiCreditTransaction.findOne({ razorpay_payment_id: paymentId }).select("credits_added").lean();
        if (done) {
            const granted = { credits_added: done.credits_added };
            await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { status: "granted", granted } });
            await consumeProduct(client, { ...row, productId, purchaseToken });
            return { ok: true, ...granted };
        }
    }

    let txn = null;
    try {
        const me = await User.findById(userId).select("name email phoneNumber role organization_id").populate("organization_id", "name").lean();
        if (!me) throw new PlayError(404, "Your account was not found.");
        const now = new Date();
        const paidAt = Number(purchase.purchaseTimeMillis) > 0 ? new Date(Number(purchase.purchaseTimeMillis)) : now;
        txn = await AiCreditTransaction.create({
            userId, orgId: me.organization_id?._id || null, amount_inr: pack.amountInr, credits_added: credits,
            razorpay_payment_id: paymentId, razorpay_order_id: pack.orderId || "google_play",
            type: "topup", status: "success", ...userInfo(me), paymentMethod: "google_play", paymentTime: paidAt,
            metadata: { source: "google_play", productId },
        });

        // Bought credits, exactly as a paid website top-up adds them (razorpay-webhook.routes.js AI_TOPUP): 30 days
        // from this purchase, an expired balance starting again at this purchase
        const { addToPool } = await import("./credit-expiry.js");
        const added = await addToPool(User, userId, "bought", credits, {
            now, startDate: now, endDate: new Date(now.getTime() + 30 * DAY), startOnlyIfMissing: true,
        });
        if (added.refused || !added.user) throw new Error(added.refused ? "no credits to add" : "user not found");

        const granted = { credits_added: credits };
        await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { status: "granted", granted, orderId: pack.orderId } });
        await recordPlatformPayment({ user: me, flow: "ai_topup", amountInr: pack.amountInr, paymentId, orderId: pack.orderId, note: `AI Top-Up Purchase, ${productId} (Google Play)`, paidAt });
        await consumeProduct(client, { ...row, productId, purchaseToken });
        announce(io, userId, [["ai_token_update"]]);
        console.log(`[Google Play] ${productId}: ${credits} credits added to user ${userId}`);
        return { ok: true, ...granted };
    } catch (err) {
        // Nothing was given: take back the Invoices row and let go of the token so the phone can send it again
        if (txn) await AiCreditTransaction.deleteOne({ _id: txn._id }).catch(() => {});
        await GooglePlayPurchase.deleteOne({ _id: row._id, status: "granting" }).catch(() => {});
        if (err instanceof PlayError) throw err;
        if (err?.code === 11000) throw new PlayError(409, "This purchase has already been used.", "already_used");
        throw err;
    }
}

// ── Renewals ──

const THROTTLE_S = 600;
const lastTried = new Map(); // (when Redis can't be reached: this process's own memory)

// At most one Google check per user per 10 minutes, across both server processes
async function mayCheck(userId) {
    const key = `gplay:renew:${userId}`;
    try {
        const got = await redis.set(key, "1", "EX", THROTTLE_S, "NX");
        return got === "OK";
    } catch {
        const at = lastTried.get(userId) || 0;
        if (Date.now() - at < THROTTLE_S * 1000) return false;
        lastTried.set(userId, Date.now());
        if (lastTried.size > 5000) lastTried.clear();
        return true;
    }
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timed out")), ms))]);

/**
 * When a Google Play plan's end has passed or is near, asks Google about its token and moves the end date to
 * Google's (a renewal or a grace period), or lets it end. Returns the user's plan after the check, or null when
 * nothing was checked or changed. Never throws: a failed check leaves the plan as it is.
 */
export async function refreshPlayPlan(user, { timeoutMs = 8000 } = {}) {
    try {
        const plan = user?.plan;
        if (!playRefreshDue(plan)) return null;
        const userId = String(user._id);
        if (!(await mayCheck(userId))) return null;
        const client = await playClient().catch(() => null);
        if (!client) return null;
        const token = plan.play_purchase_token;
        const purchase = (await withTimeout(client.purchases.subscriptionsv2.get({ packageName: PLAY_PACKAGE_NAME, token }), timeoutMs)).data;
        const change = playRenewalUpdate(plan, purchase);
        if (!change) return null;
        const set = {};
        for (const [k, v] of Object.entries(change.set)) set[`plan.${k}`] = v;
        // (only while the plan is still this Google Play subscription: a plan bought since is left alone)
        const updated = await User.findOneAndUpdate(
            { _id: userId, "plan.billing": "play", "plan.play_purchase_token": token },
            { $set: set },
            { returnDocument: "after", projection: { plan: 1, name: 1, email: 1, phoneNumber: 1, role: 1 } },
        ).lean();
        if (!updated) return null;
        if (change.extended) {
            // The renewal's Invoices row (one per Google order)
            const now = new Date();
            const paymentId = playPaymentId(change.orderId, `${token}:${change.set.expires_at.toISOString()}`);
            const written = await writeInvoiceRow({
                userId, orgId: null, amount_inr: change.priceInr || 0, credits_added: 0,
                razorpay_payment_id: paymentId, razorpay_order_id: change.orderId || "google_play",
                type: "plan", status: "success", plan_key: change.key, plan_term: change.term || "", plan_period_start: now, plan_period_end: change.set.expires_at,
                ...userInfo(updated), paymentMethod: "google_play", paymentTime: now,
                metadata: { source: "google_play", renewal: true, productId: updated.plan?.play_product_id || "" },
            });
            // (a grace period moves the end without a new order: no second row)
            if (written) await recordPlatformPayment({ user: updated, flow: "ai_plan", amountInr: change.priceInr || 0, paymentId, orderId: change.orderId, note: `Classgrid ${change.key} plan renewed, ${termText(change.term)} (Google Play)`, paidAt: now, expiresAt: change.set.expires_at });
            if (purchase.acknowledgementState === ACK_PENDING) {
                await client.purchases.subscriptions.acknowledge({ packageName: PLAY_PACKAGE_NAME, subscriptionId: updated.plan?.play_product_id, token, requestBody: {} }).catch(() => {});
            }
            console.log(`[Google Play] plan renewed for user ${userId} until ${change.set.expires_at.toISOString()}`);
        }
        return updated.plan;
    } catch (err) {
        console.error("[Google Play] renewal check failed:", err?.response?.data?.error?.message || err.message);
        return null;
    }
}

/** The same check in the background (the plan check before a request never waits for Google) */
export function refreshPlayPlanSoon(user) {
    if (!playRefreshDue(user?.plan)) return;
    refreshPlayPlan(user).catch(() => {});
}
