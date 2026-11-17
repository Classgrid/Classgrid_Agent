// WhatsApp call limits per plan (owner, 2026-11-17): calls per day, per week and per month (each can be set, a call
// is taken only when every set limit has room), how many tasks one call may start, how many tasks from calls may run
// at once for one person, and the minutes of work one task from a call may use. Checked here:
//   - the plan's call count limits (services/call-limits.service.js callCountCaps, fullCallLimit, callsLineText):
//     day, week and month combined, -1 and a field the row does not have yet = no limit, 0 = no calls, when a call
//     fits again, and plans off (only the owner's 50 a day)
//   - the week and month are counted from the call records (models/Call.js), answered calls only
//   - tasks per call and tasks running at once (callTaskRefusal, runningCallTasks), Free against Pro, and what the AI
//     on the call is told (callTaskRefusedToolText, callTaskLimitsLine)
//   - the minutes of work of one task (workLeftMs, workClock: the run is stopped when they run out)
//   - the WhatsApp texts (email-templates.service.js callCountLimitText, callTaskTimeUpText): Free is told to upgrade
//     to Pro or Max, Pro to Max, Max only when to call again
//   - the seed (models/PlanConfig.js DEFAULT_PLANS) and the model's defaults (-1: rows saved before keep today's
//     behaviour), and the pricing feed (services/ai-pricing.service.js) carries the new numbers
// The call records, the settings and the plan table are stand-ins: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/call-limits.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const banned = /\.\.\.|…|\bschool\b|\bcollege\b|\bcoaching\b|\binstitute\b|\bERP\b/i;

// ── The plan rows (stand-ins with the proposed numbers) ──
const FREE = { key: "free", name: "Free", sort: 0, price_inr_monthly: 0, calls_per_day: 3, calls_per_week: 10, calls_per_month: 30, call_tasks_per_call: 3, call_tasks_at_once: 2, call_task_max_minutes: 10, call_max_minutes: 5 };
const PRO = { key: "pro", name: "Pro", sort: 1, price_inr_monthly: 499, calls_per_day: 10, calls_per_week: 100, calls_per_month: 300, call_tasks_per_call: 10, call_tasks_at_once: 5, call_task_max_minutes: 60, call_max_minutes: 10 };
const MAX = { key: "max", name: "Max", sort: 2, price_inr_monthly: 1999, calls_per_day: 30, calls_per_week: 300, calls_per_month: 1000, call_tasks_per_call: 25, call_tasks_at_once: 10, call_task_max_minutes: 180, call_max_minutes: 15 };
const PAID = ["Pro", "Max"];

// ── Stand-ins ──
const chain = (value) => { const q = { select: () => q, sort: () => q, limit: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: () => q }; return q; };
let callQueries = [];
let callRows = [];
let countQueries = [];
let runningCount = 0;
mock.module("../src/models/Call.js", {
    defaultExport: {
        find: (q) => { callQueries.push(q); return chain(() => callRows); },
        countDocuments: async (q) => { countQueries.push(q); return runningCount; },
    },
});
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain({ credits_per_inr: 3000, updatedAt: "2026-11-17T00:00:00.000Z" }) } });
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planTable: async () => ({ enabled: true, plans: { free: FREE, pro: PRO, max: MAX } }) } });
mock.module("../src/controllers/ai-credits-topup.controller.js", { namedExports: { TOPUP_MIN_INR: 299, TOPUP_MAX_INR: 10000 } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => "OK" } });

const limits = await import("../src/services/call-limits.service.js");
const templates = await import("../src/services/email-templates.service.js");
const { DEFAULT_PLANS, default: PlanConfig } = await import("../src/models/PlanConfig.js");
const { aiPricingData } = await import("../src/services/ai-pricing.service.js");

const NOW = Date.UTC(2026, 10, 17, 6, 30);
const ago = (ms) => NOW - ms;

// ── Calls per day, week and month ──
test("a plan's call count limits: day, week and month; -1 and a missing field mean no limit; plans off keep the 50 a day", () => {
    assert.deepEqual(limits.callCountCaps(FREE, 50), { day: 3, week: 10, month: 30 });
    assert.deepEqual(limits.callCountCaps(PRO, 50), { day: 10, week: 100, month: 300 });
    assert.deepEqual(limits.callCountCaps({ ...MAX, calls_per_day: 80 }, 50).day, 50, "the day never goes above the owner's 50");
    assert.deepEqual(limits.callCountCaps({ key: "free", name: "Free", calls_per_day: 3 }, 50), { day: 3, week: null, month: null }, "a row saved before the new fields: as today");
    assert.deepEqual(limits.callCountCaps({ ...FREE, calls_per_day: -1, calls_per_week: -1, calls_per_month: -1 }, 50), { day: 50, week: null, month: null });
    assert.deepEqual(limits.callCountCaps(null, 50), { day: 50, week: null, month: null });
    assert.equal(limits.planNumber(0), 0);
    assert.equal(limits.planNumber("12"), 12);
    assert.equal(limits.planNumber(undefined), null);
});

test("day, week and month are combined: a call is taken only when every set limit has room", () => {
    const caps = limits.callCountCaps(FREE, 50); // 3 a day, 10 a week, 30 a month
    // 2 today, 9 this week: every limit has room
    const week9 = [ago(2 * HOUR), ago(1 * HOUR), ...[2, 3, 3, 4, 5, 5, 6].map((d) => ago(d * DAY))];
    assert.equal(limits.fullCallLimit(caps, { day: week9.slice(0, 2), week: week9, month: week9 }, NOW), null);
    // 3 today: the day is full, back 24 hours after the oldest of today's calls
    const today3 = [ago(5 * HOUR), ago(2 * HOUR), ago(1 * HOUR)];
    const day = limits.fullCallLimit(caps, { day: today3, week: today3, month: today3 }, NOW);
    assert.equal(day.which, "day");
    assert.equal(day.cap, 3);
    assert.equal(day.backAt.getTime(), ago(5 * HOUR) + DAY);
    // 1 today but 10 this week: the week is full (day has room), back 7 days after the oldest call of the week
    const week10 = [ago(HOUR), ...[1.5, 2, 2.5, 3, 4, 4.5, 5, 6, 6.5].map((d) => ago(d * DAY))];
    const week = limits.fullCallLimit(caps, { day: [ago(HOUR)], week: week10, month: week10 }, NOW);
    assert.equal(week.which, "week");
    assert.equal(week.used, 10);
    assert.equal(week.backAt.getTime(), ago(6.5 * DAY) + 7 * DAY);
    // 30 in the month, only 4 in the last 7 days: the month is full
    const month30 = Array.from({ length: 30 }, (_, i) => (i < 4 ? ago((i + 1) * DAY - 1000) : ago(8 * DAY + (i - 4) * 12 * HOUR)));
    const month = limits.fullCallLimit(caps, { day: [], week: month30, month: month30 }, NOW);
    assert.equal(month.which, "month");
    assert.equal(month.cap, 30);
    // a call older than the window does not count
    assert.equal(limits.fullCallLimit({ day: 3, week: null, month: null }, { day: [ago(25 * HOUR), ago(26 * HOUR), ago(27 * HOUR)] }, NOW), null);
});

test("-1 is no limit; a lowered limit comes back only when enough calls are old enough; 0 means no calls", () => {
    const many = Array.from({ length: 500 }, (_, i) => ago(i * HOUR + 1000));
    assert.equal(limits.fullCallLimit(limits.callCountCaps({ ...MAX, calls_per_day: -1, calls_per_week: -1, calls_per_month: -1 }, 1000), { day: [], week: many, month: many }, NOW), null);
    // 5 calls in 24 hours, the day lowered to 3: one more fits after the 3rd oldest leaves the window
    const five = [ago(20 * HOUR), ago(15 * HOUR), ago(10 * HOUR), ago(5 * HOUR), ago(HOUR)];
    const hit = limits.fullCallLimit({ day: 3, week: null, month: null }, { day: five }, NOW);
    assert.equal(hit.backAt.getTime(), ago(10 * HOUR) + DAY);
    const none = limits.fullCallLimit({ day: 50, week: 0, month: null }, { day: [], week: [], month: [] }, NOW);
    assert.deepEqual({ which: none.which, cap: none.cap, backAt: none.backAt }, { which: "week", cap: 0, backAt: null });
});

test("the line sent with the call's work counts every set limit", () => {
    const caps = limits.callCountCaps(FREE, 50);
    const t = [ago(2 * DAY), ago(HOUR)];
    assert.equal(limits.callsLineText(caps, { day: [ago(HOUR)], week: t, month: t }, NOW), "(Call 2 of 3 for today, 3 of 10 for this week, 3 of 30 for this month.)");
    assert.equal(limits.callsLineText(limits.callCountCaps(null, 50), { day: [] }, NOW), "(Call 1 of 50 for today.)");
});

test("the week and month are counted from the call records: this person's answered calls", async () => {
    callQueries = [];
    callRows = [{ started_at: new Date(ago(3 * DAY)) }, { started_at: new Date(ago(HOUR)) }];
    const times = await limits.callTimesSince("aaaaaaaaaaaaaaaaaaaaaaaa", ago(30 * DAY));
    assert.deepEqual(times, [ago(3 * DAY), ago(HOUR)]);
    const q = callQueries[0];
    assert.equal(q.user_id, "aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(q.origin, "call");
    assert.equal(q.started_at.$gte.getTime(), ago(30 * DAY));
    assert.deepEqual(q["transcript.0"], { $exists: true }, "a call that was never answered has no greeting and does not count");
});

// ── Tasks from a call ──
test("tasks one call may start: Free 3, Pro 10; -1 no limit; 0 none", async () => {
    const free = limits.callTaskCaps(FREE);
    const pro = limits.callTaskCaps(PRO);
    assert.deepEqual(free, { perCall: 3, atOnce: 2, maxMinutes: 10 });
    assert.deepEqual(pro, { perCall: 10, atOnce: 5, maxMinutes: 60 });
    const running = async () => 0;
    assert.equal(await limits.callTaskRefusal(free, { savedThisCall: 2, running }), null);
    assert.deepEqual(await limits.callTaskRefusal(free, { savedThisCall: 3, running }), { why: "per_call", cap: 3, running: 0 });
    assert.equal(await limits.callTaskRefusal(pro, { savedThisCall: 3, running }), null, "Pro's call can start a 4th task");
    assert.deepEqual(await limits.callTaskRefusal(pro, { savedThisCall: 10, running }), { why: "per_call", cap: 10, running: 0 });
    assert.equal(await limits.callTaskRefusal(limits.callTaskCaps({ ...FREE, call_tasks_per_call: -1 }), { savedThisCall: 99, running }), null);
    assert.equal(await limits.callTaskRefusal(limits.callTaskCaps(null), { savedThisCall: 99, running }), null, "plans off: as today");
    assert.equal(await limits.callTaskRefusal(limits.callTaskCaps({ key: "free", name: "Free" }), { savedThisCall: 99, running }), null, "a row saved before the new fields: as today");
    assert.equal((await limits.callTaskRefusal(limits.callTaskCaps({ ...FREE, call_tasks_per_call: 0 }), { savedThisCall: 0, running })).why, "none");
    assert.equal((await limits.callTaskRefusal(limits.callTaskCaps({ ...FREE, call_task_max_minutes: 0 }), { savedThisCall: 0, running })).why, "none");
});

test("tasks running at once: Free 2, Pro 5; asked only for a call's first task (all of a call's tasks are one job)", async () => {
    let asked = 0;
    const running = (n) => async () => { asked++; return n; };
    const free = limits.callTaskCaps(FREE);
    assert.equal(await limits.callTaskRefusal(free, { savedThisCall: 0, running: running(1) }), null);
    assert.deepEqual(await limits.callTaskRefusal(free, { savedThisCall: 0, running: running(2) }), { why: "at_once", cap: 2, running: 2 });
    assert.equal(await limits.callTaskRefusal(limits.callTaskCaps(PRO), { savedThisCall: 0, running: running(2) }), null, "Pro runs 5 at once");
    assert.deepEqual(await limits.callTaskRefusal(limits.callTaskCaps(PRO), { savedThisCall: 0, running: running(5) }), { why: "at_once", cap: 5, running: 5 });
    asked = 0;
    assert.equal(await limits.callTaskRefusal(free, { savedThisCall: 1, running: running(9) }), null, "a 2nd task joins the call's own job");
    assert.equal(asked, 0);
    assert.equal(await limits.callTaskRefusal(limits.callTaskCaps({ ...FREE, call_tasks_at_once: -1 }), { savedThisCall: 0, running: running(50) }), null);
});

test("the running tasks are counted from the call records: queued, working or retrying, written in the last 48 hours", async () => {
    countQueries = [];
    runningCount = 2;
    assert.equal(await limits.runningCallTasks("aaaaaaaaaaaaaaaaaaaaaaaa", NOW), 2);
    const q = countQueries[0];
    assert.equal(q.user_id, "aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(q.origin, "call");
    assert.deepEqual(q.status, { $in: ["queued", "working", "retrying"] });
    assert.equal(q.updatedAt.$gte.getTime(), NOW - 48 * HOUR);
});

test("what the AI on the call is told: the task is not started, said plainly, with the bigger plans for Free and Pro", () => {
    const perCall = limits.callTaskRefusedToolText({ why: "per_call", cap: 3 }, { plan: FREE, paidNames: PAID });
    assert.match(perCall, /^Not started: on their Free plan one call can start 3 tasks, and this call already has 3\./);
    assert.match(perCall, /Tell the caller plainly/);
    assert.match(perCall, /upgrade to Pro or Max/);
    const atOnce = limits.callTaskRefusedToolText({ why: "at_once", cap: 5, running: 5 }, { plan: PRO, paidNames: PAID });
    assert.match(atOnce, /already has 5 tasks from calls running, and their Pro plan runs at most 5 at once/);
    assert.match(atOnce, /upgrade to Max for more tasks at once/);
    assert.doesNotMatch(atOnce, /Pro or Max/);
    const maxText = limits.callTaskRefusedToolText({ why: "per_call", cap: 25 }, { plan: MAX, paidNames: PAID });
    assert.doesNotMatch(maxText, /upgrade/i);
    const none = limits.callTaskRefusedToolText({ why: "none", cap: 0 }, { plan: FREE, paidNames: PAID });
    assert.match(none, /not part of their Free plan/);
    assert.equal(limits.callTaskLimitsLine(limits.callTaskCaps(FREE), FREE), "The caller's Free plan: one call can start up to 3 tasks (start_task), each task gets up to 10 minutes of work, at most 2 tasks from calls run at once. Keep each task to what fits in that.");
    assert.equal(limits.callTaskLimitsLine(limits.callTaskCaps(null), null), "");
    for (const t of [perCall, atOnce, maxText, none]) assert.doesNotMatch(t, banned);
});

// ── Minutes of work of one task ──
test("a task's minutes of work: the run is stopped when they run out, and its time is added to the task", async () => {
    assert.equal(limits.workLeftMs({ work_cap_ms: null, work_ms: 0 }), Infinity);
    assert.equal(limits.workLeftMs({ work_cap_ms: 10 * MIN, work_ms: 4 * MIN }), 6 * MIN);
    assert.equal(limits.workLeftMs({ work_cap_ms: 10 * MIN, work_ms: 11 * MIN }), 0);
    const added = [];
    const stop = new AbortController();
    const clock = limits.workClock({ _id: "t1", work_cap_ms: 40, work_ms: 0 }, stop, (id, ms) => added.push([id, ms]));
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(stop.signal.aborted, true);
    assert.equal(clock.hit(), true);
    await clock.done();
    assert.equal(added[0][0], "t1");
    assert.ok(added[0][1] >= 40);
    // no limit: nothing stops, nothing is added
    const free = new AbortController();
    const none = limits.workClock({ _id: "t2", work_cap_ms: null }, free, () => added.push("t2"));
    await none.done();
    assert.equal(free.signal.aborted, false);
    assert.equal(none.hit(), false);
    assert.equal(added.length, 1);
});

// ── WhatsApp texts ──
test("the WhatsApp texts: calls for today, this week and this month; Free upgrades to Pro or Max, Pro to Max, Max waits", () => {
    const backAt = new Date(NOW + 3 * HOUR);
    const when = templates.indiaTimeText(backAt);
    assert.equal(templates.callCountLimitText({ plan: FREE, paidNames: PAID, which: "day", cap: 3, backAt }), `You've used all 3 calls for today on your Free plan, so Classgrid AI can't take this call. You can call again on ${when}, or upgrade to Pro or Max for more calls: classgrid.in/pricing`);
    assert.equal(templates.callCountLimitText({ plan: FREE, paidNames: PAID, which: "week", cap: 10, backAt }), `You've used all 10 calls for this week on your Free plan, so Classgrid AI can't take this call. You can call again on ${when}, or upgrade to Pro or Max for more calls: classgrid.in/pricing`);
    assert.equal(templates.callCountLimitText({ plan: PRO, paidNames: PAID, which: "month", cap: 300, backAt }), `You've used all 300 calls for this month on your Pro plan, so Classgrid AI can't take this call. You can call again on ${when}, or upgrade to Max for more calls: classgrid.in/pricing`);
    assert.equal(templates.callCountLimitText({ plan: MAX, paidNames: PAID, which: "day", cap: 30, backAt }), `You've used all 30 calls for today on your Max plan, so Classgrid AI can't take this call. You can call again on ${when}.`);
    assert.equal(templates.callCountLimitText({ plan: null, paidNames: PAID, which: "day", cap: 50, backAt }), `You've used all 50 calls for today, so Classgrid AI can't take this call. You can call again on ${when}.`);
    assert.equal(templates.callCountLimitText({ plan: FREE, paidNames: PAID, which: "week", cap: 0 }), "Calls with Classgrid AI are not part of your Free plan. Upgrade to Pro or Max to call: classgrid.in/pricing");
    const timeUp = templates.callTaskTimeUpText({ plan: FREE, paidNames: PAID, minutes: 10, whereItGot: "Two of the three slides are made.", link: "\n\nWhat it did so far: https://chat.classgrid.in/calls/1" });
    assert.equal(timeUp, "Classgrid AI stopped your task: it used the 10 minutes of work a task from a call gets on your Free plan. For bigger tasks, upgrade to Pro or Max: classgrid.in/pricing\n\nWhere it got to:\nTwo of the three slides are made.\n\nWhat it did so far: https://chat.classgrid.in/calls/1");
    assert.equal(templates.callTaskTimeUpText({ plan: MAX, paidNames: PAID, minutes: 180 }), "Classgrid AI stopped your task: it used the 180 minutes of work a task from a call gets on your Max plan.");
    assert.deepEqual(templates.biggerPlanNames(FREE, PAID), ["Pro", "Max"]);
    assert.deepEqual(templates.biggerPlanNames(PRO, PAID), ["Max"]);
    assert.deepEqual(templates.biggerPlanNames(MAX, PAID), []);
    for (const t of [timeUp, templates.callCountLimitText({ plan: PRO, paidNames: PAID, which: "day", cap: 10, backAt })]) {
        assert.doesNotMatch(t, banned);
        assert.doesNotMatch(t, /top up|credits/i, "a top-up adds no calls and no tasks");
    }
});

// ── The seed, the model's defaults and the pricing feed ──
test("the seed has the proposal; the model's default is -1 (no limit), so rows saved before keep today's behaviour", () => {
    const seed = Object.fromEntries(DEFAULT_PLANS.map((p) => [p.key, p]));
    const pick = (p) => [p.calls_per_day, p.calls_per_week, p.calls_per_month, p.call_tasks_per_call, p.call_tasks_at_once, p.call_task_max_minutes];
    assert.deepEqual(pick(seed.free), [3, 10, 30, 3, 2, 10]);
    assert.deepEqual(pick(seed.pro), [10, 100, 300, 10, 5, 60]);
    assert.deepEqual(pick(seed.max), [30, 300, 1000, 25, 10, 180]);
    assert.deepEqual(pick(seed.enterprise), [50, 300, 1000, 25, 10, 180]);
    for (const f of ["calls_per_week", "calls_per_month", "call_tasks_per_call", "call_tasks_at_once", "call_task_max_minutes"]) {
        assert.equal(PlanConfig.schema.path(f).defaultValue, -1, f);
    }
    for (const p of DEFAULT_PLANS) for (const line of p.features_text) assert.doesNotMatch(line, banned);
});

test("the pricing feed (and so the pricing page and Classgrid AI's plan tool) carries the new numbers", async () => {
    const feed = await aiPricingData();
    const byKey = Object.fromEntries(feed.plans.map((p) => [p.key, p.limits]));
    assert.deepEqual(
        ["free", "pro", "max"].map((k) => [byKey[k].callsPerDay, byKey[k].callsPerWeek, byKey[k].callsPerMonth, byKey[k].callTasksPerCall, byKey[k].callTasksAtOnce, byKey[k].callTaskMaxMinutes]),
        [[3, 10, 30, 3, 2, 10], [10, 100, 300, 10, 5, 60], [30, 300, 1000, 25, 10, 180]],
    );
});
