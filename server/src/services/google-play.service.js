// Google Play purchases from the Android app (owner, 2026-11-22: the app goes on Google Play, and Google requires
// plans and credits bought inside the app to go through Google Play Billing).
//
// The phone buys through Google, then sends the purchase token to POST /api/billing/google-play/verify
// (controllers/google-play.controller.js). Here the token is checked with Google (Android Publisher API v3, with the
// service account key in GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) and the plan or the credits are given:
//   - a subscription (classgrid_pro, classgrid_max) puts the plan on the user with billing "play", source
//     "google_play", Google's expiry, and the purchase token kept so renewals can be checked; it is acknowledged with
//     Google (Google refunds a purchase not acknowledged within 3 days). It is refused, and not acknowledged so Google
//     refunds it, when the user already has a plan of the same or a higher tier from elsewhere (has_other_plan), when
//     it is a student offer and the user is not an approved student (not_student), or when it replaces a token that
//     belongs to another account (other_account)
//   - a credit pack (credits_500 ... credits_5000) adds bought credits like a paid website top-up (the pack's rupees x
//     the live credits_per_inr, 30 days, a row on the Invoices tab), then is consumed so it can be bought again. The
//     credits and the account's mark for that token are written in one database step: a pack is credited once, and a
//     pack that was credited is always finished, never rolled back
// Every payment is booked at what Google really charged (orders.get), with the super admin's PlatformTransaction copy.
//
// Afterwards, Google's word is followed in four ways:
//   - real-time developer notifications (Pub/Sub push to POST /api/billing/google-play/rtdn): each one re-reads the
//     token from Google and applies it (renewed, recovered, on hold, cancelled, expired, revoked, voided)
//   - a renewal check when a Play plan's end has passed or is within the hour (plan overview, the plan check before a
//     request in the background, the hourly plan-end worker), at most once per 10 minutes per user
//   - every 30 minutes: acknowledge/consume calls that failed are tried again (purchases younger than 3 days), and a
//     grant that stopped half-way is finished
//   - every day: Google's voided purchases (refunds, chargebacks, revocations) end the plan or take the credits back
// The fixed rules (product names, the account check, what a purchase gives) are in services/google-play-rules.js.
import crypto from "crypto";
import User from "../models/User.js";
import GooglePlayPurchase from "../models/GooglePlayPurchase.js";
import AiCreditTransaction from "../models/AiCreditTransaction.js";
import redis from "../config/redis.js";
import {
    PLAY_PACKAGE_NAME, parseServiceAccount, readSubscription, planFromSubscription, readProductPurchase,
    purchaseDecision, playRefreshDue, playRenewalUpdate, planSourceAndTerm, entitledItem, subscriptionLineItem,
    otherPlanDecision, studentVerified, chargedAmount, packFallbackPrice, packAmountInr, creditMark, voidEndsPlan,
    bookedAmount, isTestSubscription, playNoticeOf, CLAIM_STALE_MS, ACK_PENDING, SUB_EXPIRED,
} from "./google-play-rules.js";
import { sendPlayPlanEmails, sendPlayPackEmails, sendPlayNoticeEmails, sendPlayRefundEmails, moneyText } from "./play-emails.js";
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
let clientForTests = null;

/** Tests only: a stand-in for the Android Publisher client (null puts the real one back) */
export function usePlayClientForTests(client) { clientForTests = client; }

/** The Android Publisher client, or null when GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing or not a service account key */
async function playClient() {
    if (clientForTests) return clientForTests;
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

export const playConfigured = () => !!clientForTests || !!parseServiceAccount(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "");

async function requireClient() {
    const client = await playClient().catch((e) => { console.error("[Google Play] client failed:", e.message); return null; });
    if (!client) throw new PlayError(503, "Google Play purchases are not set up on the server yet.", "play_not_configured");
    return client;
}

const googleStatus = (err) => Number(err?.response?.status || err?.code) || 0;
const googleMessage = (err) => err?.response?.data?.error?.message || err?.message || String(err);

// A Google call; its failure becomes a plain answer (an unknown token is the phone's mistake, anything else Google's)
async function askGoogle(what, fn) {
    try {
        return (await fn()).data;
    } catch (err) {
        const status = googleStatus(err);
        console.error(`[Google Play] ${what} failed (${status || "no status"}):`, googleMessage(err));
        if (status === 400 || status === 404 || status === 410) throw new PlayError(400, "Google Play could not find this purchase.", "purchase_not_found");
        throw new PlayError(502, "Google Play could not be reached. Please try again in a moment.", "google_unavailable");
    }
}

const readSub = (client, token) => askGoogle("subscription read", () => client.purchases.subscriptionsv2.get({ packageName: PLAY_PACKAGE_NAME, token }));

// What Google charged for one order (orders.get; needs the service account's "View financial data" permission).
// null when it can't be read: the payment is then booked at the fallback price
async function readOrder(client, orderId) {
    if (!orderId || !client?.orders?.get) return null;
    try {
        return (await client.orders.get({ packageName: PLAY_PACKAGE_NAME, orderId })).data || null;
    } catch (err) {
        console.warn(`[Google Play] order ${orderId} could not be read (${googleStatus(err) || "no status"}):`, googleMessage(err));
        return null;
    }
}

// ── Idempotency ──

let indexReady = null;
const ensureIndex = () => (indexReady ||= GooglePlayPurchase.init().catch((e) => { indexReady = null; throw e; }));

const grantedAnswer = (row) => ({ ok: true, ...(row.granted || {}) });
const IN_PROGRESS = () => new PlayError(409, "This purchase is still being processed. Try again in a moment.", "in_progress");
const OTHER_ACCOUNT = () => new PlayError(403, "This purchase belongs to another Classgrid account.", "other_account");

// The token's row, created atomically. { row, mine: true } = this request owns the claim; { row, mine: false } =
// another request made it first.
async function claim(fields) {
    await ensureIndex();
    try {
        const row = await GooglePlayPurchase.create({ ...fields, status: "granting" });
        return { row: row.toObject(), mine: true };
    } catch (err) {
        if (err?.code !== 11000) throw err;
        return { row: await GooglePlayPurchase.findOne({ purchaseToken: fields.purchaseToken }).lean(), mine: false };
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
    throw IN_PROGRESS();
}

// ── Telling Google it is done ──

// The product a subscription token is acknowledged under: its line item paid for now (after a deferred downgrade
// that is still the old product), else its first line item, else what the phone named
const ackProductOf = (purchase, fallback) => entitledItem(purchase)?.productId || subscriptionLineItem(purchase)?.productId || fallback;

async function acknowledgeSubscription(client, row, productId) {
    try {
        await client.purchases.subscriptions.acknowledge({ packageName: PLAY_PACKAGE_NAME, subscriptionId: productId, token: row.purchaseToken, requestBody: {} });
        await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { acknowledged: true } });
        return true;
    } catch (err) {
        // (tried again every 30 minutes while the purchase is younger than 3 days: retryUnfinished)
        console.error("[Google Play] acknowledge failed:", googleMessage(err));
        return false;
    }
}

async function consumeProduct(client, row) {
    try {
        await client.purchases.products.consume({ packageName: PLAY_PACKAGE_NAME, productId: row.productId, token: row.purchaseToken });
        await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { consumed: true } });
        return true;
    } catch (err) {
        console.error("[Google Play] consume failed:", googleMessage(err));
        return false;
    }
}

// A subscription already given: acknowledge it if Google still waits for that
async function finishAcknowledge(client, row) {
    const sub = await readSub(client, row.purchaseToken).catch(() => null);
    if (!sub) return false;
    if (sub.acknowledgementState === ACK_PENDING) return acknowledgeSubscription(client, row, ackProductOf(sub, row.productId));
    await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { acknowledged: true } }).catch(() => {});
    return true;
}

// A purchase already given: finish what Google was not told yet, then answer with what was given
async function answerGranted(client, row) {
    if (row.type === "subscription" && !row.acknowledged) await finishAcknowledge(client, row);
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
const tokenHash = (purchaseToken) => crypto.createHash("sha256").update(String(purchaseToken)).digest("hex").slice(0, 40);
export const playPaymentId = (orderId, purchaseToken) => `gplay:${orderId || `token:${tokenHash(purchaseToken)}`}`;
const playRefundId = (orderId, purchaseToken) => `gplay-void:${orderId || `token:${tokenHash(purchaseToken)}`}`;

// The super admin's copy of a Google Play payment (PlatformTransaction, the same kind of row a website payment writes;
// the revenue pages drop it when the Invoices row with the same payment id exists, so nothing counts twice)
async function recordPlatformPayment({ user, flow, charged, paymentId, orderId, note, paidAt, expiresAt = null }) {
    try {
        const { default: PlatformTransaction } = await import("../models/PlatformTransaction.js");
        await PlatformTransaction.create({
            organizationId: user?.organization_id?._id || null,
            organizationName: user?.organization_id?.name || "",
            type: "google_play",
            paymentFlow: flow,
            amount: Number(charged?.amount) || 0,
            currency: charged?.currency || "INR",
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
        if (e?.code !== 11000) { console.error("[Google Play] invoice row failed:", e.message); throw e; }
        return false;
    }
}

// What was charged, kept beside the rupee amount (amount_inr is 0 when the money was not rupees)
const chargedMeta = (charged) => ({ charged_currency: charged.currency || null, charged_amount: charged.known ? charged.amount : null });

const termText = (term) => (term === "year" ? "1 year" : "1 month");

// The apps, the open super admin pages (Plans & Usage, and Revenue: billing_payments_updated, as a website payment
// sends it) and the cached profile (GET /api/users/profile keeps it 30 minutes) learn of a change
function announce(io, userId, events) {
    redis.del(`user:profile:v2:${userId}`).catch(() => {});
    try {
        io = io || null;
        if (!io) return;
        for (const [name, payload] of events) io.to(String(userId)).emit(name, payload);
        io.to("superadmin:ai_usage").emit("ai_usage_updated");
        io.to("superadmin:billing").emit("billing_payments_updated");
    } catch { /* (a socket problem never stops a payment) */ }
}

// The socket server outside a request (the jobs and Google's notifications)
async function socketServer() {
    try { return (await import("./socket.service.js")).getIO(); } catch { return null; }
}

// The user's plan now, in the answer's shape (for a replaced token sent again)
async function currentPlanAnswer(userId) {
    const me = await User.findById(userId).select("plan").lean();
    const p = me?.plan || {};
    const key = planKeyOf(me);
    return { ok: true, plan: { key, term: planSourceAndTerm(p, key).term, expires_at: p.expires_at ? new Date(p.expires_at).toISOString() : null } };
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
            if (String(newer.userId) !== userId) throw OTHER_ACCOUNT();
            return currentPlanAnswer(userId);
        }
    }

    const existing = await GooglePlayPurchase.findOne({ purchaseToken }).lean();
    let decision = purchaseDecision(existing, { userId, productId });
    if (existing && existing.type !== type && decision !== "other_account") decision = "wrong_product";
    if (decision === "other_account") throw OTHER_ACCOUNT();
    if (decision === "wrong_product") throw new PlayError(400, "This purchase is not for that product.", "wrong_product");
    if (decision === "granted") return answerGranted(client, existing);
    if (decision === "in_progress") {
        const done = await waitForGrant(purchaseToken);
        if (done) return answerGranted(client, done);
    }

    const stale = decision === "stale" ? existing : null;
    return type === "subscription"
        ? grantSubscription({ client, userId, productId, purchaseToken, existing: stale, io })
        : grantCreditPack({ client, user, userId, productId, purchaseToken, existing: stale, io });
}

// Claim the token (or take over a stale claim). Returns the row this request owns, or an answer when another request
// owns it / already granted it.
async function ownClaim({ client, existing, fields }) {
    if (existing) {
        const row = await takeOver(existing);
        if (row) return { row };
        const now = await GooglePlayPurchase.findOne({ purchaseToken: fields.purchaseToken }).lean();
        if (now?.status === "granted") return { answer: await answerGranted(client, now) };
        throw IN_PROGRESS();
    }
    const { row, mine } = await claim(fields);
    if (mine) return { row };
    if (!row) throw IN_PROGRESS();
    if (String(row.userId) !== String(fields.userId)) throw OTHER_ACCOUNT();
    if (row.status === "granted") return { answer: await answerGranted(client, row) };
    const done = await waitForGrant(fields.purchaseToken);
    if (done) return { answer: await answerGranted(client, done) };
    throw IN_PROGRESS();
}

const HAS_OTHER_PLAN = "You already have a plan on Classgrid that is the same or higher. This Google Play purchase was not used, and Google will refund it.";
const NOT_STUDENT = "Student prices are for approved students. Apply for student prices in Settings > Billing. This Google Play purchase was not used, and Google will refund it.";

async function grantSubscription({ client, userId, productId, purchaseToken, existing, io }) {
    const purchase = await readSub(client, purchaseToken);
    const sub = readSubscription(purchase, { productId, userId });
    if (!sub.ok) throw new PlayError(sub.status, sub.error, sub.code);

    const me = await User.findById(userId).select("plan student_verification name email phoneNumber role organization_id").populate("organization_id", "name").lean();
    if (!me) throw new PlayError(404, "Your account was not found.");

    // Student offers only for an approved student (the rule of GET /api/ai/student: verified and not run out)
    if (sub.studentOffer && !studentVerified(me.student_verification)) throw new PlayError(403, NOT_STUDENT, "not_student");

    // A plan change: the token it replaces must be this user's (never take over another account's subscription)
    if (sub.linkedPurchaseToken) {
        const [oldRow, holder] = await Promise.all([
            GooglePlayPurchase.findOne({ purchaseToken: sub.linkedPurchaseToken }).select("userId").lean(),
            User.findOne({ _id: { $ne: userId }, "plan.play_purchase_token": sub.linkedPurchaseToken }).select("_id").lean(),
        ]);
        if ((oldRow && String(oldRow.userId) !== userId) || (!oldRow && holder)) throw OTHER_ACCOUNT();
    }

    // Another plan of the same or a higher tier still running (website, gift, seat, another Play subscription)
    const other = otherPlanDecision(me.plan, { key: sub.key, purchaseToken, linkedPurchaseToken: sub.linkedPurchaseToken });
    if (other.block) throw new PlayError(409, HAS_OTHER_PLAN, "has_other_plan");

    const owned = await ownClaim({ client, existing, fields: { purchaseToken, userId, type: "subscription", productId, orderId: sub.orderId, linkedPurchaseToken: sub.linkedPurchaseToken } });
    if (owned.answer) return owned.answer;
    const row = owned.row;

    try {
        // (saved first, so the replaced token can't be given while this one is being given)
        if (sub.linkedPurchaseToken) await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { linkedPurchaseToken: sub.linkedPurchaseToken } });
        const now = new Date();
        // The new token becomes the user's subscription; renewals are read from it, never from the replaced one
        const plan = planFromSubscription(me.plan, sub, { productId, purchaseToken, now });
        await User.updateOne({ _id: userId }, { $set: { plan } });
        if (other.replaces) {
            // A lower plan from elsewhere is upgraded here. Website plans are paid once and never renew by themselves
            // (no autopay mandate is ever made for a person's plan), so nothing is left to stop
            console.log(`[Google Play] user ${userId}: the ${me.plan?.id} plan (${other.replaces}) is replaced by Google Play ${sub.key}`);
        }
        if (sub.linkedPurchaseToken) {
            await GooglePlayPurchase.updateOne({ purchaseToken: sub.linkedPurchaseToken }, { $set: { replacedBy: purchaseToken } }).catch(() => {});
        }

        // The Invoices row (one per Google order) at what Google charged, and the super admin's copy (a test
        // purchase: booked at 0 and marked)
        const order = await readOrder(client, sub.orderId);
        const realCharge = chargedAmount(order, sub.recurringPrice && !sub.studentOffer && !sub.offerId ? sub.recurringPrice : null);
        const charged = bookedAmount(realCharge, sub.test);
        if (!charged.known) console.warn(`[Google Play] order ${sub.orderId || "(none)"}: the price could not be read; booked at 0`);
        const paymentId = playPaymentId(sub.orderId, purchaseToken);
        const written = await writeInvoiceRow({
            userId, orgId: null, amount_inr: charged.inr, credits_added: 0,
            razorpay_payment_id: paymentId, razorpay_order_id: sub.orderId || "google_play",
            type: "plan", status: "success", plan_key: sub.key, plan_term: sub.term, plan_period_start: now, plan_period_end: plan.expires_at,
            ...userInfo(me), paymentMethod: "google_play", paymentTime: now,
            metadata: { source: "google_play", productId: sub.productId, basePlanId: sub.basePlanId, offerId: sub.offerId || undefined, linkedPurchaseToken: sub.linkedPurchaseToken || undefined, test_purchase: sub.test || undefined, ...chargedMeta(charged) },
        });
        if (written) {
            await recordPlatformPayment({ user: me, flow: "ai_plan", charged, paymentId, orderId: sub.orderId, note: `Classgrid ${sub.key} plan, ${termText(sub.term)} (Google Play)${sub.test ? " (test purchase)" : ""}`, paidAt: now, expiresAt: plan.expires_at });
            // The receipt and the team alert, once per Google order (play-emails.js), after the reply
            sendPlayPlanEmails({ user: { ...me, _id: userId }, key: sub.key, term: sub.term, charged: sub.test ? realCharge : charged, paymentId, orderId: sub.orderId, from: now, to: plan.expires_at, autoRenew: sub.autoRenew, productId: sub.productId, test: sub.test }).catch(() => {});
        }

        const granted = { plan: { key: sub.key, term: sub.term, expires_at: plan.expires_at.toISOString() } };
        await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { status: "granted", granted, orderId: sub.orderId, acknowledged: !sub.needsAck } });
        if (sub.needsAck) await acknowledgeSubscription(client, row, sub.productId);
        announce(io, userId, [["ai_token_update"], ["plan_update", { plan: sub.key }]]);
        console.log(`[Google Play] plan ${sub.key} (${sub.term}) on user ${userId} until ${plan.expires_at.toISOString()}`);
        return { ok: true, ...granted };
    } catch (err) {
        // Let go of the token so the phone can send it again (putting the plan on again is harmless)
        await GooglePlayPurchase.deleteOne({ _id: row._id, status: "granting" }).catch(() => {});
        throw err;
    }
}

const CREDITED_FIELD = "play_credited";
const isCredited = async (userId, purchaseToken) => !!(await User.findOne({ _id: userId, [CREDITED_FIELD]: creditMark(purchaseToken) }).select("_id").lean());

async function grantCreditPack({ client, user, userId, productId, purchaseToken, existing, io }) {
    const purchase = await askGoogle("product check", () => client.purchases.products.get({ packageName: PLAY_PACKAGE_NAME, productId, token: purchaseToken }));
    const pack = readProductPurchase(purchase, { productId, userId });
    if (!pack.ok) throw new PlayError(pack.status, pack.error, pack.code);

    // A claim taken over: its credits may already be on the account (read from the account's own mark, never from
    // the Invoices row). Then it is only finished
    const creditedBefore = existing ? await isCredited(userId, purchaseToken) : false;
    let credits = creditedBefore ? Number(existing.creditsPlanned) || 0 : 0;
    if (!creditedBefore) {
        // Top-ups are for the Pro and Max plans, as on the website (not consumed or acknowledged: Google refunds it)
        const { topupBlockedByPlan, TOPUP_NEEDS_PLAN } = await import("../controllers/ai-credits-topup.controller.js");
        if (await topupBlockedByPlan(user)) throw new PlayError(403, TOPUP_NEEDS_PLAN, "topup_needs_plan");
        const { calculateCreditsFromAmount } = await import("./ai-credits.service.js");
        credits = await calculateCreditsFromAmount(pack.amountInr);
        if (!(credits > 0)) throw new PlayError(500, "Credits can't be added right now. Please try again later.");
    }

    const owned = await ownClaim({ client, existing, fields: { purchaseToken, userId, type: "product", productId, orderId: pack.orderId, creditsPlanned: credits, regionCode: pack.regionCode } });
    if (owned.answer) return owned.answer;
    const row = owned.row;

    if (!creditedBefore) {
        try {
            // (a claim taken over keeps what this request is about to add)
            if (existing) await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { creditsPlanned: credits, regionCode: pack.regionCode, orderId: pack.orderId } });
            // Bought credits, exactly as a paid website top-up adds them (razorpay-webhook.routes.js AI_TOPUP): 30 days
            // from this purchase, an expired balance starting again at this purchase. The account's mark for this
            // token goes on in the same step, so the credits are added once whatever happens after
            const now = new Date();
            const { addToPool } = await import("./credit-expiry.js");
            const added = await addToPool(User, userId, "bought", credits, {
                now, startDate: now, endDate: new Date(now.getTime() + 30 * DAY), startOnlyIfMissing: true,
                once: { field: CREDITED_FIELD, mark: creditMark(purchaseToken) },
            });
            if (added.refused) throw new Error("no credits to add");
            if (!added.user && !added.already) throw new PlayError(404, "Your account was not found.");
        } catch (err) {
            // Whether the credits went on is read back from the account: only when they did not is the claim let go.
            // (If even that can't be read, the claim stays: the next verify or the 30-minute job reads it again)
            let creditedNow;
            try { creditedNow = await isCredited(userId, purchaseToken); } catch {
                throw new PlayError(500, "The purchase could not be checked. Please try again in a moment.", "finishing");
            }
            if (!creditedNow) {
                await GooglePlayPurchase.deleteOne({ _id: row._id, status: "granting" }).catch(() => {});
                throw err;
            }
            console.error(`[Google Play] ${productId}: credits are on user ${userId}, finishing after:`, err.message);
        }
    }
    await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { credited: true } }).catch(() => {});

    // From here the credits are on the account: nothing is rolled back. A step that fails leaves the claim for the
    // next verify or the 30-minute job to finish
    const finished = await finishCreditPack(client, { ...row, creditsPlanned: credits, regionCode: pack.regionCode, orderId: pack.orderId }, { pack, paidAt: pack.paidAt });
    if (!finished) throw new PlayError(500, "Your credits were added. The purchase is being finished; please try again in a moment.", "finishing");
    announce(io, userId, [["ai_token_update"]]);
    console.log(`[Google Play] ${productId}: ${credits} credits added to user ${userId}`);
    return { ok: true, credits_added: credits };
}

// The rest of a credited pack: its Invoices row and the super admin's copy (once), the row marked granted, consumed
async function finishCreditPack(client, row, { pack = null, paidAt = null } = {}) {
    try {
        const userId = String(row.userId);
        const credits = Number(row.creditsPlanned) || 0;
        const amountInr = pack?.amountInr || packAmountInr(row.productId) || 0;
        const p = pack || { amountInr, regionCode: row.regionCode || "", orderId: row.orderId || "" };
        const me = await User.findById(userId).select("name email phoneNumber role organization_id").populate("organization_id", "name").lean();
        const order = await readOrder(client, p.orderId);
        const realCharge = chargedAmount(order, packFallbackPrice(p));
        const test = p.test === true;
        const charged = bookedAmount(realCharge, test);
        if (!charged.known) console.warn(`[Google Play] pack order ${p.orderId || "(none)"} bought in ${p.regionCode || "?"}: the price could not be read; booked at 0`);
        const when = paidAt || new Date();
        const paymentId = playPaymentId(p.orderId, row.purchaseToken);
        const written = await writeInvoiceRow({
            userId, orgId: me?.organization_id?._id || null, amount_inr: charged.inr, credits_added: credits,
            razorpay_payment_id: paymentId, razorpay_order_id: p.orderId || "google_play",
            type: "topup", status: "success", ...userInfo(me), paymentMethod: "google_play", paymentTime: when,
            metadata: { source: "google_play", productId: row.productId, pack_inr: amountInr, regionCode: p.regionCode || undefined, test_purchase: test || undefined, ...chargedMeta(charged) },
        });
        if (written) {
            await recordPlatformPayment({ user: me, flow: "ai_topup", charged, paymentId, orderId: p.orderId, note: `AI Top-Up Purchase, ${row.productId} (Google Play)${test ? " (test purchase)" : ""}`, paidAt: when });
            // The receipt and the team alert, once per Google order (play-emails.js)
            sendPlayPackEmails({ user: { ...me, _id: userId }, productId: row.productId, credits, charged: test ? realCharge : charged, paymentId, orderId: p.orderId, paidAt: when, regionCode: p.regionCode, test }).catch(() => {});
        }
        await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { status: "granted", credited: true, granted: { credits_added: credits } } });
        await consumeProduct(client, row);
        return true;
    } catch (err) {
        console.error(`[Google Play] finishing ${row.productId} for user ${row.userId} failed:`, err.message);
        return false;
    }
}

// ── Renewals and Google's word on a subscription ──

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
 * Reads the user's own Play subscription token from Google and makes the plan follow it: the end date, the plan
 * (a deferred downgrade that renewed), the state; a new order (a renewal) gets its Invoices row whatever the end date
 * did. Returns the plan after the change, or null when nothing was read or changed. Throws only when `throwOnError`.
 */
async function syncPlaySubscription(user, { purchase = null, timeoutMs = 8000, throwOnError = false } = {}) {
    try {
        const plan = user?.plan;
        if (!plan || plan.billing !== "play" || !plan.play_purchase_token) return null;
        const userId = String(user._id);
        const client = await playClient().catch(() => null);
        if (!client) return null;
        const token = plan.play_purchase_token;
        if (!purchase) purchase = (await withTimeout(client.purchases.subscriptionsv2.get({ packageName: PLAY_PACKAGE_NAME, token }), timeoutMs)).data;
        const change = playRenewalUpdate(plan, purchase);
        if (!change) return null;
        const set = {};
        for (const [k, v] of Object.entries(change.set)) set[`plan.${k}`] = v;
        // (only while the plan is still this Google Play subscription: a plan bought since is left alone)
        const updated = await User.findOneAndUpdate(
            { _id: userId, "plan.billing": "play", "plan.play_purchase_token": token },
            { $set: set },
            { returnDocument: "after", projection: { plan: 1, name: 1, email: 1, phoneNumber: 1, role: 1, organization_id: 1 } },
        ).populate("organization_id", "name").lean();
        if (!updated) return null;
        // A notice email (renewal off or on again, a payment problem, on hold, paused, ended), once per change: both
        // server processes and Google's repeated notifications may see the same change (play-emails.js)
        const notice = playNoticeOf(plan, change);
        if (notice) {
            const once = await redis.set(`gplay:notice:${tokenHash(token)}:${notice}:${new Date(updated.plan?.expires_at || 0).getTime()}`, "1", "EX", 40 * 86400, "NX").catch(() => "OK");
            if (once === "OK") {
                sendPlayNoticeEmails({ user: updated, kind: notice, key: updated.plan?.id || plan.id, productId: updated.plan?.play_product_id || plan.play_product_id || "", until: updated.plan?.expires_at || null, test: change.test ?? isTestSubscription(purchase) }).catch(() => {});
            }
            console.log(`[Google Play] ${notice} notice for user ${userId}`);
        }
        if (change.newOrder) {
            // The renewal's Invoices row (one per Google order) at what Google charged, else the recurring price (a
            // test purchase: booked at 0 and marked). Its period starts where the paid period before it ended
            const now = new Date();
            const prevEnd = plan.expires_at ? new Date(plan.expires_at).getTime() : NaN;
            const periodStart = Number.isFinite(prevEnd) && prevEnd <= now.getTime() + 3 * DAY ? new Date(prevEnd) : now;
            const order = await readOrder(client, change.newOrder);
            const realCharge = chargedAmount(order, change.recurringPrice);
            const charged = bookedAmount(realCharge, change.test);
            const paymentId = playPaymentId(change.newOrder, token);
            const written = await writeInvoiceRow({
                userId, orgId: null, amount_inr: charged.inr, credits_added: 0,
                razorpay_payment_id: paymentId, razorpay_order_id: change.newOrder,
                type: "plan", status: "success", plan_key: change.key, plan_term: change.term || "", plan_period_start: periodStart, plan_period_end: updated.plan?.expires_at || null,
                ...userInfo(updated), paymentMethod: "google_play", paymentTime: now,
                metadata: { source: "google_play", renewal: true, productId: updated.plan?.play_product_id || "", test_purchase: change.test || undefined, ...chargedMeta(charged) },
            }).catch(() => false);
            if (written) {
                await recordPlatformPayment({ user: updated, flow: "ai_plan", charged, paymentId, orderId: change.newOrder, note: `Classgrid ${change.key} plan renewed, ${termText(change.term)} (Google Play)${change.test ? " (test purchase)" : ""}`, paidAt: now, expiresAt: updated.plan?.expires_at || null });
                // The renewal's receipt and the team alert, once per Google order (play-emails.js)
                sendPlayPlanEmails({ user: updated, key: change.key, term: change.term, charged: change.test ? realCharge : charged, paymentId, orderId: change.newOrder, from: periodStart, to: updated.plan?.expires_at || now, autoRenew: change.autoRenew, productId: updated.plan?.play_product_id || "", test: change.test, renewal: true }).catch(() => {});
            }
            console.log(`[Google Play] order ${change.newOrder} booked for user ${userId}; plan until ${new Date(updated.plan?.expires_at).toISOString()}`);
        }
        if (purchase.acknowledgementState === ACK_PENDING && entitledItem(purchase)) {
            const row = await GooglePlayPurchase.findOne({ purchaseToken: token, status: "granted" }).lean();
            if (row) await acknowledgeSubscription(client, row, ackProductOf(purchase, row.productId));
        }
        if (change.extended || change.set.expires_at || change.set.id) announce(await socketServer(), userId, [["ai_token_update"], ["plan_update", { plan: updated.plan?.id }]]);
        return updated.plan;
    } catch (err) {
        if (throwOnError) throw err;
        console.error("[Google Play] subscription check failed:", googleMessage(err));
        return null;
    }
}

/**
 * When a Google Play plan's end has passed or is near, asks Google about its token (at most once per 10 minutes per
 * user). Returns the user's plan after the check, or null when nothing was checked or changed. Never throws.
 */
export async function refreshPlayPlan(user, { timeoutMs = 8000 } = {}) {
    try {
        if (!playRefreshDue(user?.plan)) return null;
        if (!(await mayCheck(String(user._id)))) return null;
        return await syncPlaySubscription(user, { timeoutMs });
    } catch (err) {
        console.error("[Google Play] renewal check failed:", googleMessage(err));
        return null;
    }
}

/** The same check in the background (the plan check before a request never waits for Google) */
export function refreshPlayPlanSoon(user) {
    if (!playRefreshDue(user?.plan)) return;
    refreshPlayPlan(user).catch(() => {});
}

// ── Refunds, chargebacks and revocations ──

/**
 * Applies one voided purchase (Google's voided purchases list, or its real-time notification): a pack's credits are
 * taken back (what is left of them: spent credits stay spent), a subscription's plan ends when the voided order is
 * the one paying for now (or Google no longer says it is paid). Recorded once per order: a "refund" row on the
 * Invoices tab (its payment id gplay-void:<order id> is unique) and a refund row for the super admin.
 * Returns what was done: "not_ours" | "already" | "applied".
 */
export async function applyVoidedPurchase({ purchaseToken, orderId = "", reason = null, source = "voided" }) {
    if (!purchaseToken) return "not_ours";
    const row = await GooglePlayPurchase.findOne({ purchaseToken }).lean();
    if (!row || !(row.status === "granted" || row.credited)) return "not_ours";
    const voidedOrder = orderId || row.orderId || "";
    const refundId = playRefundId(voidedOrder, purchaseToken);
    if (await AiCreditTransaction.findOne({ razorpay_payment_id: refundId }).select("_id").lean()) return "already";

    // A subscription: Google's word on it now (read before anything is recorded; a failed read is tried again later)
    let purchase = null;
    if (row.type === "subscription") {
        const client = await requireClient();
        purchase = await readSub(client, purchaseToken);
    }

    const userId = String(row.userId);
    const user = await User.findById(userId).select("plan name email phoneNumber role organization_id").populate("organization_id", "name").lean();
    const originalId = playPaymentId(voidedOrder, purchaseToken);
    const original = await AiCreditTransaction.findOne({ razorpay_payment_id: originalId }).select("amount_inr credits_added metadata").lean();

    // Recorded first: a second run (the job and the notification, or both server processes) stops here
    let refundRow;
    try {
        refundRow = await AiCreditTransaction.create({
            userId, orgId: user?.organization_id?._id || null, amount_inr: Number(original?.amount_inr) || 0, credits_added: 0,
            razorpay_payment_id: refundId, razorpay_order_id: voidedOrder || "google_play",
            type: "refund", status: "pending", ...userInfo(user), paymentMethod: "google_play", paymentTime: new Date(),
            metadata: { source: "google_play", productId: row.productId, voided_order: voidedOrder, voided_reason: reason, via: source, original_payment_id: originalId },
        });
    } catch (e) {
        if (e?.code === 11000) return "already";
        throw e;
    }

    const done = {};
    try {
        if (row.type === "product") {
            const { takeFromPool } = await import("./credit-expiry.js");
            done.credits_taken = await takeFromPool(User, userId, "bought", Number(row.granted?.credits_added) || Number(row.creditsPlanned) || 0);
        } else if (voidEndsPlan(user?.plan, { purchaseToken, orderId: voidedOrder }, purchase)) {
            const now = new Date();
            const ended = await User.updateOne(
                { _id: userId, "plan.billing": "play", "plan.play_purchase_token": purchaseToken },
                { $set: { "plan.status": "expired", "plan.expires_at": now, "plan.play_state": SUB_EXPIRED, "plan.cancel_at_period_end": true } },
            );
            done.plan_ended = (ended?.modifiedCount || 0) > 0;
        } else {
            done.plan_ended = false;
        }
    } catch (err) {
        // Nothing was taken back: the pending row goes, so the next run (the daily job or Google sending the
        // notification again) does it, instead of stopping at "already" for good
        await AiCreditTransaction.deleteOne({ _id: refundRow._id, status: "pending" }).catch(() => {});
        throw err;
    }
    await AiCreditTransaction.updateOne({ _id: refundRow._id }, { $set: { status: "success", "metadata.credits_taken": done.credits_taken ?? null, "metadata.plan_ended": done.plan_ended ?? null } });
    await GooglePlayPurchase.updateOne({ _id: row._id }, { $addToSet: { voidedOrders: voidedOrder || "(token)" } }).catch(() => {});

    // The super admin's refund row, pointing at the payment's own copy (how the revenue pages find refunds)
    try {
        const { default: PlatformTransaction } = await import("../models/PlatformTransaction.js");
        const originalPt = await PlatformTransaction.findOne({ razorpayPaymentId: originalId, type: { $ne: "refund" } });
        const currency = originalPt?.currency || original?.metadata?.charged_currency || "INR";
        const amount = Number(originalPt?.amount ?? original?.metadata?.charged_amount ?? original?.amount_inr) || 0;
        await PlatformTransaction.create({
            organizationId: originalPt?.organizationId || null, type: "refund", amount, currency, status: "refunded",
            razorpayPaymentId: refundId, razorpayOrderId: voidedOrder || null, refundOf: originalPt?._id || null,
            refundReason: `Google Play voided purchase${reason !== null && reason !== undefined ? ` (reason ${reason})` : ""}`, refundedAt: new Date(),
            note: `Refund of ${currency === "INR" ? "₹" : `${currency} `}${amount} for Google Play order ${voidedOrder || originalId}`,
            userName: user?.name || "", userEmail: user?.email || "", userId: user?._id || null, paymentMethod: "google_play",
        });
        if (originalPt) { originalPt.status = "refunded"; await originalPt.save(); }
    } catch (e) {
        console.error("[Google Play] refund row for the super admin failed:", e.message);
    }

    // The refund email to the person and the team (play-emails.js), once: only the run that wrote the refund row gets here
    {
        const meta = original?.metadata || {};
        const amountText = moneyText({ known: meta.charged_amount !== null && meta.charged_amount !== undefined, amount: meta.charged_amount, currency: meta.charged_currency || "INR" })
            || (Number(original?.amount_inr) ? moneyText({ known: true, amount: Number(original.amount_inr), currency: "INR" }) : "");
        sendPlayRefundEmails({
            user, type: row.type, key: row.granted?.plan?.key || user?.plan?.id || "", amountText, orderId: voidedOrder,
            planEnded: !!done.plan_ended, creditsTaken: done.credits_taken || 0, test: !!meta.test_purchase,
        }).catch(() => {});
    }
    announce(await socketServer(), userId, [["ai_token_update"], ...(done.plan_ended ? [["plan_update", { plan: "free" }]] : [])]);
    console.log(`[Google Play] voided ${row.type} order ${voidedOrder || "(token)"} for user ${userId} (${source}):`, JSON.stringify(done));
    return "applied";
}

/** Every day: Google's voided purchases of the last 7 days (one-time and subscriptions), each applied once */
export async function syncVoidedPurchases({ days = 7 } = {}) {
    const client = await playClient().catch(() => null);
    if (!client) return { checked: 0, applied: 0 };
    let token = undefined;
    let checked = 0;
    let applied = 0;
    const startTime = String(Date.now() - days * DAY);
    for (let page = 0; page < 50; page++) {
        const data = (await client.purchases.voidedpurchases.list({ packageName: PLAY_PACKAGE_NAME, type: 1, maxResults: 1000, ...(token ? { token } : { startTime }) })).data || {};
        for (const v of data.voidedPurchases || []) {
            checked++;
            try {
                if ((await applyVoidedPurchase({ purchaseToken: v.purchaseToken, orderId: v.orderId || "", reason: v.voidedReason ?? null, source: "voided_list" })) === "applied") applied++;
            } catch (err) {
                console.error(`[Google Play] voided order ${v.orderId || "?"} could not be applied (tried again tomorrow):`, googleMessage(err));
            }
        }
        token = data.tokenPagination?.nextPageToken;
        if (!token) break;
    }
    console.log(`[Google Play] voided purchases: ${checked} read, ${applied} applied`);
    return { checked, applied };
}

/**
 * Every 30 minutes: what a request left undone. Granted purchases younger than 3 days that Google was not told
 * about yet are acknowledged or consumed (else Google refunds them after 3 days), and claims that stopped half-way
 * are finished (a credited pack, a subscription already on the account) or let go (nothing was given).
 */
export async function retryUnfinished() {
    const client = await playClient().catch(() => null);
    if (!client) return { acknowledged: 0, consumed: 0, finished: 0, released: 0 };
    const out = { acknowledged: 0, consumed: 0, finished: 0, released: 0 };
    const since = new Date(Date.now() - 3 * DAY);
    const unfinished = await GooglePlayPurchase.find({
        status: "granted", createdAt: { $gte: since },
        $or: [{ type: "subscription", acknowledged: false }, { type: "product", consumed: false }],
    }).limit(500).lean();
    for (const row of unfinished) {
        if (row.type === "subscription") { if (await finishAcknowledge(client, row)) out.acknowledged++; }
        else if (await consumeProduct(client, row)) out.consumed++;
    }
    const stale = await GooglePlayPurchase.find({ status: "granting", updatedAt: { $lt: new Date(Date.now() - CLAIM_STALE_MS) } }).limit(200).lean();
    for (const row of stale) {
        const mine = await takeOver(row);
        if (!mine) continue;
        if (row.type === "product") {
            if (row.credited || (await isCredited(row.userId, row.purchaseToken))) {
                if (await finishCreditPack(client, mine)) out.finished++;
            } else {
                await GooglePlayPurchase.deleteOne({ _id: row._id, status: "granting" });
                out.released++;
            }
        } else {
            const user = await User.findById(row.userId).select("plan").lean();
            if (user?.plan?.billing === "play" && user.plan.play_purchase_token === row.purchaseToken) {
                const key = user.plan.id;
                const term = planSourceAndTerm(user.plan, key).term;
                await GooglePlayPurchase.updateOne({ _id: row._id }, { $set: { status: "granted", granted: { plan: { key, term, expires_at: user.plan.expires_at ? new Date(user.plan.expires_at).toISOString() : null } } } });
                await finishAcknowledge(client, mine);
                out.finished++;
            } else {
                await GooglePlayPurchase.deleteOne({ _id: row._id, status: "granting" });
                out.released++;
            }
        }
    }
    if (out.acknowledged || out.consumed || out.finished || out.released) console.log("[Google Play] unfinished purchases:", JSON.stringify(out));
    return out;
}

// ── Real-time developer notifications ──

/**
 * One notification from Google (parsed by google-play-rules.js parseRtdnPush), applied by reading the token from
 * Google again: never trusted on its own. Throws when Google can't be read, so Pub/Sub sends it again.
 */
export async function handlePlayNotification(n) {
    try {
        return await applyPlayNotification(n);
    } catch (err) {
        // A token Google no longer knows (an old purchase): nothing to apply, and nothing for Pub/Sub to send again
        if (err instanceof PlayError && err.body?.code === "purchase_not_found") return "gone";
        throw err;
    }
}

// Final answers of a grant: the purchase is not given (and not acknowledged, so Google refunds it); not tried again
const FINAL_REFUSALS = new Set(["has_other_plan", "not_student", "other_account", "topup_needs_plan", "wrong_product", "purchase_not_found"]);

/**
 * A purchase Google tells of before the phone sent it (the app closed or crashed after paying, or a slow UPI payment
 * that finished later): given from here, to the account named in the purchase (obfuscatedExternalAccountId, the
 * user's id the phone put on it), exactly as the phone's verify would give it. Without this, a purchase the phone
 * never sends is refunded by Google after 3 days. Returns what was done.
 */
async function grantFromNotification(n) {
    const client = await requireClient();
    let type; let productId; let accountId;
    if (n.kind === "subscription") {
        const purchase = await readSub(client, n.token);
        if (!entitledItem(purchase)) return "not_paid";
        type = "subscription";
        productId = (entitledItem(purchase) || subscriptionLineItem(purchase))?.productId || "";
        accountId = purchase?.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    } else if (n.kind === "product" && n.type === "ONE_TIME_PRODUCT_PURCHASED" && n.productId) {
        const purchase = await askGoogle("product read", () => client.purchases.products.get({ packageName: PLAY_PACKAGE_NAME, productId: n.productId, token: n.token }));
        // (0 = paid; a pending payment is told of again when it completes)
        if (purchase?.purchaseState !== 0 || purchase?.consumptionState === 1) return "not_paid";
        type = "product";
        productId = n.productId;
        accountId = purchase?.obfuscatedExternalAccountId;
    } else {
        return "ignored";
    }
    if (!/^[a-f0-9]{24}$/i.test(String(accountId || ""))) return "no_account";
    const user = await User.findById(accountId).select("-password").lean();
    if (!user) return "no_account";
    try {
        await verifyPlayPurchase({ user, type, productId, purchaseToken: n.token, io: await socketServer() });
        console.log(`[Google Play] ${type} ${productId} given to user ${accountId} from Google's notification`);
        return "granted";
    } catch (err) {
        if (err instanceof PlayError && FINAL_REFUSALS.has(err.body?.code || "")) {
            console.warn(`[Google Play] ${type} ${productId} for user ${accountId} not given (${err.body.code}): ${err.message}`);
            return "refused";
        }
        if (err instanceof PlayError && err.status === 400) {
            console.warn(`[Google Play] ${type} ${productId} for user ${accountId} not given: ${err.message}`);
            return "refused";
        }
        throw err;
    }
}

async function applyPlayNotification(n) {
    if (n.kind === "test") { console.log("[Google Play] test notification received"); return "test"; }
    if (n.kind === "voided") return applyVoidedPurchase({ purchaseToken: n.token, orderId: n.orderId, source: "rtdn" });
    if (!n.token) return "ignored";
    const row = await GooglePlayPurchase.findOne({ purchaseToken: n.token }).lean();
    // A purchase the phone has not sent yet: given from here (a replaced token is never given again: verify answers
    // with the plan the user has now)
    if (!row) return grantFromNotification(n);
    if (n.kind === "subscription") {
        const user = await User.findById(row.userId).select("plan name email phoneNumber role").lean();
        // (a replaced token, or a plan bought since elsewhere: nothing of this user's plan follows it any more)
        if (user?.plan?.billing !== "play" || user.plan.play_purchase_token !== n.token) return "not_current";
        const client = await requireClient();
        const purchase = await readSub(client, n.token);
        await syncPlaySubscription(user, { purchase, throwOnError: true });
        console.log(`[Google Play] ${n.type} applied for user ${row.userId}`);
        return "applied";
    }
    if (n.kind === "product" && n.type === "ONE_TIME_PRODUCT_CANCELED") {
        const client = await requireClient();
        const purchase = await askGoogle("product read", () => client.purchases.products.get({ packageName: PLAY_PACKAGE_NAME, productId: row.productId, token: n.token }));
        // purchaseState 1 = cancelled: a pack that was credited has its credits taken back
        if (purchase?.purchaseState === 1) return applyVoidedPurchase({ purchaseToken: n.token, orderId: purchase.orderId || row.orderId, source: "rtdn_canceled" });
        return "still_paid";
    }
    return "ignored";
}

/**
 * Whether a push really comes from Google's Pub/Sub for our subscription: its Authorization header carries a
 * Google-signed OIDC token for the audience in GOOGLE_PLAY_RTDN_AUDIENCE, issued to the service account in
 * GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT. Throws PlayError (503 not set up, 401 refused).
 */
export async function verifyPubSubPush(authorization) {
    const audience = String(process.env.GOOGLE_PLAY_RTDN_AUDIENCE || "").trim();
    const account = String(process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT || "").trim().toLowerCase();
    if (!audience || !account) throw new PlayError(503, "Google Play notifications are not set up on the server yet.", "rtdn_not_configured");
    const m = /^Bearer\s+(.+)$/i.exec(String(authorization || ""));
    if (!m) throw new PlayError(401, "Missing token.", "unauthorized");
    let payload;
    try {
        const { google } = await import("googleapis");
        const ticket = await new google.auth.OAuth2().verifyIdToken({ idToken: m[1], audience });
        payload = ticket.getPayload();
    } catch (err) {
        console.warn("[Google Play] notification token refused:", err.message);
        throw new PlayError(401, "Invalid token.", "unauthorized");
    }
    const issuerOk = payload?.iss === "https://accounts.google.com" || payload?.iss === "accounts.google.com";
    if (!issuerOk || payload?.email_verified !== true || String(payload?.email || "").toLowerCase() !== account) {
        throw new PlayError(401, "Invalid token.", "unauthorized");
    }
    return payload;
}

// ── The jobs ──

let jobsStarted = false;

/** The two Google Play jobs (workers/index.js): unfinished purchases every 30 minutes, voided purchases every day */
export async function initGooglePlayJobs() {
    if (jobsStarted) return;
    jobsStarted = true;
    const { default: nodeCron } = await import("node-cron");
    // One server process runs each job at a time (both processes start the workers)
    const once = async (name, seconds, fn) => {
        if (!playConfigured()) return;
        try {
            const got = await redis.set(`gplay:job:${name}`, String(process.pid), "EX", seconds, "NX").catch(() => "OK");
            if (got !== "OK") return;
            await fn();
        } catch (err) {
            console.error(`[Google Play] ${name} job failed:`, googleMessage(err));
        }
    };
    nodeCron.schedule("*/30 * * * *", () => once("retry", 25 * 60, retryUnfinished), { timezone: "Asia/Kolkata" });
    nodeCron.schedule("20 4 * * *", () => once("voided", 23 * 3600, syncVoidedPurchases), { timezone: "Asia/Kolkata" });
}
