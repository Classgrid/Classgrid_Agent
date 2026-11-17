// The plan's weekly Claude credits run out in the middle of an answer: it goes on with the person's credits
// (owner, 2026-11-17: five helpers writing programs on Claude all stopped when the week's Claude credits ran out
// under them, with 45 crore gifted credits unused; "fix that so it starts in the middle").
// services/answer-meter.js spillPastPool and splitPoolCharge; the controller wires them into the live meter's hooks
// and into every place that charges the Claude credits (chargeClaudePool).
// Run: node --test tests/claude-pool-spill.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spillPastPool, splitPoolCharge, roundTokensLeft, roundInputTooBig, roundMaxOutput, addRound } from "../src/services/answer-meter.js";

const meterOf = (spendable, afterPool) => ({ spent: 0, spendable, stopped: false, firstRoundDone: true, ...(afterPool !== undefined ? { afterPool } : {}) });

test("what happened on 2026-11-17: 17 lakh of Claude credits left, five helpers use them up, and they go on with the credits", () => {
    const m = meterOf(1_670_000, 451_000_000);
    // the helpers' rounds use up what was left of the Claude credits
    for (let i = 0; i < 5; i++) addRound(m, `Helper ${i + 1}`, 340_000);
    assert.ok(m.spent > m.spendable, "the Claude credits are used up");
    // the old meter: the next round of each helper is refused
    assert.ok(roundTokensLeft({ ...m, afterPool: undefined }, "Helper 1") <= 0);
    // now: before the next round, the person's credits are added once, and the round runs
    assert.equal(spillPastPool(m, 1), true);
    assert.ok(roundTokensLeft(m, "Helper 1") > 400_000_000);
    assert.equal(spillPastPool(m, 1), false, "added once per answer");
    assert.equal(m.spendable, 1_670_000 + 451_000_000);
});

test("the switch happens before a round would be cut, not after: a big input or a short output room", () => {
    const m = meterOf(100_000, 1_000_000);
    addRound(m, "Agent", 90_000);
    // 10,000 left, and the next round's input alone costs 30,000: it is not refused, the credits come in first
    assert.equal(spillPastPool(m, 30_001), true);
    assert.equal(roundInputTooBig(m, "Agent", 30_000), false);
    // with the credits in, what the round may write is no longer squeezed to the 10,000 left
    assert.ok(roundMaxOutput(m, "Agent", 3) > 300_000);
});

test("nothing changes while the Claude credits still cover the round, or when the person has no credits", () => {
    const plenty = meterOf(5_000_000, 1_000_000);
    addRound(plenty, "Agent", 100_000);
    assert.equal(spillPastPool(plenty, 1), false);
    assert.equal(plenty.spendable, 5_000_000);
    const none = meterOf(100_000);
    addRound(none, "Agent", 100_000);
    assert.equal(spillPastPool(none, 1), false);
    assert.ok(roundTokensLeft(none, "Agent") <= 0, "with no credits the answer stops at the end of the Claude credits, as before");
    const zero = meterOf(100_000, 0);
    addRound(zero, "Agent", 100_000);
    assert.equal(spillPastPool(zero, 1), false);
    const unlimited = meterOf(undefined, 1_000_000);
    assert.equal(spillPastPool(unlimited, 1), false, "an unlimited answer has nothing to switch");
});

test("charging: the Claude credits up to what was left of them, the rest to the person's credits", () => {
    assert.deepEqual(splitPoolCharge(1_670_000, 500_000), { toPool: 500_000, past: 0 });
    assert.deepEqual(splitPoolCharge(1_670_000, 2_000_000), { toPool: 1_670_000, past: 330_000 });
    assert.deepEqual(splitPoolCharge(0, 2_000_000), { toPool: 0, past: 2_000_000 });
    assert.deepEqual(splitPoolCharge(-5, 100), { toPool: 0, past: 100 }, "a room that went below zero covers nothing");
    assert.deepEqual(splitPoolCharge(undefined, 2_000_000), { toPool: 2_000_000, past: 0 }, "unlimited Claude credits cover all");
    assert.deepEqual(splitPoolCharge(100, -3), { toPool: 0, past: 0 });
    // counted down across the charges of one answer (the room is what this answer had left)
    let room = 1_000;
    const charges = [600, 600, 600].map((c) => { const r = splitPoolCharge(room, c); room -= r.toPool; return r; });
    assert.deepEqual(charges, [{ toPool: 600, past: 0 }, { toPool: 400, past: 200 }, { toPool: 0, past: 600 }]);
});
