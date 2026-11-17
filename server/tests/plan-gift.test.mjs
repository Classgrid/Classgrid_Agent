// Gift a plan (owner, 2026-11-17: the super admin's Plans & Usage page). Checked here:
//   - giftEndDate: 1, 3, 6 or 12 months from now, or an end date in the future; anything else is refused
//   - setUserPlan (PUT /api/super-admin/ai-usage/users/:id/plan): a paid plan needs a reason; the reason is saved on
//     the plan (plan.note) and in the admin audit log ("user.plan_gift", with the plan, the end date and the reason);
//     the plan is "granted" (gifted) and the "You're on the Classgrid Pro plan" email goes out; moving back to Free
//     needs no reason, logs "user.plan_end" and sends no email; a bad id and a "coming soon" plan are refused; every
//     open Plans & Usage page is told to refresh
//   - planHistoryFor: the audit log rows as the user's plan history (newest first by the log's `timestamp`, with the
//     reasons), plus the current gift from the plan itself when the log has no row for it
//   - listUsersInOrg: reads each user's plan and gives the plan in force now (planKey: an ended plan is Free)
//   - getUserUsageHistory: the user's history from the same code as their own Usage page; a bad id is refused
//   - the people list (GET /people): the filter (search, plan, bought or gifted), the page size, and each row
//   - the plans summary (GET /plans/summary): every plan row with its counts, and the staff total
//   - the person page's payments and WhatsApp call counts
// The accounts, the plan table, the audit log, the history and the email sender are stand-ins: nothing is read from
// or written to a database, and no email is sent.
// Run: node --experimental-test-module-mocks --test tests/plan-gift.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const PLANS = {
    free: { key: "free", name: "Free", features_text: ["Classgrid AI for everyone"] },
    pro: { key: "pro", name: "Pro", features_text: ["Claude Sonnet, Opus and Haiku"], calls_per_day: 3, calls_per_week: -1 },
    max: { key: "max", name: "Max", features_text: ["Five times Pro"] },
    enterprise: { key: "enterprise", name: "Enterprise", coming_soon: true },
};
const USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const HOUR = 3600000;
const DAY = 24 * HOUR;

// ── Stand-ins ──
const chain = (value) => { const q = { select: () => q, lean: () => q, sort: () => q, skip: () => q, limit: () => q, populate: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: () => q }; return q; };
let account = null;
let saved = 0;
let listSelect = "";
let listRows = [];
let lastFind = null;
let countValue = 0;
let aggregateGroups = [];
let lastPipeline = null;
let auditSort = null;
const audit = [];
let auditRows = [];
const sesEmails = [];
const historyCalls = [];
const orgFinds = [];

mock.module("../src/models/User.js", {
    defaultExport: {
        findById: () => chain(() => account),
        find: (filter) => {
            lastFind = { filter };
            const q = chain(() => listRows);
            q.select = (fields) => { listSelect = fields; lastFind.select = fields; return q; };
            q.sort = (s) => { lastFind.sort = s; return q; };
            q.skip = (n) => { lastFind.skip = n; return q; };
            q.limit = (n) => { lastFind.limit = n; return q; };
            return q;
        },
        countDocuments: async () => countValue,
        aggregate: async (pipeline) => { lastPipeline = pipeline; return aggregateGroups; },
    },
});
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain({ plans_enabled: true }) } });
mock.module("../src/models/Organization.js", { defaultExport: { find: (q) => { orgFinds.push(q); return chain([]); } } });
mock.module("../src/models/AiCreditTransaction.js", { defaultExport: { find: () => chain([]), aggregate: async () => [] } });
mock.module("../src/models/AdminAuditLog.js", {
    defaultExport: {
        create: async (doc) => { audit.push(doc); return doc; },
        // (applies the sort it is given, like Mongo: a field the rows do not have leaves them in their stored order)
        find: (query) => {
            let sortSpec = null;
            const q = chain(() => {
                let rows = auditRows.filter((r) => r.targetId === query.targetId && query.action.$in.includes(r.action));
                if (sortSpec) {
                    const [[field, dir]] = Object.entries(sortSpec);
                    rows = [...rows].sort((a, b) => dir * ((a[field] ? new Date(a[field]).getTime() : 0) - (b[field] ? new Date(b[field]).getTime() : 0)));
                }
                return rows;
            });
            q.sort = (s) => { sortSpec = s; auditSort = s; return q; };
            return q;
        },
    },
});
const PLAN_ROWS = [{ key: "free", name: "Free", sort: 0 }, { key: "pro", name: "Pro", sort: 1 }, { key: "max", name: "Max", sort: 2 }, { key: "enterprise", name: "Enterprise", sort: 3, coming_soon: true, is_public: false }];
mock.module("../src/models/PlanConfig.js", {
    defaultExport: { findOne: (q) => chain(() => PLANS[q?.key] || null), find: () => chain(() => PLAN_ROWS) },
    namedExports: { PLAN_KEYS: ["free", "pro", "max", "enterprise"], RESET_UNIT_ENUM: ["second", "minute", "hour", "day", "week", "month"], ensurePlanRows: async () => {} },
});
mock.module("../src/services/plan-limits.service.js", {
    namedExports: {
        forgetPlans: () => {},
        planTable: async () => ({ enabled: true, plans: PLANS }),
        planOf: async (user) => (user?.plan?.id === "pro" ? PLANS.pro : PLANS.free),
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
// The session window: 5 hours from window_start (the real tokenWindowEnd's rule for a started window); "no limit"
// for one test account
mock.module("../src/services/ai-credits.service.js", {
    namedExports: {
        freeWindow: async (user) => ({ limit: user.email === "nolimit@example.com" ? Infinity : 100000, periodMs: 5 * HOUR, weekCap: null, planKey: null }),
        tokenWindowEnd: (tokens, periodMs) => (tokens?.window_start ? new Date(tokens.window_start).getTime() + periodMs : 0),
    },
});
mock.module("../src/services/call-limits.service.js", {
    namedExports: {
        DAY_MS: DAY, WEEK_MS: 7 * DAY, MONTH_MS: 30 * DAY,
        callTimesSince: async () => [],
        planNumber: (v) => { if (v === undefined || v === null || v === "") return null; const n = Number(v); return !Number.isFinite(n) || n < 0 ? null : Math.floor(n); },
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
const {
    planHistoryFor, listUsersInOrg, getUserUsageHistory, peopleFilter, pageParams, personRow, listPeople,
    summaryFromGroups, getPlansSummary, paymentRow, callCountsFrom,
} = await import("../src/controllers/super-admin/ai-usage-users.controller.js");
const { finishedAccountsMatch } = await import("../src/utils/chat-onboarding.js");

const freshAccount = () => ({ _id: USER_ID, email: "asha@example.com", name: "Asha Rao", plan: { id: "free", status: "active", billing: "none" }, save: async () => { saved += 1; } });
const call = async (handler, { params = {}, body = {}, query = {}, io = null } = {}) => {
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await handler({ params, body, query, user: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Nikhil", email: "admin@example.com" }, app: { get: () => io }, headers: {}, ip: "127.0.0.1" }, res);
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
    // (the log keeps its time in `timestamp`; it has no createdAt)
    auditRows = [
        { targetId: USER_ID, action: "user.plan_gift", actorName: "Nikhil", timestamp: new Date("2026-11-17"), metadata: { plan: "max", expires_at: new Date("2027-02-17"), reason: "Partner account", set_by: "admin@example.com" } },
        { targetId: USER_ID, action: "user.plan_end", actorName: "Nikhil", timestamp: new Date("2026-11-10"), metadata: { plan: "free", reason: "", set_by: "" } },
        { targetId: "cccccccccccccccccccccccc", action: "user.plan_gift", timestamp: new Date(), metadata: { plan: "pro" } },
    ];
    const rows = await planHistoryFor(USER_ID);
    assert.equal(rows.length, 2, "only this user's rows");
    assert.deepEqual(rows[0], { at: "2026-11-17T00:00:00.000Z", action: "gift", plan: "max", expires_at: "2027-02-17T00:00:00.000Z", reason: "Partner account", by: "admin@example.com", saved_on_plan: false });
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

// ── Gifts: the checks added for the Plans & Usage page ──

test("setUserPlan: a bad user id is a 400, not a server error, and nothing is saved", async () => {
    reset();
    const res = await call(setUserPlan, { params: { userId: "nope" }, body: { planId: "pro", months: 1, reason: "test" } });
    assert.equal(res.code, 400);
    assert.deepEqual(res.body, { success: false, message: "Invalid user ID." });
    assert.equal(saved, 0);
});

test("setUserPlan: a coming soon plan, or a plan with no row, cannot be given", async () => {
    reset();
    const soon = await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "enterprise", months: 1, reason: "test" } });
    assert.equal(soon.code, 400);
    assert.equal(soon.body.message, "This plan is not open yet.");
    const maxRow = PLANS.max;
    delete PLANS.max;
    try {
        const missing = await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "max", months: 1, reason: "test" } });
        assert.equal(missing.code, 400);
        assert.equal(missing.body.message, "This plan is not open yet.");
    } finally { PLANS.max = maxRow; }
    assert.equal(saved, 0);
    assert.equal(audit.length, 0);
});

test("setUserPlan: every open Plans & Usage page is told to refresh", async () => {
    reset();
    const emitted = [];
    const io = { to: (room) => ({ emit: (event) => emitted.push(`${room} ${event}`) }) };
    const res = await call(setUserPlan, { params: { userId: USER_ID }, body: { planId: "pro", months: 1, reason: "test" }, io });
    assert.equal(res.code, 200);
    assert.ok(emitted.includes("superadmin:ai_usage ai_usage_updated"));
    assert.ok(emitted.includes(`${USER_ID} plan_update`), "the person's own app still hears about it");
});

// ── The plan history ──

test("planHistoryFor: sorted by the log's timestamp, newest first, dated by it", async () => {
    auditSort = null;
    auditRows = [
        { targetId: USER_ID, action: "user.plan_end", actorName: "Nikhil", timestamp: new Date("2026-11-01T08:00:00Z"), metadata: { plan: "free" } },
        { targetId: USER_ID, action: "user.plan_gift", actorName: "Nikhil", timestamp: new Date("2026-11-20T08:00:00Z"), metadata: { plan: "pro", reason: "Second" } },
        { targetId: USER_ID, action: "user.plan_gift", actorName: "Nikhil", timestamp: new Date("2026-10-15T08:00:00Z"), metadata: { plan: "max", reason: "First" } },
    ];
    const rows = await planHistoryFor(USER_ID);
    assert.deepEqual(auditSort, { timestamp: -1 });
    assert.deepEqual(rows.map((r) => r.at), ["2026-11-20T08:00:00.000Z", "2026-11-01T08:00:00.000Z", "2026-10-15T08:00:00.000Z"]);
    assert.ok(rows.every((r) => r.saved_on_plan === false));
});

test("planHistoryFor: a gift from before the log was kept comes from the plan itself", async () => {
    auditRows = [{ targetId: USER_ID, action: "user.plan_end", actorName: "Nikhil", timestamp: new Date("2026-10-01T00:00:00Z"), metadata: { plan: "free" } }];
    const plan = { id: "pro", status: "active", billing: "granted", started_at: new Date("2026-11-05T00:00:00Z"), expires_at: new Date("2026-12-05T00:00:00Z"), set_by: "old@example.com", note: "Beta tester" };
    const rows = await planHistoryFor(USER_ID, plan);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], { at: "2026-11-05T00:00:00.000Z", action: "gift", plan: "pro", expires_at: "2026-12-05T00:00:00.000Z", reason: "Beta tester", by: "old@example.com", saved_on_plan: true });
    assert.equal(rows[1].action, "end", "still newest first");

    // The log has this gift: no extra row
    auditRows.push({ targetId: USER_ID, action: "user.plan_gift", actorName: "Nikhil", timestamp: new Date("2026-11-05T00:00:01Z"), metadata: { plan: "pro", reason: "Beta tester" } });
    assert.ok((await planHistoryFor(USER_ID, plan)).every((r) => !r.saved_on_plan));

    // A bought plan is not a gift: no extra row
    auditRows = [];
    assert.deepEqual(await planHistoryFor(USER_ID, { ...plan, billing: "prepaid_yearly" }), []);
});

// ── The people list ──

const parts = (filter) => filter.$and;
const searchPart = (filter) => parts(filter).find((p) => p.$or && p.$or.some((o) => o.name));

test("peopleFilter: finished sign-ups that are not deleted, and the search is literal text", () => {
    const now = new Date("2026-11-17T10:00:00Z");
    const f = peopleFilter({ q: "  a.b(  " }, now);
    assert.deepEqual(parts(f)[0], finishedAccountsMatch(), "the same rule as Global Users, inside $and");
    assert.deepEqual(parts(f)[1], { status: { $ne: "deleted" } });
    const re = searchPart(f).$or[0].name;
    assert.equal(re.source, "a\\.b\\(");
    assert.equal(re.flags, "i");
    assert.ok(re.test("A.B("), "case does not matter");
    assert.ok(!re.test("axb("), "a dot is a dot");
    assert.equal(searchPart(f).$or.length, 2, "name or email");

    const byId = peopleFilter({ q: "64b7f0c2a1b2c3d4e5f60718" }, now);
    assert.equal(String(searchPart(byId).$or[2]._id), "64b7f0c2a1b2c3d4e5f60718", "an id also matches the account");

    const long = peopleFilter({ q: "x".repeat(150) }, now);
    assert.equal(searchPart(long).$or[0].name.source.length, 100, "cut to 100 characters");
    assert.equal(parts(peopleFilter({ q: "   " }, now)).length, 2, "an empty search adds nothing");
});

test("peopleFilter: the plan in force, Free, and bought or gifted", () => {
    const now = new Date("2026-11-17T10:00:00Z");
    const pro = parts(peopleFilter({ plan: "pro" }, now))[2];
    assert.equal(pro["plan.id"], "pro");
    assert.deepEqual(pro.$and[0].$or[2], { "plan.status": { $in: ["active", "past_due"] } });
    assert.deepEqual(pro.$and[1].$or[2], { "plan.expires_at": { $gt: now } });
    assert.deepEqual(pro.$and[1].$or[0], { "plan.expires_at": { $exists: false } });

    const free = parts(peopleFilter({ plan: "free", how: "gifted" }, now));
    assert.equal(free.length, 3, "how means nothing for Free");
    assert.deepEqual(free[2].$nor[0]["plan.id"], { $in: ["pro", "max", "enterprise"] });

    const paid = parts(peopleFilter({ plan: "paid" }, now));
    assert.deepEqual(paid[2]["plan.id"], { $in: ["pro", "max", "enterprise"] });

    const gifted = parts(peopleFilter({ how: "gifted" }, now));
    assert.deepEqual(gifted[2]["plan.id"], { $in: ["pro", "max", "enterprise"] }, "a how filter alone means a paid plan in force");
    assert.deepEqual(gifted[3], { "plan.billing": "granted" });
    assert.deepEqual(parts(peopleFilter({ plan: "max", how: "bought" }, now))[3], { "plan.billing": { $ne: "granted" } });
    assert.equal(parts(peopleFilter({}, now)).length, 2, "all plans: no plan part");
});

test("peopleFilter: an unknown filter is an error", () => {
    assert.deepEqual(peopleFilter({ plan: "gold" }), { error: "Unknown plan filter." });
    assert.deepEqual(peopleFilter({ plan: ["pro", "max"] }), { error: "Unknown plan filter." });
    assert.deepEqual(peopleFilter({ how: "stolen" }), { error: "Unknown filter." });
});

test("pageParams: page 1 or more, limit 1 to 100 (default 25)", () => {
    assert.deepEqual(pageParams({}), { page: 1, limit: 25 });
    assert.deepEqual(pageParams({ page: "3", limit: "500" }), { page: 3, limit: 100 });
    assert.deepEqual(pageParams({ page: "-2", limit: "0" }), { page: 1, limit: 1 });
    assert.deepEqual(pageParams({ page: "abc", limit: "abc" }), { page: 1, limit: 25 });
});

test("personRow: the plan in force or ended, bought or gifted", () => {
    const now = Date.now();
    const ctx = { now, plans: PLANS, window: { limit: 100000, end: 0 } };
    const gifted = personRow({ _id: "u1", name: "Asha", email: "asha@example.com", plan: { id: "pro", status: "active", billing: "granted", started_at: new Date(now - DAY), expires_at: new Date(now + 10 * DAY) } }, ctx);
    assert.equal(gifted.plan.key, "pro");
    assert.equal(gifted.plan.name, "Pro");
    assert.equal(gifted.plan.how, "gifted");
    assert.equal(gifted.plan.billing, "granted");
    assert.equal(gifted.plan.expires_at, new Date(now + 10 * DAY).toISOString());
    assert.equal(gifted.plan.ended, null);

    const bought = personRow({ _id: "u2", email: "b@example.com", plan: { id: "max", status: "past_due", billing: "prepaid_yearly", started_at: new Date(now - DAY) } }, ctx);
    assert.equal(bought.plan.how, "bought");
    assert.equal(bought.plan.expires_at, null, "no end date");

    const ran = personRow({ _id: "u3", email: "c@example.com", plan: { id: "max", status: "active", billing: "manual_monthly", started_at: new Date(now - 40 * DAY), expires_at: new Date(now - 2 * DAY) } }, ctx);
    assert.equal(ran.plan.key, "free");
    assert.equal(ran.plan.name, "Free");
    assert.equal(ran.plan.how, "free");
    assert.equal(ran.plan.started_at, null);
    assert.equal(ran.plan.expires_at, null);
    assert.deepEqual(ran.plan.ended, { key: "max", name: "Max", at: new Date(now - 2 * DAY).toISOString() });

    const cancelled = personRow({ _id: "u4", email: "d@example.com", plan: { id: "pro", status: "cancelled", billing: "granted", expires_at: new Date(now + 5 * DAY) } }, ctx);
    assert.deepEqual(cancelled.plan.ended, { key: "pro", name: "Pro", at: null }, "a future date is not when it ended");

    const none = personRow({ _id: "u5", email: "e@example.com" }, ctx);
    assert.equal(none.plan.key, "free");
    assert.equal(none.plan.billing, "none");
    assert.equal(none.plan.ended, null);
    assert.equal(none.name, "");
});

test("personRow: the session, the photo and staff", () => {
    const now = Date.now();
    const user = { _id: "u1", email: "asha@example.com", profilePicture: "https://img/a.png", platformLogo: "https://img/b.png", ai_tokens: { used_this_week: 1200, is_ai_blocked: true } };
    const live = personRow(user, { now, plans: PLANS, window: { limit: 50000, end: now + HOUR } });
    assert.deepEqual(live.session, { used: 1200, limit: 50000, resetAt: new Date(now + HOUR).toISOString() });
    assert.equal(live.photo, "https://img/a.png");
    assert.equal(live.blocked, true);
    assert.equal(live.staff, false);

    const over = personRow(user, { now, plans: PLANS, window: { limit: 50000, end: now - 1 } });
    assert.deepEqual(over.session, { used: 0, limit: 50000, resetAt: null }, "a window that ran out counts nothing");
    const notStarted = personRow(user, { now, plans: PLANS, window: { limit: 50000, end: 0 } });
    assert.deepEqual(notStarted.session, { used: 0, limit: 50000, resetAt: null });
    assert.equal(personRow(user, { now, plans: PLANS, window: { limit: Infinity, end: 0 } }).session.limit, -1, "no limit");
    assert.equal(personRow(user, { now, plans: PLANS, window: { limit: 0, end: 0 } }).session.limit, 0, "not included");

    assert.equal(personRow({ _id: "u2", email: "x@example.com", platformLogo: "https://img/b.png" }, { now }).photo, "https://img/b.png");
    assert.equal(personRow({ _id: "u3", email: "x@example.com" }, { now }).photo, null);
    assert.equal(personRow({ _id: "u4", email: "Team@Classgrid.in" }, { now }).staff, true);
    assert.equal(personRow({ _id: "u5", email: "x@example.com", role: "super_admin" }, { now }).staff, true);
});

test("GET /people: one page, newest first, with the count and the rows", async () => {
    const now = Date.now();
    orgFinds.length = 0;
    listRows = [
        { _id: "u1", name: "Asha", email: "asha@example.com", role: "user", organization_id: "6ac4b95e0f8a97f45e98b0ff", plan: { id: "pro", status: "active", billing: "granted" }, ai_tokens: { used_this_week: 500, window_start: new Date(now - HOUR) } },
        { _id: "u2", name: "", email: "nolimit@example.com", role: "user", organization_id: "6ac4b95e0f8a97f45e98b0ff" },
    ];
    countValue = 52;
    const res = await call(listPeople, { query: { plan: "all", page: "2", limit: "25" } });
    assert.equal(res.code, 200);
    assert.deepEqual(lastFind.sort, { createdAt: -1, _id: -1 });
    assert.equal(lastFind.skip, 25);
    assert.equal(lastFind.limit, 25);
    assert.match(lastFind.select, /ai_tokens\.used_this_week/);
    assert.doesNotMatch(lastFind.select, /\bpassword\b/);
    assert.equal(orgFinds.length, 1, "the page's organizations are read once");
    assert.deepEqual(orgFinds[0]._id.$in, ["6ac4b95e0f8a97f45e98b0ff"]);
    const { data, total, page, limit, pages, asOf } = res.body;
    assert.deepEqual({ total, page, limit, pages }, { total: 52, page: 2, limit: 25, pages: 3 });
    assert.ok(!Number.isNaN(Date.parse(asOf)));
    assert.equal(data[0].plan.how, "gifted");
    assert.equal(data[0].session.used, 500);
    assert.equal(data[0].session.limit, 100000);
    assert.equal(data[1].session.limit, -1);
    assert.equal(data[1].session.resetAt, null);

    countValue = 0;
    listRows = [];
    const empty = await call(listPeople, { query: {} });
    assert.equal(empty.body.pages, 1, "at least one page");

    const bad = await call(listPeople, { query: { plan: "gold" } });
    assert.equal(bad.code, 400);
    assert.deepEqual(bad.body, { success: false, error: "Unknown plan filter." });
    assert.equal((await call(listPeople, { query: { how: "x" } })).body.error, "Unknown filter.");
});

// ── The plans summary ──

test("summaryFromGroups: every plan row with its counts, and the staff total", () => {
    const groups = [
        { _id: { key: "free", how: "free" }, people: 10, endingSoon: 0, staff: 2 },
        { _id: { key: "pro", how: "gifted" }, people: 3, endingSoon: 1, staff: 0 },
        { _id: { key: "pro", how: "bought" }, people: 2, endingSoon: 1, staff: 1 },
    ];
    const s = summaryFromGroups(groups, PLAN_ROWS, true);
    assert.equal(s.enabled, true);
    assert.equal(s.total, 15);
    assert.equal(s.staff, 3);
    assert.deepEqual(s.plans.map((p) => p.key), ["free", "pro", "max", "enterprise"], "in sort order, with empty plans");
    assert.deepEqual(s.plans[0], { key: "free", name: "Free", sort: 0, coming_soon: false, is_public: true, people: 10, bought: 0, gifted: 0, endingSoon: 0 });
    assert.deepEqual(s.plans[1], { key: "pro", name: "Pro", sort: 1, coming_soon: false, is_public: true, people: 5, bought: 2, gifted: 3, endingSoon: 2 });
    assert.deepEqual(s.plans[2], { key: "max", name: "Max", sort: 2, coming_soon: false, is_public: true, people: 0, bought: 0, gifted: 0, endingSoon: 0 });
    assert.equal(s.plans[3].coming_soon, true);
    assert.equal(s.plans[3].is_public, false);

    const nobody = summaryFromGroups([], PLAN_ROWS, false);
    assert.equal(nobody.total, 0);
    assert.equal(nobody.plans.length, 4);
    assert.equal(nobody.enabled, false);
});

test("GET /plans/summary: one aggregate over finished sign-ups, merged with the plan rows", async () => {
    aggregateGroups = [{ _id: { key: "max", how: "bought" }, people: 4, endingSoon: 0, staff: 0 }];
    const res = await call(getPlansSummary);
    assert.equal(res.code, 200);
    assert.deepEqual(lastPipeline[0].$match.$and[0], finishedAccountsMatch());
    assert.deepEqual(lastPipeline[0].$match.$and[1], { status: { $ne: "deleted" } });
    assert.equal(res.body.enabled, true);
    assert.equal(res.body.total, 4);
    assert.equal(res.body.plans.find((p) => p.key === "max").bought, 4);
    assert.ok(!Number.isNaN(Date.parse(res.body.asOf)));
});

// ── The person page: payments and calls ──

test("paymentRow: a plan payment and a top-up", () => {
    const plan = paymentRow({ _id: "t1", type: "plan", plan_key: "pro", plan_term: "year", amount_inr: 3999, credits_added: 0, status: "success", plan_period_start: new Date("2026-11-01T00:00:00Z"), plan_period_end: new Date("2027-11-01T00:00:00Z"), razorpay_payment_id: "pay_1", paymentTime: new Date("2026-11-01T05:00:00Z"), createdAt: new Date("2026-11-01T05:01:00Z") });
    assert.deepEqual(plan, { id: "t1", at: "2026-11-01T05:00:00.000Z", kind: "plan", plan_key: "pro", plan_term: "year", amount_inr: 3999, credits_added: 0, status: "success", period_start: "2026-11-01T00:00:00.000Z", period_end: "2027-11-01T00:00:00.000Z", payment_id: "pay_1" });
    const topup = paymentRow({ _id: "t2", type: "topup", amount_inr: 100, credits_added: 300000, status: "pending", createdAt: new Date("2026-11-02T00:00:00Z"), plan_term: "year" });
    assert.deepEqual(topup, { id: "t2", at: "2026-11-02T00:00:00.000Z", kind: "topup", plan_key: null, plan_term: null, amount_inr: 100, credits_added: 300000, status: "pending", period_start: null, period_end: null, payment_id: null });
    assert.equal(paymentRow({ _id: "t3", type: "plan", plan_term: "quarter", createdAt: new Date() }).plan_term, null);
});

test("callCountsFrom: calls in 24 hours, 7 days and 30 days, against the plan's limits", () => {
    const now = Date.now();
    const times = [now - HOUR, now - 2 * DAY, now - 10 * DAY, now - 29 * DAY];
    assert.deepEqual(callCountsFrom(times, PLANS.pro, now), { day: { used: 1, limit: 3 }, week: { used: 2, limit: null }, month: { used: 4, limit: null } });
    assert.deepEqual(callCountsFrom(times, null, now), { day: { used: 1, limit: null }, week: { used: 2, limit: null }, month: { used: 4, limit: null } });
});
