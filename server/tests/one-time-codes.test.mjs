// Every one-time code and one-time link lasts 10 minutes (owner, 2026-11-25: "make all 10 minutes, all means all").
// Checked here, with stand-ins in memory (nothing real is read, written or sent):
//   - the one number (utils/code-lifetime.js) is 10 minutes, and every email that states a code's time says 10
//   - the sign-up codes (services/signup-code.service.js): expired refused, five tries counted before the compare
//     (tries sent all at once too), used up once, the WhatsApp step check not used up and costing nothing when right
//   - the WhatsApp number code (services/whatsapp-code.service.js): kept 10 minutes, five tries, used up once
//   - the super admin security code (services/admin-security-code.service.js): 10 minutes, five tries, used up once,
//     an expired one refused, the code itself never in the log
//   - the desktop / editor sign-in hand-off (services/desktop-login-code.service.js): 10 minutes, taken in one step
//     (works once, also when two requests come at once), PKCE checked on what was taken
//   - the payment code (routes/billing-handoff.routes.js, routes/billing-checkout.routes.js): a resend gives a full
//     fresh 10 minutes and answers with the new end; tries counted in one step before the compare
//   - the demo payment session (routes/billing-demo.routes.js): 10 minutes, the email says 10 minutes, a send limit,
//     no code or link in the log
//   - the controllers that are too big to run here are read from the source: they use these pieces, store 10-minute
//     expiries, and write no code to the log
// Run: node --experimental-test-module-mocks --test tests/one-time-codes.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "a-secret-only-this-test-knows";
const TEN_MIN = 10 * 60 * 1000;
const src = (path) => fs.readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

// ── A small in-memory collection with the few query words these pieces use. Each call does its work before its
// first await, so one call is one atomic step, as a single-document database operation is. ──
const at = (row, path) => path.split(".").reduce((v, k) => (v === null || v === undefined ? undefined : v[k]), row);
const put = (row, path, value) => {
    const keys = path.split(".");
    let o = row;
    for (const k of keys.slice(0, -1)) { if (o[k] === null || typeof o[k] !== "object") o[k] = {}; o = o[k]; }
    o[keys[keys.length - 1]] = value;
};
const num = (v) => (v instanceof Date ? v.getTime() : v);
const matches = (row, filter = {}) => Object.entries(filter).every(([field, want]) => {
    if (field === "$or") return want.some((f) => matches(row, f));
    if (field === "$and") return want.every((f) => matches(row, f));
    const have = at(row, field);
    if (want && typeof want === "object" && !(want instanceof Date)) {
        if ("$in" in want) return want.$in.some((w) => String(w) === String(have));
        if ("$lt" in want && !(have !== null && have !== undefined && num(have) < num(want.$lt))) return false;
        if ("$lte" in want && !(have !== null && have !== undefined && num(have) <= num(want.$lte))) return false;
        if ("$gt" in want && !(have !== null && have !== undefined && num(have) > num(want.$gt))) return false;
        if ("$ne" in want && (have ?? null) === (want.$ne ?? null)) return false;
        return true;
    }
    if (want instanceof Date) return have instanceof Date && have.getTime() === want.getTime();
    return want === null ? have === null || have === undefined : String(have) === String(want);
});
const apply = (row, update) => {
    const plain = Object.fromEntries(Object.entries(update).filter(([k]) => !k.startsWith("$")));
    for (const [path, value] of Object.entries({ ...plain, ...(update.$set || {}) })) put(row, path, value);
    for (const [path, by] of Object.entries(update.$inc || {})) put(row, path, (Number(at(row, path)) || 0) + by);
};
const copy = (row) => (row ? structuredClone(row) : null);
const chain = (fn) => {
    const q = { select: () => q, lean: () => q, sort: () => q, then: (ok, bad) => Promise.resolve().then(fn).then(ok, bad), catch: (bad) => Promise.resolve().then(fn).catch(bad) };
    return q;
};
// (`defaults`: what the real schema fills in on create)
const collection = (defaults = {}) => {
    const rows = [];
    let n = 0;
    return {
        rows,
        reset() { rows.length = 0; },
        model: {
            create: async (doc) => { const row = { _id: `id${++n}`, ...structuredClone(defaults), ...structuredClone(doc) }; rows.push(row); return copy(row); },
            find: (filter) => chain(() => rows.filter((r) => matches(r, filter)).map(copy)),
            findOne: (filter) => chain(() => copy(rows.find((r) => matches(r, filter)))),
            findOneAndUpdate: (filter, update, options = {}) => {
                const row = rows.find((r) => matches(r, filter));
                const before = copy(row);
                if (row) apply(row, update);
                return chain(() => (row ? (options.returnDocument === "before" ? before : copy(row)) : null));
            },
            findByIdAndUpdate: (id, update) => {
                const row = rows.find((r) => r._id === String(id));
                if (row) apply(row, update);
                return chain(() => copy(row));
            },
            updateOne: (filter, update) => {
                const row = rows.find((r) => matches(r, filter));
                if (row) apply(row, update);
                return chain(() => ({ modifiedCount: row ? 1 : 0 }));
            },
            deleteOne: (filter) => {
                const i = rows.findIndex((r) => matches(r, filter));
                if (i >= 0) rows.splice(i, 1);
                return chain(() => ({ deletedCount: i >= 0 ? 1 : 0 }));
            },
            findOneAndDelete: (filter) => {
                const i = rows.findIndex((r) => matches(r, filter));
                const row = i >= 0 ? rows.splice(i, 1)[0] : null;
                return chain(() => copy(row));
            },
        },
    };
};

// ── A Redis stand-in: each command and each MULTI is one atomic step ──
function fakeRedis() {
    const store = new Map();
    const ttl = new Map();
    const core = {
        get: (k) => (store.has(k) ? store.get(k) : null),
        set: (k, v, ex, secs) => { store.set(k, String(v)); if (ex === "EX") ttl.set(k, secs); return "OK"; },
        del: (...ks) => { let n = 0; for (const k of ks.flat()) { if (store.delete(k)) n += 1; ttl.delete(k); } return n; },
        incr: (k) => { const v = (Number(store.get(k)) || 0) + 1; store.set(k, String(v)); return v; },
        expire: (k, s) => { ttl.set(k, s); return 1; },
    };
    const redis = { store, ttl };
    for (const [name, fn] of Object.entries(core)) redis[name] = async (...a) => fn(...a);
    redis.multi = () => {
        const ops = [];
        const m = {};
        for (const name of Object.keys(core)) m[name] = (...a) => { ops.push([name, a]); return m; };
        m.exec = async () => ops.map(([name, a]) => [null, core[name](...a)]);
        return m;
    };
    return redis;
}

// ── Everything the console is told, to see that no code reaches the log ──
const logged = [];
for (const how of ["log", "info", "warn", "error", "debug"]) {
    mock.method(console, how, (...args) => { logged.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, (k, v) => (v instanceof Error ? v.message : v)))).join(" ")); });
}
const neverLogged = (secret) => assert.equal(logged.some((line) => line.includes(String(secret))), false, `"${secret}" reached the log`);

// ── Stand-ins for the database models and the senders ──
const onboarding = collection();
const securityCodes = collection({ used: false, attempts: 0 }); // (models/AdminSecurityCode.js defaults)
const handoffs = collection();
const attempts = collection();
const orders = collection();
const invoices = collection();
mock.module("../src/models/OnboardingOTP.js", { defaultExport: onboarding.model });
mock.module("../src/models/AdminSecurityCode.js", { defaultExport: securityCodes.model });
mock.module("../src/models/BillingHandoff.js", { defaultExport: handoffs.model });
mock.module("../src/models/PaymentAttempt.js", { defaultExport: attempts.model });
mock.module("../src/models/PaymentOrder.js", { defaultExport: orders.model });
mock.module("../src/models/SaasInvoice.js", { defaultExport: invoices.model });
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(() => ({ _id: "org1", name: "Classgrid" })) } });
let demoUser = { _id: "u1", email: "asha@example.com" };
mock.module("../src/models/User.js", { defaultExport: { findOne: () => chain(() => demoUser) } });
const sent = [];
mock.module("../src/services/aws-ses.service.js", {
    namedExports: {
        sendEmail: async (email) => { sent.push(email); return { messageId: "1" }; },
        sendTemplateEmail: async (email) => { sent.push(email); return { messageId: "1" }; },
    },
});
mock.module("../src/services/razorpay.service.js", { defaultExport: { createPlatformOrderPaise: async () => ({ id: "order_1" }), createOrderPaise: async () => ({ id: "order_1" }) } });
const passThrough = (req, res, next) => next();
const otpSendLimiter = (req, res, next) => next();
mock.module("../src/middleware/rateLimiter.js", { namedExports: { generalLimiter: passThrough, otpSendLimiter, loginLimiter: passThrough } });
mock.module("../src/middleware/auth.middleware.js", { namedExports: { isAuthenticated: passThrough } });
mock.module("../src/services/pdf-invoice.service.js", { namedExports: { generateInvoicePdfBuffer: async () => null, generateAiReceiptPdfBuffer: async () => null } });
mock.module("../src/services/billing-payment-finalization.service.js", { namedExports: { finalizeCapturedPayment: async () => ({}) } });
mock.module("../src/services/fraud.service.js", { namedExports: { detectFraud: async () => ({}), parseUserAgent: () => ({}) } });
mock.module("../config/db.js", { defaultExport: async () => {} });

const life = await import("../src/utils/code-lifetime.js");
const { checkSignupCode } = await import("../src/services/signup-code.service.js");
const wa = await import("../src/services/whatsapp-code.service.js");
const admin = await import("../src/services/admin-security-code.service.js");
const handoff = await import("../src/services/desktop-login-code.service.js");
const templates = await import("../src/services/email-templates.service.js");
const { hashResetToken } = await import("../src/utils/reset-token.js");
const { hashHandoffToken, HANDOFF_TTL_MS } = await import("../src/services/billing-handoff.service.js");

const near = (date, ms, what) => assert.ok(Math.abs(new Date(date).getTime() - (Date.now() + ms)) < 5000, `${what}: ${new Date(date).toISOString()}`);
const routeHandler = (router, path) => {
    const layer = router.stack.find((l) => l.route?.path === path);
    assert.ok(layer, `route ${path}`);
    return layer.route.stack;
};
const call = async (handlers, req) => {
    const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    await handlers[handlers.length - 1].handle({ headers: {}, ip: "1.2.3.4", ...req }, res, () => {});
    return res;
};

test("one number: every code and link lasts 10 minutes", () => {
    assert.equal(life.CODE_TTL_MINUTES, 10);
    assert.equal(life.CODE_TTL_MS, TEN_MIN);
    assert.equal(life.CODE_TTL_SECONDS, 600);
    assert.equal(life.CODE_MAX_TRIES, 5);
    near(life.codeExpiresAt(), TEN_MIN, "codeExpiresAt");
    assert.equal(HANDOFF_TTL_MS, TEN_MIN, "the payment session");
    // The client and the phone app keep the same number
    const client = fs.readFileSync(new URL("../../client/src/lib/codeLifetime.ts", import.meta.url), "utf8");
    assert.match(client, /CODE_TTL_MINUTES = 10;/);
});

test("every email that states a code's or a link's time says 10 minutes", () => {
    const texts = {
        "new-device code": templates.getNewDeviceOtpHtml("Asha", "123456") + templates.getNewDeviceOtpPlainText("Asha", "123456"),
        "delete account code": templates.getDeleteAccountCodeHtml("Asha", "123456") + templates.getDeleteAccountCodePlainText("Asha", "123456"),
        "sign-up code": templates.getChatOtpEmailHtml("123456") + templates.getChatOtpEmailPlainText("123456"),
        "password reset link": templates.getPasswordResetEmailHtml("L") + templates.getPasswordResetEmailPlainText("L"),
        "sign-up link": templates.getVerificationEmailHtml("Asha", "L") + templates.getVerificationEmailPlainText("Asha", "L"),
        "super admin code": templates.getSuperAdminSecurityOtpHtml("A", "123456", "x") + templates.getSuperAdminSecurityOtpPlainText("A", "123456", "x"),
        "billing email code": templates.getBillingVerificationOtpHtml("O", "U", "123456") + templates.getBillingVerificationOtpPlainText("O", "U", "123456"),
    };
    for (const [what, text] of Object.entries(texts)) {
        assert.match(text, /10 minutes/, what);
        assert.doesNotMatch(text.replace(/<[^>]+>/g, ""), /\b(5|15|30|60) (minutes|seconds)\b|\b(1|24|48) hours?\b/, what);
    }
    assert.equal(templates.getOnboardingOtpEmailHtml, undefined, "the unused onboarding template is gone");
    // The payment code email's template states the time it is given, and it is given the constant
    assert.match(src("scripts/seed-notifications.js"), /textBody: "Your Classgrid payment code is \{\{otp\}\}\. It works for \{\{otp_expiry_minutes\}\} minutes\./);
    for (const file of ["routes/billing-handoff.routes.js", "controllers/ai-credits-topup.controller.js"]) {
        assert.match(src(file), /otp_expiry_minutes: CODE_TTL_MINUTES/, file);
    }
});

test("sign-up codes: an expired code is refused", async () => {
    onboarding.reset();
    await onboarding.model.create({ target: "a@example.com", type: "email", otp: "123456", attempts: 0, expires_at: new Date(Date.now() - 1) });
    assert.equal(await checkSignupCode({ target: "a@example.com", type: "email", code: "123456" }), "expired");
    assert.equal(onboarding.rows.length, 0, "the expired code is cleared away");
    assert.equal(await checkSignupCode({ target: "a@example.com", type: "email", code: "123456" }), "none");
});

test("sign-up codes: five tries, counted before the compare, also all at once; then the right code is refused", async () => {
    onboarding.reset();
    await onboarding.model.create({ target: "a@example.com", type: "email", otp: "123456", attempts: 0, expires_at: new Date(Date.now() + TEN_MIN) });
    const wrong = await Promise.all(Array.from({ length: 12 }, (_, i) => checkSignupCode({ target: "a@example.com", type: "email", code: String(200000 + i) })));
    assert.equal(wrong.filter((s) => s === "wrong").length, 5);
    assert.equal(wrong.filter((s) => s === "tries").length, 7);
    assert.equal(await checkSignupCode({ target: "a@example.com", type: "email", code: "123456" }), "tries", "the code is dead");
});

test("sign-up codes: the right code works once; the WhatsApp step check does not use it up", async () => {
    onboarding.reset();
    await onboarding.model.create({ target: "+919999999999", type: "phone", otp: "654321", attempts: 0, expires_at: new Date(Date.now() + TEN_MIN) });
    assert.equal(await checkSignupCode({ target: "+919999999999", type: "phone", code: "111111", use: false }), "wrong");
    assert.equal(await checkSignupCode({ target: "+919999999999", type: "phone", code: "654321", use: false }), "ok");
    assert.equal(onboarding.rows[0].attempts, 1, "only the wrong try counts");
    const both = await Promise.all([1, 2].map(() => checkSignupCode({ target: "+919999999999", type: "phone", code: "654321" })));
    assert.equal(both.filter((s) => s === "ok").length, 1, `two requests at once: one passes (${both})`);
    assert.equal(onboarding.rows.length, 0);
    // A code of another type for the same target is not this code
    await onboarding.model.create({ target: "+919999999999", type: "email", otp: "654321", attempts: 0, expires_at: new Date(Date.now() + TEN_MIN) });
    assert.equal(await checkSignupCode({ target: "+919999999999", type: "phone", code: "654321" }), "none");
});

test("sign-up and sign-in codes in the controller: 10 minutes, the shared check, no code in the log", () => {
    const auth = src("controllers/auth.controller.js");
    assert.match(auth, /const OTP_TTL_MS = CODE_TTL_MS;/);
    for (const call of [
        "checkSignupCode({ target: email.toLowerCase(), type: 'email', code: otp })",
        "checkSignupCode({ target: phone, type: 'phone', code: otp, use: false })",
        "checkSignupCode({ target: whatsappPhone, type: 'phone', code: whatsappOtp })",
    ]) assert.ok(auth.includes(call), call);
    assert.equal(/OTP was generated but not sent:', otp/.test(auth), false, "the WhatsApp code is not logged");
    // The new-device codes: 10 minutes from the constant, counted before the compare
    assert.equal((auth.match(/expiresAt: codeExpiresAt\(\)/g) || []).length >= 4, true);
    const verify = auth.slice(auth.indexOf("export const verifyDeviceOtp"), auth.indexOf("export const verifyDeviceOtp") + 4000);
    assert.ok(verify.indexOf("$inc: { failedAttempts: 1 }") < verify.indexOf("verification.otp !== String(otp)"), "counted before the compare");
    assert.match(verify, /failedAttempts: \{ \$lt: MAX_CODE_TRIES \}/);
    // The WhatsApp code texts say the time
    assert.match(auth, /is your verification code\. It works for \$\{CODE_TTL_MINUTES\} minutes\./);
    assert.match(src("routes/user.routes.js"), /is your Classgrid verification code\. It works for \$\{CODE_TTL_MINUTES\} minutes\./);
    // Password reset links: 10 minutes, kept as the sha256 the reset page looks for
    assert.match(auth, /user\.resetPasswordExpires = Date\.now\(\) \+ CODE_TTL_MS;/);
    assert.match(auth, /const hashedToken = hashResetToken\(token\);/);
    const superAdmin = src("routes/super-admin.routes.js");
    assert.match(superAdmin, /resetPasswordToken: hashResetToken\(token\), resetPasswordExpires: expires/);
    assert.match(superAdmin, /const expires = codeExpiresAt\(\);/);
    assert.doesNotMatch(superAdmin, /This link expires in 1 hour/);
    // The sign-up link
    assert.equal((auth.match(/expiresAt: codeExpiresAt\(\), \/\/ 10 minutes \(24 hours before/g) || []).length, 1);
    assert.match(auth, /verification\.expiresAt = codeExpiresAt\(\);/);
});

test("a super admin's reset link is found by the reset page (the stored token is its sha256)", () => {
    const raw = crypto.randomBytes(32).toString("hex");
    assert.equal(hashResetToken(raw), crypto.createHash("sha256").update(raw).digest("hex"));
    assert.notEqual(hashResetToken(raw), raw);
});

test("WhatsApp number code: kept 10 minutes, five tries counted in one step, used up once", async () => {
    const redis = fakeRedis();
    await wa.keepWhatsappCode(redis, "u1", { otp: "246810", phoneNumber: "+919999999999" });
    assert.equal(redis.ttl.get(wa.codeKey("u1")), 600);
    const tries = await Promise.all(Array.from({ length: 8 }, (_, i) => wa.checkWhatsappCode(redis, "u1", String(300000 + i))));
    assert.equal(tries.filter((t) => t.state === "wrong").length, 4);
    assert.ok(tries.every((t) => t.state === "wrong" || t.state === "tries"));
    assert.deepEqual((await wa.checkWhatsappCode(redis, "u1", "246810")).state, "none", "the fifth wrong try ended the code");

    await wa.keepWhatsappCode(redis, "u1", { otp: "246810", phoneNumber: "+919999999999" });
    assert.equal(redis.store.has(wa.triesKey("u1")), false, "a new code starts at zero tries");
    assert.deepEqual(await wa.checkWhatsappCode(redis, "u1", "111111"), { state: "wrong", left: 4 });
    const both = await Promise.all([1, 2].map(() => wa.checkWhatsappCode(redis, "u1", "246810")));
    assert.equal(both.filter((t) => t.state === "ok").length, 1, "works once");
    assert.equal(both.find((t) => t.state === "ok").phoneNumber, "+919999999999");
});

test("super admin security code: 10 minutes, five tries, used up once, an expired one refused, never logged", async () => {
    securityCodes.reset();
    logged.length = 0;
    assert.match(admin.makeSecurityCode(), /^\d{6}$/);
    const code = "975310";
    await admin.keepSecurityCode({ adminId: "admin1", email: "boss@example.com", code, action: "GENERAL_AI_MUTATION", orgId: null, planKey: null });
    near(securityCodes.rows[0].expiresAt, TEN_MIN, "kept");
    const wrong = await Promise.all(Array.from({ length: 7 }, (_, i) => admin.takeSecurityCode({ adminId: "admin1", typed: String(100000 + i) })));
    assert.equal(wrong.filter((t) => t.state === "wrong").length, 5);
    assert.equal(wrong.filter((t) => t.state === "tries").length, 2);
    assert.equal((await admin.takeSecurityCode({ adminId: "admin1", typed: code })).state, "tries", "dead after five");

    securityCodes.reset();
    const fresh = "135790";
    await admin.keepSecurityCode({ adminId: "admin1", email: "boss@example.com", code: fresh, action: "BLOCK_USER_AI", orgId: null, planKey: null });
    assert.equal((await admin.takeSecurityCode({ adminId: "admin2", typed: fresh })).state, "wrong", "another admin's code");
    const refused = await admin.takeSecurityCode({ adminId: "admin1", typed: fresh, accept: (c) => (c.action !== "GENERAL_AI_MUTATION" ? "Invalid action for this security code" : null) });
    assert.deepEqual(refused, { state: "refused", reason: "Invalid action for this security code" });
    const both = await Promise.all([1, 2].map(() => admin.takeSecurityCode({ adminId: "admin1", typed: fresh })));
    assert.equal(both.filter((t) => t.state === "ok").length, 1, "works once");

    securityCodes.reset();
    await securityCodes.model.create({ superAdminId: "admin1", code: "112233", used: false, attempts: 0, expiresAt: new Date(Date.now() - 1) });
    assert.equal((await admin.takeSecurityCode({ adminId: "admin1", typed: "112233" })).state, "wrong", "expired");
    neverLogged(code);
    neverLogged(fresh);
    const controller = src("controllers/super-admin/ai-credits-admin.controller.js");
    assert.doesNotMatch(controller, /trimmedCode|code: c\.code/, "the controller writes no code to the log");
    assert.match(controller, /getSuperAdminSecurityOtpHtml\(req\.user\.name \|\| "Admin", code, actionDescription, CODE_TTL_MINUTES\)/);
});

test("desktop and editor sign-in hand-off: 10 minutes, works once, PKCE checked on what was taken", async () => {
    const redis = fakeRedis();
    await handoff.saveLoginCode(redis, "abc", "/chat?token=t");
    assert.equal(redis.ttl.get(handoff.loginKey("abc")), 600);
    const both = await Promise.all([1, 2].map(() => handoff.takeLoginCode(redis, "abc")));
    assert.deepEqual(both.filter((t) => t.path).map((t) => t.path), ["/chat?token=t"], "two requests at once: one gets it");
    assert.equal((await handoff.takeLoginCode(redis, "abc")).error, "This sign-in link has expired. Please try again.");

    const verifier = "the-editor-secret";
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    await handoff.saveLoginCode(redis, "pk", "/editor/project?token=t", challenge);
    assert.equal(redis.ttl.get(handoff.pkceKey("pk")), 600);
    assert.equal((await handoff.takeLoginCode(redis, "pk", "someone-else")).error, "This sign-in code doesn't belong to this editor. Please sign in again.");
    assert.ok((await handoff.takeLoginCode(redis, "pk", verifier)).error, "a code that met a wrong verifier is used up");
    await handoff.saveLoginCode(redis, "pk2", "/editor/project?token=t", challenge);
    assert.deepEqual(await handoff.takeLoginCode(redis, "pk2", verifier), { path: "/editor/project?token=t" });
    // Both places that make these codes use it, and nothing sets a shorter life any more
    assert.match(src("controllers/auth.controller.js"), /await saveLoginCode\(redis, code, `\$\{target\}\$\{qs\}`\);/);
    const routes = src("routes/auth.routes.js");
    assert.match(routes, /await saveLoginCode\(redis, code, `\/editor\/project\?token=\$\{encodeURIComponent\(handed\)\}`, challenge\);/);
    assert.match(routes, /const taken = await takeLoginCode\(redis, code, String\(req\.body\?\.verifier \|\| ""\)\);/);
    assert.doesNotMatch(routes, /challenge \? 300 : 60/);
});

// ── The payment code ──
const { default: handoffRouter } = await import("../src/routes/billing-handoff.routes.js");
const { default: checkoutRouter } = await import("../src/routes/billing-checkout.routes.js");
const RAW = "raw-checkout-token";
const freshHandoff = async (over = {}) => {
    handoffs.reset();
    sent.length = 0;
    return handoffs.model.create({
        token: hashHandoffToken(RAW), email: "asha@example.com", otp: await bcrypt.hash("424242", 4), organization_id: "org1",
        paymentOrderId: "po1", paymentAttemptId: "pa1", razorpay_order_id: "order_1", amountPaise: 200, currency: "INR",
        razorpay_key_id: "key", return_url: "https://classgrid.in", context: { label: "Plan", payerName: "Asha" },
        verified: false, consumedAt: null, otpVerifiedAt: null, attempts: 0, lockoutUntil: null, resendCount: 0,
        lastOtpSentAt: new Date(Date.now() - 9 * 60 * 1000), expiresAt: new Date(Date.now() + 60 * 1000), ...over,
    });
};

test("payment code: a resend gives the code and its session a full fresh 10 minutes, and says when it ends", async () => {
    await freshHandoff();
    const res = await call(routeHandler(handoffRouter, "/resend-otp"), { body: { token: RAW } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    near(handoffs.rows[0].expiresAt, TEN_MIN, "the session's new end");
    assert.equal(new Date(res.body.data.expiresAt).getTime(), new Date(handoffs.rows[0].expiresAt).getTime(), "the screen is told the same end");
    assert.equal(handoffs.rows[0].resendCount, 1);
    assert.equal(handoffs.rows[0].attempts, 0);
    assert.equal(sent.at(-1).data.otp_expiry_minutes, 10, "the email says 10 minutes");
    neverLogged(sent.at(-1).data.otp);
    // Inside the minute's wait: refused, and the end does not move
    const end = handoffs.rows[0].expiresAt;
    const again = await call(routeHandler(handoffRouter, "/resend-otp"), { body: { token: RAW } });
    assert.equal(again.statusCode, 429);
    assert.equal(handoffs.rows[0].expiresAt, end);
});

test("payment code: a resend of a session that has run out is refused", async () => {
    await freshHandoff({ expiresAt: new Date(Date.now() - 1) });
    const res = await call(routeHandler(handoffRouter, "/resend-otp"), { body: { token: RAW } });
    assert.equal(res.statusCode, 404);
});

test("payment code: three tries, counted before the compare (also all at once), then locked", async () => {
    await freshHandoff();
    const handlers = routeHandler(checkoutRouter, "/verify-otp");
    const answers = await Promise.all(Array.from({ length: 6 }, (_, i) => call(handlers, { body: { token: RAW, otp: String(500000 + i) } })));
    assert.equal(answers.filter((r) => r.statusCode === 400).length, 3, answers.map((r) => r.statusCode).join(","));
    assert.equal(answers.filter((r) => r.statusCode === 429).length, 3);
    const right = await call(handlers, { body: { token: RAW, otp: "424242" } });
    assert.equal(right.statusCode, 429, "the right code after three wrong tries is refused");

    await freshHandoff();
    const ok = await call(handlers, { body: { token: RAW, otp: "424242" } });
    assert.equal(ok.statusCode, 200, JSON.stringify(ok.body));
    const twice = await call(handlers, { body: { token: RAW, otp: "424242" } });
    assert.notEqual(twice.statusCode, 200, "works once");
});

test("demo payment session: 10 minutes, the email says 10 minutes, a send limit, no code or link in the log", async () => {
    const { default: demoRouter } = await import("../src/routes/billing-demo.routes.js");
    handoffs.reset();
    sent.length = 0;
    logged.length = 0;
    const handlers = routeHandler(demoRouter, "/session");
    assert.ok(handlers.some((l) => l.handle === otpSendLimiter), "the session send has the code-send limit");
    const res = await call(handlers, { body: { email: "asha@example.com" } });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    near(handoffs.rows[0].expiresAt, TEN_MIN, "the demo session");
    const email = sent.at(-1);
    assert.match(email.html, /This code will expire in 10 minutes\./);
    assert.match(email.text, /This code will expire in 10 minutes\./);
    assert.doesNotMatch(email.html + email.text, /60 seconds|48 hours|48-hour/);
    const code = email.text.match(/code is (\d{6})/)[1];
    neverLogged(code);
    neverLogged(new URL(res.body.data.checkout_url).searchParams.get("token"));
    assert.doesNotMatch(src("routes/billing-demo.routes.js"), /DEMO_48H|OTP=123456/);
});

test("template emails keep the code out of their log rows", () => {
    assert.deepEqual(life.withoutCodeValue({ otp: "123456", amount: "₹2" }), { amount: "₹2" });
    assert.deepEqual(life.withoutCodeValue({ amount: "₹2" }), { amount: "₹2" });
    for (const file of ["services/aws-ses.service.js", "services/sms.service.js"]) {
        const text = src(file);
        assert.doesNotMatch(text, /metadata: data\b|\.\.\.data \}/, file);
    }
});

test("added email code: 10 minutes, said in the email and the answer", () => {
    const c = src("controllers/account-emails.controller.js");
    assert.match(c, /import \{ CODE_TTL_MINUTES, CODE_TTL_MS \} from "\.\.\/utils\/code-lifetime\.js";/);
    assert.match(c, /The code works for \$\{CODE_TTL_MINUTES\} minutes\./);
    assert.match(c, /expires_in_minutes: CODE_TTL_MINUTES/);
    assert.doesNotMatch(c, /15 \* 60 \* 1000|15 minutes|expires_in_minutes: 15/);
});
