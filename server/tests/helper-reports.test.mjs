// Helpers' reports reach the main AI whole, one message per helper (utils/helper-reports.js).
// Run: node --test tests/helper-reports.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { helperWakeNote, sendReports } from "../src/utils/helper-reports.js";

const helper = (no, report, more = {}) => ({ no, task: `task ${no}`, state: "done", report, notes: [], reportTaken: false, ...more });
const MAX = 80000;

// What reaches the chat: the notes, in order. answering() says whether the chat is answering right now.
const chat = ({ task = false, busy = false } = {}) => {
    const notes = [];
    const woken = [];
    return {
        notes, woken,
        opts: (board, extra = {}) => ({ board, max: MAX, hasTask: async () => task, wakeTask: async () => { woken.push("task"); }, answering: async () => busy, wake: async (n) => { notes.push(n); }, ...extra }),
    };
};

test("what happened on 2026-11-17: three long reports, each arrives whole in its own message", async () => {
    const reports = [1, 2, 3].map((n) => `REPORT-${n}-START ${"x".repeat(30000)} REPORT-${n}-END`);
    const board = { helpers: reports.map((r, i) => helper(i + 1, r)) };
    const c = chat();
    const sent = await sendReports(c.opts(board));
    assert.equal(sent.length, 3);
    assert.equal(c.notes.length, 3, "one message per helper");
    c.notes.forEach((note, i) => {
        assert.ok(note.includes(`REPORT-${i + 1}-START`) && note.includes(`REPORT-${i + 1}-END`), `report ${i + 1} is whole`);
        assert.ok(note.length <= MAX, "nothing for the sender to cut");
        for (const other of [1, 2, 3].filter((n) => n !== i + 1)) assert.ok(!note.includes(`REPORT-${other}-START`), "no other helper's report in it");
    });
    assert.ok(board.helpers.every((h) => h.reportTaken));
    // The old way put all three in one message of 12,000 characters: the second and third were not in it at all
    assert.ok(reports.join("\n\n").slice(0, 12000).includes("REPORT-2-START") === false);
});

test("a helper that finishes while others still work is sent at once, and the message says others are working", async () => {
    const board = { helpers: [helper(1, "first done"), helper(2, "", { state: "running" }), helper(3, "", { state: "running" })] };
    const c = chat();
    await sendReports(c.opts(board));
    assert.equal(c.notes.length, 1);
    assert.match(c.notes[0], /^Helper 1 \(task 1\) finished:\nfirst done/);
    assert.match(c.notes[0], /2 other helpers of this chat are still working/);
    assert.match(c.notes[0], /do not do their work again/);
    // the next one finishes: only its report goes out, the first is not sent twice
    board.helpers[1].state = "done";
    board.helpers[1].report = "second done";
    await sendReports(c.opts(board));
    assert.equal(c.notes.length, 2);
    assert.match(c.notes[1], /^Helper 2 \(task 2\) finished:\nsecond done/);
    assert.match(c.notes[1], /1 other helper of this chat is still working/);
    assert.ok(!c.notes[1].includes("first done"));
    // the last one
    board.helpers[2].state = "failed";
    board.helpers[2].report = "it broke";
    await sendReports(c.opts(board));
    assert.match(c.notes[2], /^Helper 3 \(task 3\) failed:\nit broke/);
    assert.match(c.notes[2], /No helper of this chat is working now/);
    await sendReports(c.opts(board));
    assert.equal(c.notes.length, 3, "nothing is sent twice");
});

test("while the chat is answering nothing is sent: the report stays readable, and goes out when that answer ends", async () => {
    // the helper finishes during an answer; the answer ends after three looks
    const board = { helpers: [helper(1, "done while the chat was answering")] };
    const c = chat();
    let looks = 0;
    const slept = [];
    const during = [];
    const sent = await sendReports(c.opts(board, {
        answering: async () => ++looks <= 3,
        sleep: async (ms) => { slept.push(ms); during.push({ notes: c.notes.length, taken: board.helpers[0].reportTaken }); },
    }));
    assert.equal(slept.length, 3);
    assert.ok(during.every((d) => d.notes === 0 && d.taken === false), "nothing sent and still readable with check_helpers while the chat answers");
    assert.equal(sent.length, 1);
    assert.equal(c.notes.length, 1);
    assert.equal(board.helpers[0].reportTaken, true);

    // the main AI reads it with check_helpers in that answer: the wait ends and nothing is sent
    const read = { helpers: [helper(1, "read in the answer")] };
    const c2 = chat({ busy: true });
    await sendReports(c2.opts(read, { sleep: async () => { read.helpers[0].reportTaken = true; } }));
    assert.equal(c2.notes.length, 0);

    // the end of an answer sends what was not read in it, without waiting (the chat still counts as answering then)
    const left = { helpers: [helper(1, "not read")] };
    const c3 = chat({ busy: true });
    await sendReports(c3.opts(left, { answerEnded: true, sleep: async () => assert.fail("no waiting at the end of an answer") }));
    assert.equal(c3.notes.length, 1);
    // two callers at once (the answer's end, and the helper's own wait) send it once
    const both = { helpers: [helper(1, "once")] };
    const c4 = chat();
    await Promise.all([sendReports(c4.opts(both)), sendReports(c4.opts(both, { answerEnded: true }))]);
    assert.equal(c4.notes.length, 1);
});

test("a background task is woken for each helper that finishes, and never from the end of its own run", async () => {
    const board = { helpers: [helper(1, "a"), helper(2, "", { state: "running" })] };
    const c = chat({ task: true });
    await sendReports(c.opts(board));
    // (until 2026-11-21 nothing happened here: the task was woken only when the last helper had finished, so on that
    // day three of the owner's five helpers finished and his chat was not woken once)
    assert.deepEqual(c.woken, ["task"], "woken for the first helper while the other still works");
    board.helpers[0].reportTaken = true; // the task read it with check_helpers
    board.helpers[1].state = "done";
    await sendReports(c.opts(board));
    assert.deepEqual(c.woken, ["task", "task"], "and again for the second");
    assert.equal(c.notes.length, 0, "the task reads the reports itself with check_helpers");
    await sendReports(c.opts(board, { answerEnded: true }));
    assert.deepEqual(c.woken, ["task", "task"], "the end of the task's own run does not wake it again");
});

test("a background task that is answering is woken when that answer ends, not lost", async () => {
    const board = { helpers: [helper(1, "a")] };
    const c = chat({ task: true });
    let busy = true;
    let looks = 0;
    await sendReports(c.opts(board, { answering: async () => { looks++; if (looks >= 3) busy = false; return busy; }, sleep: async () => {} }));
    assert.ok(looks >= 3, "it waited for the answer to end");
    assert.deepEqual(c.woken, ["task"]);
    // a report the task read during that answer needs no wake
    const c2 = chat({ task: true });
    const board2 = { helpers: [helper(1, "a")] };
    let n = 0;
    await sendReports(c2.opts(board2, { answering: async () => { n++; if (n === 2) board2.helpers[0].reportTaken = true; return n < 3; }, sleep: async () => {} }));
    assert.deepEqual(c2.woken, []);
});

test("a workflow's helpers and already read reports are left alone", async () => {
    const board = { helpers: [helper(1, "quiet", { quiet: true }), helper(2, "read", { reportTaken: true })] };
    const c = chat();
    assert.deepEqual(await sendReports(c.opts(board)), []);
    assert.equal(c.notes.length, 0);
});

test("a report too long even for its own message is not cut: the message says to read it with check_helpers, once", async () => {
    const board = { helpers: [helper(1, "y".repeat(500))] };
    const c = chat();
    await sendReports(c.opts(board, { max: 400 }));
    assert.equal(c.notes.length, 1);
    assert.match(c.notes[0], /Its report \(500 characters\) is too long for this message and is NOT in it: read it in full with check_helpers/);
    assert.ok(!c.notes[0].includes("yyyy"));
    assert.equal(board.helpers[0].reportTaken, false, "check_helpers still gives the whole report");
    await sendReports(c.opts(board, { max: 400, answerEnded: true }));
    assert.equal(c.notes.length, 1, "said once, not at the end of every answer");
});

test("the files a helper changed go with its own report", async () => {
    const board = { helpers: [helper(1, "edited"), helper(2, "edited too")] };
    const c = chat();
    await sendReports(c.opts(board, { changesText: (hs) => `\n\nFILES CHANGED IN PROJECT:\n+1 -0 file${hs[0].no}.js` }));
    assert.match(c.notes[0], /file1\.js/);
    assert.ok(!c.notes[0].includes("file2.js"));
    assert.match(c.notes[1], /file2\.js/);
});

test("helperWakeNote: whole reports while they fit, the rest named with where to read them; notes and failures kept", () => {
    const a = helper(1, "A".repeat(100), { notes: ["look at x", "and y"] });
    const b = helper(2, "B".repeat(5000));
    const c = helper(3, "C".repeat(50), { state: "failed" });
    const { text, given } = helperWakeNote([a, b, c], 1000);
    assert.deepEqual(given.map((h) => h.no), [1, 3]);
    assert.ok(text.includes("A".repeat(100)) && text.includes("Notes it sent: look at x | and y"));
    assert.ok(!text.includes("BBBB"));
    assert.match(text, /Helper 2 \(task 2\) finished\. Its report \(5000 characters\)/);
    assert.match(text, /Helper 3 \(task 3\) failed:\nC{50}/);
    assert.ok(text.length <= 1000);
    // everything fits: all given, nothing pointed at
    const all = helperWakeNote([a, b, c], 80000);
    assert.equal(all.given.length, 3);
    assert.ok(!all.text.includes("too long for this message"));
});
