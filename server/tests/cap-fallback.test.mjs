// When Cloudflare's free Neurons of the day are used up, text work moves to Claude (owner, 2026-11-17: "after
// finishing those, all fall back to Claude models, depending on the task: helpers use Sonnet, summary and titles
// use Claude"). Checked here (services/cap-fallback.service.js):
//   - nothing moves while the cap switch is off, or while today's count is under the cap
//   - at the cap: the harder main answer and helpers get Claude Sonnet; the short main answer, voice mode, titles, the
//     summary and the file reader get Claude Haiku
//   - a count that cannot be read counts as used up (the gate refuses Cloudflare then too); settings that cannot be
//     read leave Cloudflare in use
//   - no Claude without an Anthropic key, or with the Claude family switched off; a Claude model turned off in the
//     Model manager is replaced by the other one, and with both off nothing moves
//   - when the cap has just refused one request (the day is not used up yet), the same Claude model is named without
//     looking at the count; a job a stand-in finished is counted in two parts, each at its own model
// The cap's settings and count are stand-ins: no database, no Redis.
// Run: node --experimental-test-module-mocks --test tests/cap-fallback.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

let settings = { enabled: true, cap: 9500 };
let used = 0;
let usedFails = false;
let settingsFail = false;
mock.module("../src/services/cf-neuron-cap.service.js", {
    namedExports: {
        capSettings: async () => { if (settingsFail) throw new Error("no database"); return settings; },
        spokenForToday: async () => { if (usedFails) throw new Error("no redis"); return used; },
    },
});

const { cloudflareCapped, claudeWhenCapped, claudeFor, usageParts, forgetCapState, CAP_SONNET, CAP_HAIKU } = await import("../src/services/cap-fallback.service.js");

const set = ({ enabled = true, neurons = 0, noCount = false, noSettings = false, key = "sk-test" } = {}) => {
    settings = { enabled, cap: 9500 };
    used = neurons;
    usedFails = noCount;
    settingsFail = noSettings;
    if (key) process.env.ANTHROPIC_API_KEY = key; else delete process.env.ANTHROPIC_API_KEY;
    forgetCapState();
};

test("the switch off: nothing moves, however much is used", async () => {
    set({ enabled: false, neurons: 50000 });
    assert.equal(await cloudflareCapped(), false);
    assert.equal(await claudeWhenCapped("hard"), null);
});

test("under the cap: Cloudflare as usual", async () => {
    set({ neurons: 9499 });
    assert.equal(await cloudflareCapped(), false);
    for (const job of ["hard", "simple", "helper", "small"]) { forgetCapState(); assert.equal(await claudeWhenCapped(job), null); }
});

test("at the cap: each job gets its Claude model", async () => {
    set({ neurons: 9500 });
    assert.equal(await cloudflareCapped(), true);
    assert.equal(await claudeWhenCapped("hard"), CAP_HAIKU);
    assert.equal(await claudeWhenCapped("helper"), CAP_HAIKU);
    assert.equal(await claudeWhenCapped("simple"), CAP_HAIKU);
    assert.equal(await claudeWhenCapped("small"), CAP_HAIKU);
    assert.equal(await claudeWhenCapped("something else"), CAP_HAIKU);
    assert.equal(CAP_SONNET, "claude-sonnet-5-5");
    assert.equal(CAP_HAIKU, "claude-haiku-5-5");
});

test("a count that cannot be read counts as used up; settings that cannot be read do not", async () => {
    set({ noCount: true });
    assert.equal(await claudeWhenCapped("hard"), CAP_HAIKU);
    set({ noSettings: true, neurons: 50000 });
    assert.equal(await claudeWhenCapped("hard"), null);
});

test("no Anthropic key, or the Claude family switched off: nothing moves", async () => {
    set({ neurons: 20000, key: "" });
    assert.equal(await claudeWhenCapped("hard"), null);
    set({ neurons: 20000 });
    assert.equal(await claudeWhenCapped("hard", { claudeOff: true }), null);
});

test("only Haiku: Haiku turned off in the Model manager means nothing moves (never Sonnet)", async () => {
    set({ neurons: 20000 });
    assert.equal(await claudeWhenCapped("hard", { disabled: [CAP_SONNET] }), CAP_HAIKU);
    assert.equal(await claudeWhenCapped("small", { disabled: [CAP_HAIKU] }), null);
    assert.equal(await claudeWhenCapped("hard", { disabled: [CAP_SONNET, CAP_HAIKU] }), null);
});

test("the state is kept for a few seconds, then read again", async () => {
    set({ neurons: 100 });
    assert.equal(await cloudflareCapped(), false);
    used = 20000; // the day's count passes the cap
    assert.equal(await cloudflareCapped(), false); // still the kept answer
    assert.equal(await cloudflareCapped(Date.now() + 6000), true); // read again after 5 seconds
});

test("imageTypeOf: the picture types Claude reads, from the file's first bytes", async () => {
    const { imageTypeOf } = await import("../src/services/cap-fallback.service.js");
    assert.equal(imageTypeOf(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), "image/jpeg");
    assert.equal(imageTypeOf(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])), "image/png");
    assert.equal(imageTypeOf(Buffer.from("GIF89a....", "latin1")), "image/gif");
    assert.equal(imageTypeOf(Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBPVP8 ", "latin1")])), "image/webp");
    assert.equal(imageTypeOf(Buffer.from("%PDF-1.7 not a picture")), null);
    assert.equal(imageTypeOf(null), null);
});

test("claudeFor: the stand-in right after a refusal, whatever today's count is", async () => {
    set({ neurons: 100 }); // far under the cap: one big request was refused, the day is not used up
    assert.equal(await claudeWhenCapped("hard"), null);
    assert.equal(claudeFor("hard"), CAP_HAIKU);
    assert.equal(claudeFor("helper"), CAP_HAIKU);
    assert.equal(claudeFor("simple"), CAP_HAIKU);
    assert.equal(claudeFor("small"), CAP_HAIKU);
    assert.equal(claudeFor("hard", { disabled: [CAP_SONNET] }), CAP_HAIKU);
    assert.equal(claudeFor("hard", { disabled: [CAP_SONNET, CAP_HAIKU] }), null);
    assert.equal(claudeFor("hard", { claudeOff: true }), null);
    set({ neurons: 100, key: "" });
    assert.equal(claudeFor("hard"), null);
});

test("usageParts: a job a stand-in finished is counted in two parts, each at its own model", () => {
    const u = (n) => ({ prompt_tokens: n, completion_tokens: 1, total_tokens: n + 1 });
    assert.deepEqual(usageParts({ usage: u(10) }, "@cf/x"), [{ usage: u(10), model: "@cf/x" }]);
    assert.deepEqual(usageParts({ usage: null }, "@cf/x"), []);
    const finished = { usage: u(30), servedModel: CAP_HAIKU, standIn: { model: CAP_HAIKU, before: { model: "@cf/x", usage: u(20) } } };
    assert.deepEqual(usageParts(finished, "@cf/x"), [{ usage: u(20), model: "@cf/x" }, { usage: u(30), model: CAP_HAIKU }]);
    // refused at the first round: nothing was used on Cloudflare
    const fromStart = { usage: u(30), standIn: { model: CAP_SONNET, before: { model: "@cf/x", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } } } };
    assert.deepEqual(usageParts(fromStart, "@cf/x"), [{ usage: u(30), model: CAP_SONNET }]);
});
