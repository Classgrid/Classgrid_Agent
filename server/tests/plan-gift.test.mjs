// Gift a plan (owner, 2026-11-17: the super admin's Plans & Usage page). Checked here:
//   - giftEndDate: 1, 3, 6 or 12 months from now, or an end date in the future; anything else is refused
//   - setUserPlan (PUT /api/super-admin/ai-usage/users/:id/plan): a paid plan needs a reason; the reason is saved on
//     the plan (plan.note) and in the admin audit log ("user.plan_gift", with the plan, the end date and the reason);
//     the plan is "granted" (gifted) and the "You're on the Classgrid Pro plan" email goes out; moving back to Free
//     needs no reason, logs "user.plan_end" and sends no email
//   - planHistoryFor: the audit log rows as the user's plan history (newest first, with the reasons)
//   - listUsersInOrg: reads each user's plan and gives the plan in force now (planKey: an ended plan is Free)
//   - getUserUsageHistory: the user's history from the same code as their own Usage page; a bad id is refused
// The accounts, the plan table, the audit log, the history and the email sender are stand-ins: nothing is read from
// or written to a database, and no email is sent.
// Run: node --experimental-test-module-mocks --test tests/plan-gift.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const PLANS = {
    free: { key: "free", name: "Free", features_text: ["Classgrid AI for everyone"] },
    pro: { key: "pro", name: "Pro", features_text: ["Claude Sonnet, Opus and Haiku"] },
    max: { key: "max", name: "Max", features_text: ["Five times Pro"] },
};
const USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

// ── Stand-ins ──
const chain = (value) => { const q = { select: () => q, lean: () => q, sort: () => q, limit: () => q, populate: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: () => q }; return q; };
let account = null;
let saved = 0;
let listSelect = "";
let listRows = [];
const audit = [];
let auditRows = [];
const sesEmails = [];
const historyCalls = [];

mock.module("../src/models/User.js", {
    defaultExport: {
        findById: () => chain(() => account),
        find: () => { const q = chain(() => listRows); q.select = (fields) => { listSelect = fields; return q; }; return q; },
    },
});
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain({ plans_enabled: true }) } });
mock.module("../src/models/AiCreditTransaction.js", { defaultExport: { find: () => chain([]), aggregate: async () => [] } });
mock.module("../src/models/AdminAuditLog.js", {
    defaultExport: {
        create: async (doc) => { audit.push(doc); return doc; },
        find: (query) => chain(() => auditRows.filter((r) => r.targetId === query.targetId && query.action.$in.includes(r.action))),
    },
});
mock.module("../src/models/PlanConfig.js", {
    defaultExport: { findOne: (q) => chain(() => PLANS[q?.key] || null) },
    namedExports: { PLAN_KEYS: ["free", "pro", "max", "enterprise"], RESET_UNIT_ENUM: ["second", "minute", "hour", "day", "week", "month"], ensurePlanRows: async () => {} },
});
mock.module("../src/services/plan-limits.service.js", {
    namedExports: {
        forgetPlans: () => {},
        planTable: async () => ({ enabled: true, plans: PLANS }),
        planOf: async () => PLANS.free,
        isUnlimited: (v) => v === -1,
        // (the real rule: an ended or cancelled plan is Free)
        planKeyOf: (user) => {
            const p = user?.plan;
            if (!p?.id || p.id === "free") return "free";
            if (p.status && !["active", "past_due"].includes(p.status)) return "free";
            if (p.expires_at && new Date(p.expires_at).getTime() < Date.now()) return "free";
            return p.id;
        },
    },
});
mock.module("../src/services/aws-ses.service.js", { namedExports: { sendEmail: async (mail) => { sesEmails.push(mail); } } });
mock.module("../src/config/supabaseClient.js", { namedExports: { primarySupabaseClient: {} } });
mock.module("../src/controllers/ai-plan-overview.controller.js", {
    namedExports: {
        planOverviewFor: async () => null,
        usageHistoryFor: async (userId, query) => { historyCalls.push({ userId, query }); return { days: 14, events: [], perDay: [], total: { credits: 0, requests: 0 } }; },
    },
});

const { giftEndDate, setUserPlan } = await import("../src/controllers/super-admin/ai-plans.controller.js");
const { planHistoryFor, listUsersInOrg, getUserUsageHistory } = await import("../src/controllers/super-admin/ai-usage-users.controller.js");

const freshAccount = () => ({ _id: USER_ID, email: "asha@example.com", name: "Asha Rao", plan: { id: "free", status: "active", billing: "none" }, save: async () => { saved += 1; } });
const call = async (handler, { params = {}, body = {}, query = {} } = {}) => {
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await handler({ params, body, query, user: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Nikhil", email: "admin@example.com" }, app: { get: () => null }, headers: {}, ip: "127.0.0.1" }, res);
    await new Promise((r) => setTimeout(r, 30)); // (the audit log and the email go out after the reply)
    return res;
};
const reset = () => { account = freshAccount(); saved = 0; audit.length = 0; sesEmails.length = 0; };
const monthsLater = (from, n) => { const d = new Date(from); d.setMonth(d.getMonth() + n); return d; };

test("giftEndDate: 1, 3, 6 or 12 months from now, or a future end date", () => {
    const now = new Date("2026-11-17T10:00:00Z");
    for (const m of [1, 3, 6, 12]) assert.equal(giftEndDate({ months: m }, now).expiresAt.getTime(), monthsLater(now, m).getTime());
    assert.equal(giftEndDate({ months: "3" }, now).expiresAt.getTime(), monthsLater(now, 3).getTime());
    assert.ok(giftEndDate({ months: 2 }, now).error);
    assert.ok(giftEndDate({ months: 24 }, now).error);
    assert.equal(giftEndDate({ expires_at: "2027-01-31" }, now).expiresAt.toISOString().slice(0, 10), "2027-01-31");
    assert.ok(giftEndDate({ expires_at: "2026-11-01" }, now).error, "a past date is refused");
    assert.ok(giftEndDate({ expires_at: "not a date" }, now).error);
    assert.equal(giftEndDate({}, now).expiresAt, null, "no period: no end");
});

test("a paid plan without a reason is refused, and nothing is saved", async () => {
    reset();
    const res = await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "pro", months: 1, reason: "   " } });
    assert.equal(res.code, 400);
    assert.match(res.body.message, /why/i);
    assert.equal(saved, 0);
    assert.equal(audit.length, 0);
    assert.equal(sesEmails.length, 0);
});

test("an unknown plan or a bad period is refused", async () => {
    reset();
    assert.equal((await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "gold", months: 1, reason: "test" } })).code, 400);
    assert.equal((await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "pro", months: 5, reason: "test" } })).code, 400);
    assert.equal(saved, 0);
});

test("gifting Pro for 3 months: saved as a gift with the reason, logged, and emailed", async () => {
    reset();
    const before = Date.now();
    const res = await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "pro", months: 3, reason: "Thanks for the bug reports" } });
    assert.equal(res.code, 200);
    assert.equal(saved, 1);
    const plan = account.plan;
    assert.equal(plan.id, "pro");
    assert.equal(plan.billing, "granted");
    assert.equal(plan.status, "active");
    assert.equal(plan.note, "Thanks for the bug reports");
    assert.equal(plan.set_by, "admin@example.com");
    const want = monthsLater(new Date(before), 3).getTime();
    assert.ok(Math.abs(plan.expires_at.getTime() - want) < 5000, "ends 3 months from now");

    assert.equal(audit.length, 1);
    const log = audit[0];
    assert.equal(log.action, "user.plan_gift");
    assert.equal(log.actorRole, "super_admin");
    assert.equal(log.targetType, "user");
    assert.equal(log.targetId, USER_ID);
    assert.equal(log.metadata.plan, "pro");
    assert.equal(log.metadata.reason, "Thanks for the bug reports");
    assert.equal(log.previousState.id, "free");

    assert.equal(sesEmails.length, 1, "the plan email goes out");
    assert.equal(sesEmails[0].to, "asha@example.com");
    assert.match(sesEmails[0].subject, /Pro/);
});

test("gifting Max until a date: the end date is kept", async () => {
    reset();
    const end = new Date(Date.now() + 40 * 86400000).toISOString();
    const res = await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "max", expires_at: end, reason: "Partner account" } });
    assert.equal(res.code, 200);
    assert.equal(account.plan.id, "max");
    assert.equal(account.plan.expires_at.toISOString(), end);
    assert.equal(audit[0].metadata.expires_at.toISOString(), end);
});

test("back to Free: no reason needed, logged as an end, no email", async () => {
    reset();
    account.plan = { id: "pro", status: "active", billing: "granted" };
    const res = await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "free" } });
    assert.equal(res.code, 200);
    assert.equal(account.plan.id, "free");
    assert.equal(account.plan.billing, "none");
    assert.equal(account.plan.expires_at, null);
    assert.equal(audit[0].action, "user.plan_end");
    assert.equal(audit[0].previousState.id, "pro");
    assert.equal(sesEmails.length, 0);
});

test("the plan history: the audit log rows with their reasons", async () => {
    auditRows = [
        { targetId: USER_ID, action: "user.plan_gift", actorName: "Nikhil", createdAt: new Date("2026-11-17"), metadata: { plan: "max", expires_at: new Date("2027-02-17"), reason: "Partner account", set_by: "admin@example.com" } },
        { targetId: USER_ID, action: "user.plan_end", actorName: "Nikhil", createdAt: new Date("2026-11-10"), metadata: { plan: "free", reason: "", set_by: "" } },
        { targetId: "cccccccccccccccccccccccc", action: "user.plan_gift", createdAt: new Date(), metadata: { plan: "pro" } },
    ];
    const rows = await planHistoryFor(USER_ID);
    assert.equal(rows.length, 2, "only this user's rows");
    assert.deepEqual(rows[0], { at: new Date("2026-11-17"), action: "gift", plan: "max", expires_at: new Date("2027-02-17"), reason: "Partner account", by: "admin@example.com" });
    assert.equal(rows[1].action, "end");
    assert.equal(rows[1].by, "Nikhil", "without set_by, the actor's name");
});

test("the user list reads the plan and gives the plan in force now", async () => {
    listRows = [
        { _id: "a1", name: "Asha", email: "asha@example.com", role: "user", plan: { id: "pro", status: "active", billing: "granted", expires_at: new Date(Date.now() + 86400000) } },
        { _id: "a2", name: "Ravi", email: "ravi@example.com", role: "user", plan: { id: "max", status: "active", billing: "granted", expires_at: new Date(Date.now() - 86400000) } },
        { _id: "a3", name: "Meera", email: "meera@example.com", role: "user" },
    ];
    const res = await call(listUsersInOrg, { params: { orgId: "classgrid" } });
    assert.equal(res.code, 200);
    assert.match(listSelect, /\bplan\b/, "the plan is read");
    const users = res.body.data[0].users;
    assert.deepEqual(users.map((u) => u.planKey), ["pro", "free", "free"]);
    assert.equal(users[1].plan.id, "max", "the saved plan is still sent, for the ended plan's name");
});

test("the usage history: the same code as the user's own page; a bad id is refused", async () => {
    historyCalls.length = 0;
    const ok = await call(getUserUsageHistory, { params: { userId: USER_ID }, query: { days: "14", page: "2" } });
    assert.equal(ok.code, 200);
    assert.deepEqual(historyCalls, [{ userId: USER_ID, query: { days: "14", page: "2" } }]);
    const bad = await call(getUserUsageHistory, { params: { userId: "nope" } });
    assert.equal(bad.code, 400);
    assert.equal(historyCalls.length, 1);
});
