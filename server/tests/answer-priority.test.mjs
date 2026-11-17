// Priority at peak (services/answer-priority.service.js): at the set number of answers running at once, Max (plan
// priority) starts at once and everyone else waits in line, first come first served; 0 = no line.
// Run: node --experimental-test-module-mocks --test tests/answer-priority.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => ({ select: () => ({ lean: () => ({ catch: () => Promise.resolve({ peak_answers_at_once: 2 }) }) }) }) } });
const line = await import("../src/services/answer-priority.service.js");

const tick = () => new Promise((r) => setImmediate(r));

test("below the number every answer starts at once; at it others wait, first come first served", async () => {
    line._resetAnswerLine();
    const a = await line.takeAnswerPlace({ limitOverride: 2 });
    const b = await line.takeAnswerPlace({ limitOverride: 2 });
    const order = [];
    let waited = 0;
    const c = line.takeAnswerPlace({ limitOverride: 2, onWait: () => waited++ }).then((r) => { order.push("c"); return r; });
    const d = line.takeAnswerPlace({ limitOverride: 2, onWait: () => waited++ }).then((r) => { order.push("d"); return r; });
    await tick();
    assert.equal(waited, 2);
    assert.deepEqual(line.answerLineState(), { running: 2, waiting: 2 });
    a();
    const relC = await c;
    assert.deepEqual(order, ["c"]);
    b();
    const relD = await d;
    assert.deepEqual(order, ["c", "d"]);
    relC(); relD();
    assert.deepEqual(line.answerLineState(), { running: 0, waiting: 0 });
});

test("priority (Max) starts at once even at the peak", async () => {
    line._resetAnswerLine();
    const a = await line.takeAnswerPlace({ limitOverride: 1 });
    let waited = false;
    const p = await line.takeAnswerPlace({ limitOverride: 1, priority: true, onWait: () => { waited = true; } });
    assert.equal(waited, false);
    assert.equal(line.answerLineState().running, 2);
    a(); p();
});

test("closing the chat leaves the line; a release twice counts once; 0 = no line", async () => {
    line._resetAnswerLine();
    const a = await line.takeAnswerPlace({ limitOverride: 1 });
    const ctl = new AbortController();
    const waiting = line.takeAnswerPlace({ limitOverride: 1, signal: ctl.signal });
    await tick();
    ctl.abort();
    await assert.rejects(waiting, { name: "AbortError" });
    assert.deepEqual(line.answerLineState(), { running: 1, waiting: 0 });
    a(); a();
    assert.equal(line.answerLineState().running, 0);
    const many = await Promise.all([1, 2, 3, 4, 5].map(() => line.takeAnswerPlace({ limitOverride: 0 })));
    assert.equal(line.answerLineState().running, 5);
    many.forEach((r) => r());
});

test("the number comes from Global AI Config", async () => {
    line._resetAnswerLine();
    assert.equal(await line.peakAnswersAtOnce(), 2);
});
