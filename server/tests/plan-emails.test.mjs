// The plan wording (owner, 2026-11-17): the emails and WhatsApp texts speak of plans (Free, Pro, Max), not of the old
// free credits. Checked here:
//   - the limit email (ai-credits.service.js triggerEmailAlerts, type "free"): its subject and body for Free (See plans,
//     no Top up) and for Pro (Top up, 30 days), which limit ran out (the session window or the week) and when it
//     comes back (limitBackAt)
//   - the top-up and granted credit emails no longer say access is paused
//   - the welcome email has the Free plan's wording, not "₹1 to ₹10,000"
//   - the email when a super admin sets a plan (super-admin/ai-plans.controller.js planSetEmail): the plan's
//     features_text for Pro, nothing for Free
//   - the WhatsApp texts differ for Free (upgrade) and Pro (top up)
// The accounts, the settings, the plan table, Redis and the email senders are stand-ins: nothing is read from or
// written to a database, and no email or WhatsApp message is sent.
// Run: node --experimental-test-module-mocks --test tests/plan-emails.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const HOUR = 3600000;
const WEEK = 7 * 24 * HOUR;

// ── The plan table (stand-in rows) ──
const PLANS = {
    free: { key: "free", name: "Free", tokens_per_window: 100000, window_reset_value: 5, window_reset_unit: "hour", tokens_per_week: 400000, features_text: ["40 new chats every 5 hours"] },
    pro: { key: "pro", name: "Pro", tokens_per_window: 400000, window_reset_value: 5, window_reset_unit: "hour", tokens_per_week: 1500000, features_text: ["2,000 new chats every 5 hours", "Claude Sonnet, Opus and Haiku"] },
    max: { key: "max", name: "Max", tokens_per_window: 1000000, window_reset_value: 5, window_reset_unit: "hour", tokens_per_week: 4000000, features_text: ["Unlimited chats"] },
};
let currentPlan = PLANS.free;

// ── Stand-ins ──
let account = null;
const chain = (value) => { const q = { select: () => q, lean: () => q, populate: () => q, then: (ok, bad) => Promise.resolve(typeof value === "function" ? value() : value).then(ok, bad), catch: () => q }; return q; };
const emails = [];
const sesEmails = [];
mock.module("../src/models/User.js", {
    defaultExport: {
        findById: () => chain(() => account),
        // the free deduction: the account after its $inc
        findByIdAndUpdate: (id, update) => chain(() => {
            const inc = update?.$inc || {};
            if (inc["ai_tokens.used_this_week"]) {
                account.ai_tokens.used_this_week += inc["ai_tokens.used_this_week"];
                account.ai_tokens.week_used += inc["ai_tokens.week_used"] || 0;
            }
            return account;
        }),
        updateOne: () => chain({}),
        findOneAndUpdate: () => chain(null),
    },
});
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain({ global_ai_blocked: false, free_limit_per_computer: false }) } });
mock.module("../src/models/AiCreditTransaction.js", { defaultExport: {} });
mock.module("../src/models/PlanConfig.js", {
    defaultExport: { findOne: (q) => chain(() => PLANS[q?.key] || null) },
    namedExports: { PLAN_KEYS: ["free", "pro", "max", "enterprise"], RESET_UNIT_ENUM: ["second", "minute", "hour", "day", "week", "month"], ensurePlanRows: async () => {} },
});
mock.module("../src/services/email-queue.service.js", { namedExports: { enqueueEmail: async (mail) => { emails.push(mail); } } });
mock.module("../src/services/aws-ses.service.js", { namedExports: { sendEmail: async (mail) => { sesEmails.push(mail); } } });
mock.module("../src/services/plan-limits.service.js", {
    namedExports: {
        planOf: async () => currentPlan,
        planTable: async () => ({ enabled: true, plans: PLANS }),
        isUnlimited: (v) => v === -1 || v === null,
        forgetPlans: () => {},
    },
});
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, hgetall: async () => null, set: async () => "OK" } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => null } });

const templates = await import("../src/services/email-templates.service.js");
const { deductTokens, limitBackAt } = await import("../src/services/ai-credits.service.js");
const { planSetEmail } = await import("../src/controllers/super-admin/ai-plans.controller.js");

const user = ({ used, weekUsed = 0, windowStartedAgo = HOUR, weekStartedAgo = 24 * HOUR, plan = { id: "free" } }) => ({
    _id: "aaaaaaaaaaaaaaaaaaaaaaaa", status: "active", email: "someone@example.com", name: "Asha Rao", role: "user", plan,
    ai_tokens: {
        used_this_week: used, window_start: new Date(Date.now() - windowStartedAgo), week_reset_date: new Date(Date.now() - windowStartedAgo + 5 * HOUR),
        week_used: weekUsed, week_start: new Date(Date.now() - weekStartedAgo), promotion_credits_balance: 0, ai_credits_balance: 0,
    },
});
const near = (date, ms) => Math.abs(new Date(date).getTime() - ms) < 5000;
const banned = /\.\.\.|…|\bschool\b|\bcollege\b|\bcoaching\b|\binstitute\b|\bERP\b/i;
// The words a reader sees (links and bold are inline: no space added for them)
const strip = (html) => html.replace(/<\/?(a|strong)\b[^>]*>/g, "").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/&gt;/g, ">").replace(/\s+/g, " ");
const waitFor = async (check) => { for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => setTimeout(r, 10)); };

// ── Which limit ran out, and when it comes back ──
test("the session window is what ran out: it comes back at the window's end", async () => {
    currentPlan = PLANS.free;
    account = user({ used: 100000, weekUsed: 150000, windowStartedAgo: 2 * HOUR });
    const back = await limitBackAt(account, null);
    assert.equal(back.which, "window");
    assert.ok(near(back.at, Date.now() + 3 * HOUR), String(back.at)); // (5 hours after the window started)
    assert.equal(back.periodMs, 5 * HOUR);
});

test("the week is what ran out: it comes back at the week's end, not the session's", async () => {
    currentPlan = PLANS.free;
    account = user({ used: 20000, weekUsed: 400000, weekStartedAgo: 2 * 24 * HOUR });
    const back = await limitBackAt(account, null);
    assert.equal(back.which, "week");
    assert.ok(near(back.at, Date.now() - 2 * 24 * HOUR + WEEK), String(back.at));
});

// ── The limit email ──
test("Free: the limit email names the Free plan and the 5-hour limit, offers See plans, never Top up", async () => {
    currentPlan = PLANS.free;
    account = user({ used: 99000, windowStartedAgo: HOUR });
    emails.length = 0;
    await deductTokens(account._id, null, 5000, "weekly_free");
    await waitFor(() => emails.length > 0);
    assert.equal(emails.length, 1);
    const mail = emails[0];
    assert.equal(mail.subject, "You've used your Free plan's limit for now");
    const body = strip(mail.html);
    assert.match(body, /You've used all of your Free plan's 5-hour limit\. It comes back on .+ \(India time\)\./);
    assert.ok(body.includes(templates.indiaTimeText(new Date(Date.now() + 4 * HOUR)).slice(0, 11)));
    assert.match(body, /Want more now\? Pro and Max have higher limits\./);
    assert.match(mail.html, /href="https:\/\/classgrid\.in\/pricing"[^>]*>See plans</);
    assert.doesNotMatch(body, /Top up|top-up|top up/);
    assert.doesNotMatch(body, banned);
    assert.match(mail.text, /See plans: https:\/\/classgrid\.in\/pricing/);
});

test("Pro: the limit email offers Top up (used after the plan's limit, valid for 30 days), never See plans", async () => {
    currentPlan = PLANS.pro;
    account = user({ used: 399000, plan: { id: "pro", status: "active" } });
    emails.length = 0;
    await deductTokens(account._id, null, 5000, "weekly_free");
    await waitFor(() => emails.length > 0);
    const mail = emails[0];
    assert.equal(mail.subject, "You've used your Pro plan's limit for now");
    const body = strip(mail.html);
    assert.match(body, /You've used all of your Pro plan's 5-hour limit\./);
    assert.match(body, /Want to keep going now\? Top up AI credits\. They are used after your plan's limit and stay valid for 30 days\./);
    assert.match(mail.html, /href="https:\/\/chat\.classgrid\.in\/agent\/settings\?section=billing"[^>]*>Top up</);
    assert.doesNotMatch(body, /See plans/);
});

test("the weekly limit used up mid-window: the email says weekly limit and the week's end", async () => {
    currentPlan = PLANS.free;
    account = user({ used: 10000, weekUsed: 398000, weekStartedAgo: 3 * 24 * HOUR });
    emails.length = 0;
    await deductTokens(account._id, null, 5000, "weekly_free");
    await waitFor(() => emails.length > 0);
    assert.equal(emails.length, 1, "the email goes out when the week is what ran out");
    const body = strip(emails[0].html);
    assert.match(body, /You've used all of your Free plan's weekly limit\. It comes back on /);
    assert.ok(body.includes(templates.indiaTimeText(new Date(Date.now() - 3 * 24 * HOUR + WEEK))), body);
});

test("plans off (or staff): the limit email says your plan, with no name", () => {
    const mail = templates.getPlanLimitReachedEmail({ userName: "Asha", plan: null, paidNames: ["Pro", "Max"], which: "window", backAt: new Date(), periodMs: 6 * HOUR });
    assert.equal(mail.subject, "You've used your plan's limit for now");
    assert.match(strip(mail.html), /You've used all of your plan's 6-hour limit\./);
    assert.match(strip(mail.html), /Top up/); // (top-ups are open while plans are off)
});

// ── Top-up and granted credits ──
test("top-up and granted credit emails no longer say access is paused, and name the plan", () => {
    for (const plan of [PLANS.free, PLANS.pro, null]) {
        const all = [
            templates.getTopUpCreditsLowEmailHtml("Asha", plan),
            templates.getTopUpCreditsExhaustedEmailHtml("Asha", plan),
            templates.getGrantedCreditsLowEmailHtml("Asha", plan),
            templates.getGrantedCreditsExhaustedEmailHtml("Asha", plan),
        ].map(strip);
        for (const body of all) {
            assert.doesNotMatch(body, /paused|Personal Free Limits|resume|never expire/i);
            assert.doesNotMatch(body, banned);
            if (plan?.key === "free") assert.doesNotMatch(body, /Top up/);
            else assert.match(body, /Top up/);
        }
        const name = plan ? `Your ${plan.name} plan` : "Your plan";
        assert.match(all[0], new RegExp(`You've used 80% of your top-up credits\\. ${name} keeps working as its limits refill\\.`));
        assert.match(all[1], new RegExp(`Your top-up credits are used up\\. ${name} keeps working as its limits refill\\.`));
        assert.match(all[2], new RegExp(`You've used 80% of your granted credits\\. ${name} and any top-up credits keep working as its limits refill\\.`));
        assert.match(all[3], new RegExp(`Your granted credits are used up\\. ${name} and any top-up credits keep working as its limits refill\\.`));
    }
});

test("super admin credit emails: the plan's limits, Settings > Usage, no AI Hub, no free weekly limit", () => {
    const bodies = [
        templates.getAiCreditGrantedHtml("Asha", "1,000", "1,000", "Dec 1, 2026"),
        templates.getAiCreditGrantedPlainText("Asha", "1,000", "1,000", "Dec 1, 2026"),
        templates.getGrantedCreditsExtendedHtml("Asha", new Date()),
        templates.getGrantedCreditsExtendedPlainText("Asha", new Date()),
        templates.getGrantedCreditsPausedHtml("Asha", true, null, PLANS.pro),
        templates.getGrantedCreditsPausedPlainText("Asha", true, null, PLANS.pro),
        templates.getGrantedCreditsRemovedHtml("Asha", null, PLANS.pro),
        templates.getGrantedCreditsRemovedPlainText("Asha", null, PLANS.pro),
    ];
    for (const b of bodies) {
        assert.doesNotMatch(b, /AI Hub|AIHUB|free weekly limit|app\.classgrid\.in|student\/agent/i);
    }
    for (const i of [0, 1, 2, 3, 6, 7]) assert.ok(bodies[i].includes(templates.USAGE_URL), `email ${i} links to Settings > Usage`);
    assert.match(strip(bodies[4]), /Your Pro plan's limits still apply\./);
    assert.match(strip(bodies[6]), /Your Pro plan's limits still apply\. You can top up any time\./);
    // Free: no top-up push
    assert.doesNotMatch(templates.getGrantedCreditsRemovedPlainText("Asha", null, PLANS.free), /top up/i);
    assert.match(templates.getGrantedCreditsRemovedPlainText("Asha", null, PLANS.free), /Your Free plan's limits still apply\./);
});

// ── Welcome ──
test("the welcome email has the Free plan's wording from the plan table, not the old ₹1 to ₹10,000", () => {
    const html = templates.getChatWelcomeEmailHtml("Asha Rao", PLANS.free, ["Pro", "Max"]);
    const text = templates.getChatWelcomeEmailPlainText("Asha Rao", PLANS.free, ["Pro", "Max"]);
    for (const b of [strip(html), text]) {
        assert.doesNotMatch(b, /₹1 to ₹10,000|No locked-in monthly plans/);
        assert.match(b, /You're on the Free plan\. It refills every 5 hours, with a weekly limit\. For more use, Claude models and more images, see Pro and Max: classgrid\.in\/pricing\. You can see what you've used in Settings > Usage\./);
        assert.doesNotMatch(b, banned);
    }
    assert.match(html, /href="https:\/\/classgrid\.in\/pricing"/);
    // The window comes from the plan row
    assert.match(templates.getChatWelcomeEmailPlainText("A", { ...PLANS.free, window_reset_value: 3 }, ["Pro", "Max"]), /It refills every 3 hours/);
    // Plans off: no plan name
    assert.doesNotMatch(templates.getChatWelcomeEmailPlainText("A", null, []), /Free plan|₹/);
});

// ── A plan set by a super admin ──
test("a plan set by a super admin: Pro sends its features_text lines, Free sends nothing", async () => {
    sesEmails.length = 0;
    const start = new Date("2026-11-17T06:00:00Z");
    const end = new Date("2026-12-17T06:00:00Z");
    await planSetEmail({ _id: "u1", email: "someone@example.com", name: "Asha", plan: { id: "pro", started_at: start, expires_at: end } }, "pro");
    assert.equal(sesEmails.length, 1);
    const mail = sesEmails[0];
    assert.equal(mail.subject, "You're on the Classgrid Pro plan");
    const body = strip(mail.html);
    assert.match(body, /Pro is on from 17 November 2026 to 17 December 2026\./);
    for (const line of PLANS.pro.features_text) assert.ok(body.includes(line), line);
    assert.ok(mail.html.includes(`href="${templates.USAGE_URL}"`));
    assert.doesNotMatch(body, banned);

    sesEmails.length = 0;
    await planSetEmail({ _id: "u1", email: "someone@example.com", name: "Asha", plan: { id: "free", started_at: start } }, "free");
    assert.equal(sesEmails.length, 0);
    assert.equal(templates.getPlanSetEmail({ userName: "A", plan: PLANS.free, start }), null);
    assert.equal(templates.getPlanSetEmail({ userName: "A", plan: null, start }), null);
});

// ── WhatsApp ──
test("the WhatsApp texts: Free is told to wait or upgrade, Pro to wait or top up", () => {
    const backAt = new Date(Date.now() + 2 * HOUR);
    const when = templates.indiaTimeText(backAt);
    const paidNames = ["Pro", "Max"];
    const free = { plan: PLANS.free, paidNames, backAt };
    const pro = { plan: PLANS.pro, paidNames, backAt };

    assert.equal(templates.callRefusedLimitText(free), `You've used your Free plan's limit for now, so Classgrid AI can't take calls. Calls come back on ${when}, or upgrade to Pro or Max for more: classgrid.in/pricing`);
    assert.equal(templates.callRefusedLimitText(pro), `You've used your Pro plan's limit for now, so Classgrid AI can't take calls. Calls come back on ${when}, or top up on chat.classgrid.in`);

    assert.equal(templates.callMinutesUsedUpText({ ...free, taskSaved: true }), `Your Free plan's call minutes for this period are used up, but your request is saved and Classgrid AI is working on it. Calls come back on ${when}, or upgrade to Pro or Max for more: classgrid.in/pricing`);
    assert.equal(templates.callMinutesUsedUpText(pro), `Your Pro plan's call minutes for this period are used up. Calls come back on ${when}, or top up on chat.classgrid.in`);

    assert.equal(templates.taskPausedLimitText(free), `⏸️ You've used your Free plan's limit for now, so I paused your task. I'll continue by myself when it comes back on ${when}, or upgrade to Pro or Max for more: classgrid.in/pricing`);
    assert.equal(templates.taskPausedLimitText(pro), `⏸️ You've used your Pro plan's limit for now, so I paused your task. I'll continue by myself when it comes back on ${when}, or top up on chat.classgrid.in`);

    for (const t of [templates.callRefusedLimitText(free), templates.callRefusedLimitText(pro), templates.taskPausedLimitText(free)]) {
        assert.doesNotMatch(t, /credits|tokens ran out/i);
        assert.doesNotMatch(t, banned);
    }
});
