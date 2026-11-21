// A read-aloud and a minute of voice input are cut as credits from what was really used, like a model's answer
// (services/ai-token-pricing.js speechCredits and listenCredits). Owner, 2026-11-21: "for Claude and Cloudflare
// credits are cut from what the provider reports; for ElevenLabs, where do they come from? fix it all". Until that
// day they cut no credits: only the plan's numbers a day counted them, whatever their length.
// The prices are ElevenLabs' own list prices (elevenlabs.io/pricing/api, read 2026-11-21): the voice v4 Turbo
// $0.04 per 1,000 characters, v3 $0.08; Scribe $0.20 per hour of sound. One credit is one input token of the
// baseline model ($1.32 per million). Checked here:
//   - the credits are the provider's price for what was used, in credits (never less than 1 for something used)
//   - a longer reading costs more, in proportion; nothing spoken or heard costs nothing
//   - the dearer voice costs twice the Turbo one; a voice not in the list counts at the dearest price
//   - bad numbers (negative, text, nothing) cost nothing
// Run: node --test tests/eleven-credits.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { speechCredits, listenCredits } from "../src/services/ai-token-pricing.js";

const USD_PER_CREDIT = 1.32 / 1e6;
const near = (credits, usd) => Math.abs(credits * USD_PER_CREDIT - usd) < USD_PER_CREDIT; // within one credit

test("a reading costs ElevenLabs' price for its characters", () => {
    assert.ok(near(speechCredits(1000, "eleven_v4_turbo"), 0.04));
    assert.ok(near(speechCredits(211, "eleven_v4_turbo"), 0.00844)); // (the real average reading, 14-21 Nov 2026)
    assert.ok(near(speechCredits(4000, "eleven_v4_turbo"), 0.16)); // (the longest one reading can be)
    assert.equal(speechCredits(4000, "eleven_v4_turbo"), 4 * speechCredits(1000, "eleven_v4_turbo"));
});

test("the dearer voice costs twice the Turbo one, and an unknown voice counts at the dearest price", () => {
    assert.equal(speechCredits(1000, "eleven_v3"), 2 * speechCredits(1000, "eleven_v4_turbo"));
    assert.equal(speechCredits(1000, "some_new_voice"), speechCredits(1000, "eleven_v3"));
    assert.equal(speechCredits(1000), speechCredits(1000, "eleven_v3"));
});

test("listening costs ElevenLabs' price for the seconds heard", () => {
    assert.ok(near(listenCredits(3600), 0.2));
    assert.ok(near(listenCredits(60), 0.2 / 60));
    assert.ok(Math.abs(listenCredits(120) - 2 * listenCredits(60)) <= 1); // (whole credits: off by one at most)
});

test("something used is never free, and nothing used costs nothing", () => {
    assert.equal(speechCredits(1, "eleven_v4_turbo") >= 1, true);
    assert.equal(listenCredits(0.2) >= 1, true);
    for (const bad of [0, -5, NaN, undefined, null, "abc"]) {
        assert.equal(speechCredits(bad, "eleven_v4_turbo"), 0);
        assert.equal(listenCredits(bad), 0);
    }
});
