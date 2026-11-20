// The Usage page's history shows the credits a person SPENT, never what their plan covered (owner, 2026-11-20: "a
// person who uses only their plan sees 0; a person who buys Rs. 500 of credits sees only what they spent from those
// credits"). usageHistoryFor reads the charges to the credits (AiCreditSpend) for the person's own page
// ({ creditsOnly: true }) and every AI request (AiUsageLog) for the super admin's user page. Checked here:
//   - a person whose plan covered everything: 0 credits, 0 rows, an empty day chart (the usage log is not counted)
//   - a person who spent credits: the total, the day chart and the rows are the charges, newest first
//   - a charge older than the days asked for, and another person's charge, are never counted
//   - a row says what the credits paid for; a charge with no label reads "Chat"
//   - voice, speech and picture models are shown under Classgrid's own names; chat models keep theirs
//   - the rows come one page at a time
//   - the super admin's page (no options) still shows every request from the usage log, with the real model
// The two collections are stand-ins kept in memory: nothing is read from a database.
// Run: node --experimental-test-module-mocks --test tests/usage-history-credits.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const HOUR = 3600000, DAY = 86400000;
let spend = [];   // AiCreditSpend rows
let usage = [];   // AiUsageLog rows

// A stand-in for the two collections: the three reads usageHistoryFor makes (grouped sums, a page of rows, a count)
const istDay = (d) => new Date(new Date(d).getTime() + 5.5 * HOUR).toISOString().slice(0, 10);
const matching = (rows, match) => rows.filter((r) =>
    String(r.userId) === String(match.userId) && new Date(r.createdAt) >= match.createdAt.$gte && (match.success === undefined || r.success !== false));
const collection = (rows, field) => ({
    aggregate: async (pipeline) => {
        const list = matching(rows(), pipeline[0].$match);
        const group = pipeline[1].$group;
        const key = (r) => (group._id === null ? null : istDay(r.createdAt));
        const out = new Map();
        for (const r of list) {
            const k = key(r);
            const g = out.get(k) || { _id: k, credits: 0, requests: 0 };
            g.credits += r[field] || 0; g.requests += 1;
            out.set(k, g);
        }
        return [...out.values()].sort((a, b) => String(a._id).localeCompare(String(b._id)));
    },
    find: (match) => {
        let list = matching(rows(), match).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const q = { sort: () => q, skip: (n) => { list = list.slice(n); return q; }, limit: (n) => { list = list.slice(0, n); return q; }, select: () => q, lean: async () => list };
        return q;
    },
    countDocuments: async (match) => matching(rows(), match).length,
});
mock.module("../src/models/AiCreditSpend.js", { defaultExport: collection(() => spend, "credits") });
mock.module("../src/models/AiUsageLog.js", { defaultExport: collection(() => usage, "totalTokens") });
// (the rest of the controller's imports are for the plan overview, not used here)
for (const m of ["User", "Organization", "GlobalAiConfig", "AiLibraryFile", "IdeProject"]) mock.module(`../src/models/${m}.js`, { defaultExport: {} });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async () => null, planKeyOf: () => "free", plansEnabled: async () => true, filesPerMessage: () => 5, DEFAULT_FILES_PER_MESSAGE: 5 } });
mock.module("../src/services/ai-credits.service.js", { namedExports: { freeWindow: async () => ({}), weekCounters: async () => ({}), tokenWindowEnd: () => 0 } });
mock.module("../src/services/ai-feature-limits.js", { namedExports: { resolveFeatureLimit: () => 0, resolveResetPeriod: () => 0, checkWhatsappLimit: async () => ({}), formatPeriodLength: () => "" } });
mock.module("../src/services/plan-usage.service.js", { namedExports: { usedToday: async () => 0, dayKey: () => "" } });
mock.module("../src/services/ai-chat.service.js", { namedExports: { chatsStartedSince: async () => 0, getUserGeneratedImages: async () => [] } });

const { usageHistoryFor } = await import("../src/controllers/ai-plan-overview.controller.js");

const ME = "aaaaaaaaaaaaaaaaaaaaaaaa", OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const now = Date.now();
const ago = (ms) => new Date(now - ms);
const own = { ownNames: true, creditsOnly: true };
const reset = () => { spend = []; usage = []; };

test("a person whose plan covered everything sees 0 credits and no rows", async () => {
    reset();
    usage = [
        { userId: ME, createdAt: ago(1 * HOUR), provider: "cloudflare", model: "@cf/zai-org/glm-5.3", feature: "chat_ai", totalTokens: 134534, success: true },
        { userId: ME, createdAt: ago(2 * HOUR), provider: "anthropic", model: "claude-opus-5-5", feature: "chat_ai", totalTokens: 46402, success: true },
    ];
    const h = await usageHistoryFor(ME, {}, own);
    assert.deepEqual(h.total, { credits: 0, requests: 0 });
    assert.deepEqual(h.events, []);
    assert.equal(h.eventsTotal, 0);
    assert.equal(h.perDay.length, 14);
    assert.ok(h.perDay.every((d) => d.credits === 0 && d.requests === 0));
});

test("a person who spent credits sees the charges: total, day chart and rows, newest first", async () => {
    reset();
    usage = [{ userId: ME, createdAt: ago(1 * HOUR), provider: "cloudflare", model: "@cf/zai-org/glm-5.3", feature: "chat_ai", totalTokens: 999999, success: true }];
    spend = [
        { userId: ME, createdAt: ago(3 * HOUR), credits: 20000, pool: "bought", model: "@cf/zai-org/glm-5.3", what: "Chat" },
        { userId: ME, createdAt: ago(1 * HOUR), credits: 5000, pool: "bought", model: "Classgrid Image", what: "Image" },
        { userId: ME, createdAt: ago(2 * HOUR), credits: 319, pool: "gifted", model: "claude-haiku-5-5", what: "Chat title" },
    ];
    const h = await usageHistoryFor(ME, {}, own);
    assert.deepEqual(h.total, { credits: 25319, requests: 3 });
    assert.equal(h.eventsTotal, 3);
    assert.deepEqual(h.events.map((e) => [e.what, e.credits]), [["Image", 5000], ["Chat title", 319], ["Chat", 20000]]);
    assert.equal(h.perDay.reduce((a, d) => a + d.credits, 0), 25319);
    assert.equal(h.perDay.reduce((a, d) => a + d.requests, 0), 3);
    // (nothing about which credits paid is sent: credits are one balance to the person)
    assert.ok(h.events.every((e) => !("pool" in e)));
});

test("a charge older than the days asked for, and another person's charge, are never counted", async () => {
    reset();
    spend = [
        { userId: ME, createdAt: ago(2 * DAY), credits: 700, pool: "bought", model: "", what: "WhatsApp" },
        { userId: ME, createdAt: ago(20 * DAY), credits: 90000, pool: "bought", model: "", what: "Chat" },
        { userId: OTHER, createdAt: ago(1 * HOUR), credits: 50000, pool: "bought", model: "", what: "Chat" },
    ];
    const h = await usageHistoryFor(ME, { days: "14" }, own);
    assert.deepEqual(h.total, { credits: 700, requests: 1 });
    assert.deepEqual(h.events.map((e) => e.credits), [700]);
    const wide = await usageHistoryFor(ME, { days: "30" }, own);
    assert.equal(wide.total.credits, 90700);
});

test("a charge with no label reads Chat; a labelled one says what it paid for", async () => {
    reset();
    spend = [
        { userId: ME, createdAt: ago(2 * HOUR), credits: 10, pool: "gifted" },
        { userId: ME, createdAt: ago(1 * HOUR), credits: 2000, pool: "bought", model: "Classgrid Speech", what: "Voice input" },
    ];
    const h = await usageHistoryFor(ME, {}, own);
    assert.deepEqual(h.events.map((e) => [e.model, e.what]), [["Classgrid Speech", "Voice input"], ["", "Chat"]]);
});

test("voice, speech and picture models show Classgrid's own names; chat models keep theirs", async () => {
    reset();
    spend = [
        { userId: ME, createdAt: ago(4 * HOUR), credits: 1, pool: "bought", model: "eleven_v4_turbo", what: "Read aloud" },
        { userId: ME, createdAt: ago(3 * HOUR), credits: 1, pool: "bought", model: "elevenlabs/gpt-image-2.5-flare", what: "Image" },
        { userId: ME, createdAt: ago(2 * HOUR), credits: 1, pool: "bought", model: "scribe_v3", what: "Voice input" },
        { userId: ME, createdAt: ago(1 * HOUR), credits: 1, pool: "bought", model: "@cf/deepseek-ai/deepseek-v4.1-flash-1017", what: "Chat" },
    ];
    const h = await usageHistoryFor(ME, {}, own);
    assert.deepEqual(h.events.map((e) => e.model), ["@cf/deepseek-ai/deepseek-v4.1-flash-1017", "Classgrid Speech", "Classgrid Image", "Classgrid Voice"]);
    assert.ok(h.events.every((e) => !/eleven/i.test(`${e.model} ${e.provider}`)));
});

test("the rows come one page at a time", async () => {
    reset();
    spend = Array.from({ length: 7 }, (_, i) => ({ userId: ME, createdAt: ago((i + 1) * HOUR), credits: 100 + i, pool: "bought", model: "", what: "Chat" }));
    const first = await usageHistoryFor(ME, { limit: "3", page: "1" }, own);
    const last = await usageHistoryFor(ME, { limit: "3", page: "3" }, own);
    assert.deepEqual([first.pages, first.eventsTotal, first.events.length], [3, 7, 3]);
    assert.deepEqual(first.events.map((e) => e.credits), [100, 101, 102]);
    assert.deepEqual(last.events.map((e) => e.credits), [106]);
    assert.equal(first.total.credits, last.total.credits);
});

test("the super admin's page still shows every request from the usage log, with the real model", async () => {
    reset();
    usage = [
        { userId: ME, createdAt: ago(1 * HOUR), provider: "elevenlabs", model: "eleven_v4_turbo", feature: "chat_ai", totalTokens: 0, success: true },
        { userId: ME, createdAt: ago(2 * HOUR), provider: "cloudflare", model: "@cf/zai-org/glm-5.3", feature: "chat_ai", totalTokens: 20196, success: true },
        { userId: ME, createdAt: ago(3 * HOUR), provider: "cloudflare", model: "@cf/zai-org/glm-5.3", feature: "chat_ai", totalTokens: 5, success: false },
    ];
    spend = [{ userId: ME, createdAt: ago(1 * HOUR), credits: 77, pool: "bought", model: "", what: "Chat" }];
    const h = await usageHistoryFor(ME, {});
    assert.deepEqual(h.total, { credits: 20196, requests: 2 });
    assert.deepEqual(h.events.map((e) => [e.model, e.provider, e.what]), [["eleven_v4_turbo", "elevenlabs", "Read aloud"], ["@cf/zai-org/glm-5.3", "cloudflare", "Chat"]]);
});
