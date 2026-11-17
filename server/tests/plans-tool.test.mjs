// Classgrid AI's get_plans_and_usage tool (owner, 2026-11-17): the AI tells users about plans, prices, limits, top-ups
// and their own usage from the live plan table, never from numbers typed into a prompt or a doc. Checked here:
//   - the tool says the numbers are set in Classgrid's dashboard and change, and to answer only from its result
//   - it is in its own tool group (account_plan), not in the always-sent tools, and that group loads for plan,
//     price, limit and usage questions only
//   - the plans come from the plan table through the same shaping as GET /api/public/ai-pricing
//     (services/ai-pricing.service.js; the route calls it instead of keeping its own copy)
//   - the user's own plan and usage are the Usage page's overview (planOverviewFor), passed on as they are
//   - part "plans" / "mine", no signed-in user, and an account that is not found
// The settings, the plan table and the user's overview are stand-ins: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/plans-tool.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// ── The plan table (stand-in rows; the numbers are made up for the test) ──
const PLANS = {
    free: { key: "free", name: "Free", tagline: "Free tagline", sort: 0, price_inr_monthly: 0, price_inr_yearly: 0, student_price_inr_monthly: 0, student_price_inr_yearly: 0, window_reset_value: 4, window_reset_unit: "hour", claude_credits_per_week: 0, fable_share_percent: 0, images_per_period: 7, images_reset_value: 1, images_reset_unit: "week", library_storage_mb: 111, models_allowed: ["auto", "@cf/deepseek-ai/deepseek-v4.1-flash-1017", "claude-haiku-5-5"], features_text: ["Free line"] },
    pro: { key: "pro", name: "Pro", tagline: "Pro tagline", sort: 1, price_inr_monthly: 123, price_inr_yearly: 1234, student_price_inr_monthly: 77, student_price_inr_yearly: 777, window_reset_value: 4, window_reset_unit: "hour", claude_credits_per_week: 1000, fable_share_percent: 10, images_per_period: 70, images_reset_value: 1, images_reset_unit: "month", library_storage_mb: 2222, models_allowed: ["auto", "@cf/deepseek-ai/deepseek-v4.1-flash-1017", "claude-haiku-5-5", "claude-sonnet-5-5", "claude-fable-5-2"], features_text: ["Pro line"] },
    max: { key: "max", name: "Max", tagline: "Max tagline", sort: 2, price_inr_monthly: 456, price_inr_yearly: 4567, student_price_inr_monthly: 333, student_price_inr_yearly: 3333, window_reset_value: 4, window_reset_unit: "hour", claude_credits_per_week: 5000, fable_share_percent: 40, images_per_period: 700, images_reset_value: 1, images_reset_unit: "month", library_storage_mb: 9999, models_allowed: [], features_text: ["Max line"] },
    enterprise: { key: "enterprise", name: "Enterprise", sort: 3, coming_soon: true, price_inr_monthly: -1, price_inr_yearly: -1, student_price_inr_monthly: -1, student_price_inr_yearly: -1, claude_credits_per_week: 1, fable_share_percent: 100, models_allowed: [] },
};

// ── The Usage page's overview of the signed-in user (stand-in) ──
const OVERVIEW = {
    enabled: true,
    plan: { key: "pro", name: "Pro", tagline: "Pro tagline", status: "active", billing: "monthly", started_at: "2026-11-01T00:00:00.000Z", expires_at: "2026-12-01T00:00:00.000Z", subscribed: true, limits: { tokens_per_window: 4321 }, student_price: false },
    balance: { topup: 5000, promotion: 250, credits_per_inr: 3000, extra: {} },
    usage: {
        credits_window: { used: 1200, limit: 4321, resetAt: "2026-11-17T12:00:00.000Z", periodText: "4 hours" },
        claude_week: { used: 10, limit: 1000, resetAt: "2026-11-20T00:00:00.000Z" },
        images: { used: 3, limit: 70, resetAt: null, periodText: "month" },
        storage: { usedMb: 12.5, limit: 2222 },
    },
};
let overviewCalls = [];
let overviewOf = () => OVERVIEW;

// ── Stand-ins ──
const chain = (value) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(value).then(ok, bad), catch: () => q }; return q; };
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => chain({ credits_per_inr: 3000, updatedAt: "2026-11-17T00:00:00.000Z" }) } });
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => chain(null) } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planTable: async () => ({ enabled: true, plans: PLANS }) } });
mock.module("../src/controllers/ai-credits-topup.controller.js", { namedExports: { TOPUP_MIN_INR: 299, TOPUP_MAX_INR: 10000 } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => "OK" } });
mock.module("../src/controllers/ai-plan-overview.controller.js", {
    namedExports: { planOverviewFor: async (userId) => { overviewCalls.push(String(userId)); return overviewOf(userId); } },
});

const tools = await import("../src/services/plan-info-tools.js");
const { aiPricingData } = await import("../src/services/ai-pricing.service.js");
const groups = await import("../src/services/ai-tool-groups.js");

const USER = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", email: "someone@example.com", role: "user" };
const banned = /\.\.\.|…|\bschool\b|\bcollege\b|\bcoaching\b|\binstitute\b|\bERP\b/i;
const call = async (args, user = USER) => tools.buildPlanInfoHandlers({ user })[tools.PLAN_INFO_TOOL_NAME](args);

// ── The tool and its group ──
test("the tool says its numbers are set in Classgrid's dashboard and change, and to answer only from its result", () => {
    assert.equal(tools.PLAN_INFO_TOOLS.length, 1);
    const def = tools.PLAN_INFO_TOOLS[0];
    assert.equal(def.type, "function");
    assert.equal(def.function.name, "get_plans_and_usage");
    assert.match(def.function.description, /set in Classgrid's dashboard and change/);
    assert.match(def.function.description, /answer only from its result/);
    assert.doesNotMatch(def.function.description, /\d/, "no number typed into the description");
    assert.doesNotMatch(def.function.description, banned);
    assert.deepEqual(def.function.parameters.properties.part.enum, ["all", "plans", "mine"]);
});

test("it is in the account_plan group, not in the always-sent tools", () => {
    const group = groups.TOOL_GROUPS.find((g) => g.id === "account_plan");
    assert.ok(group);
    assert.deepEqual(group.tools, ["get_plans_and_usage"]);
    assert.ok(!groups.CORE_TOOL_NAMES.includes("get_plans_and_usage"));
    assert.equal(groups.groupOfTool("get_plans_and_usage"), "account_plan");
    assert.doesNotMatch(group.description, banned);
});

test("the group loads for plan, price, limit and usage questions, and not for other messages", () => {
    const allTools = [...tools.PLAN_INFO_TOOLS, { type: "function", function: { name: "search_web" } }];
    const loads = (text) => groups.planToolsForMessage({ allTools, text, role: "user", email: USER.email }).loadedNames.has("get_plans_and_usage");
    for (const text of ["What does the Pro plan cost?", "how much of my weekly limit is left", "Is there a student price?", "can I top up on Free", "show my usage", "when does my session limit refill", "mera प्लान kya hai", "Max plan vs Pro plan"]) {
        assert.ok(loads(text), text);
    }
    for (const text of ["hello", "write a poem about the sea", "plan my week", "fix the bug in this function"]) {
        assert.ok(!loads(text), text);
    }
    // Always offered through load_tools, so the AI can load it itself
    assert.ok(groups.planToolsForMessage({ allTools, text: "hello", role: "user", email: USER.email }).allowedToolNames.has("get_plans_and_usage"));
});

// ── The answer ──
test("the plans come from the plan table, the same feed as GET /api/public/ai-pricing", async () => {
    overviewCalls = [];
    const out = JSON.parse(await call({ part: "plans" }));
    // (as JSON, like the route's res.json: fields the stand-in rows leave out are dropped)
    const feed = JSON.parse(JSON.stringify(await aiPricingData()));
    assert.deepEqual(out.plans, feed.plans);
    assert.deepEqual(out.model_plans, feed.modelPlans);
    assert.equal(out.plans_on, true);
    assert.deepEqual(out.plans.map((p) => p.name), ["Free", "Pro", "Max", "Enterprise"]);
    const pro = out.plans.find((p) => p.key === "pro");
    assert.equal(pro.priceInrMonthly, 123);
    assert.equal(pro.studentPriceInrMonthly, 77);
    assert.equal(pro.limits.imagesPerPeriod, 70);
    assert.equal(pro.limits.libraryStorageMb, 2222);
    assert.equal(pro.limits.windowHours, 4);
    assert.deepEqual(pro.features, ["Pro line"]);
    assert.equal(out.plans.find((p) => p.key === "enterprise").comingSoon, true);
    // Claude: not on Free (no weekly Claude credits), on Pro and Max; Fable only on plans with a Fable share
    assert.deepEqual(out.model_plans["claude-sonnet-5-5"].map((p) => p.name), ["Pro", "Max"]);
    assert.deepEqual(out.model_plans["claude-haiku-5-5"].map((p) => p.name), ["Pro", "Max"]);
    assert.deepEqual(out.model_plans["claude-fable-5-2"].map((p) => p.name), ["Pro", "Max"]);
    // Top-ups: Pro and Max only, after the plan's limit, 30 days
    assert.deepEqual(out.top_ups.for_plans, ["Pro", "Max"]);
    assert.equal(out.top_ups.valid_days, 30);
    assert.match(out.top_ups.used, /after the plan's own limits/);
    assert.equal(out.where.usage, "Settings > Usage on chat.classgrid.in");
    assert.match(out.where.billing, /^Settings > Billing on chat\.classgrid\.in/);
    assert.equal(out.where.pricing, "https://classgrid.in/pricing");
    assert.match(out.note, /dashboard/);
    assert.equal(out.you, undefined);
    assert.deepEqual(overviewCalls, [], "part plans does not read the user's usage");
    assert.doesNotMatch(out.note + out.how_to_read + JSON.stringify(out.where) + out.top_ups.used, banned);
});

test("the user's own plan and usage are the Usage page's numbers, passed on as they are", async () => {
    overviewCalls = [];
    const out = JSON.parse(await call({}));
    assert.deepEqual(overviewCalls, [USER._id]);
    assert.ok(Array.isArray(out.plans), "all: the plans too");
    assert.equal(out.you.plans_on, true);
    assert.deepEqual(out.you.plan, OVERVIEW.plan);
    assert.deepEqual(out.you.usage, OVERVIEW.usage);
    assert.deepEqual(out.you.balance, { top_up_credits: 5000, granted_credits: 250 });
});

test("part mine: only the user's own plan and usage", async () => {
    const out = JSON.parse(await call({ part: "mine" }));
    assert.equal(out.plans, undefined);
    assert.equal(out.top_ups, undefined);
    assert.equal(out.you.plan.name, "Pro");
});

test("no signed-in user, or an account that is not found: a clear error", async () => {
    assert.equal(await call({}, null), "Error: sign in first.");
    overviewOf = () => null;
    assert.equal(await call({ part: "mine" }), "Error: your Classgrid account was not found.");
    overviewOf = () => { throw new Error("database down"); };
    assert.equal(await call({ part: "mine" }), "Error: database down");
    overviewOf = () => OVERVIEW;
});

test("GET /api/public/ai-pricing uses the shared shaping instead of its own copy", async () => {
    const route = await readFile(new URL("../src/routes/public.routes.js", import.meta.url), "utf8");
    assert.match(route, /import \{ aiPricingData \} from "\.\.\/services\/ai-pricing\.service\.js";/);
    assert.match(route, /const data = await aiPricingData\(\);/);
    assert.doesNotMatch(route, /planTable\(|modelPlans\[|buyUrlMonthly/);
});
