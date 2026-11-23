// A working helper's note to the main AI is handed over at once (owner, 2026-11-23: "the main agent sending a message
// to a subagent and the subagent sending one to the main agent is too slow"). Before, a note waited on the chat's
// board until the main AI called check_helpers by itself, which in practice was when the helper had finished.
// utils/helper-notes.js:
//   - takeNotes: the unread notes for the result of the main AI's next step, each given once
//   - sendNotes: the chat is not answering: it is woken with the note; answering: nothing is sent (the next step, or
//     the end of that answer, hands it over); a background task is woken, never from the end of its own run
// Run: node --experimental-test-module-mocks --test tests/helper-notes.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { takeNotes, wakeNoteOf, sendNotes, helpersWithNotes } = await import("../src/utils/helper-notes.js");

const helper = (over = {}) => ({ no: 1, task: "Find where the login token is checked", state: "running", notes: [], notesRead: 0, ...over });
const ways = (over = {}) => {
    const log = { wakes: [], taskWakes: 0 };
    return { log, hasTask: async () => false, wakeTask: async () => { log.taskWakes++; }, answering: async () => false, wake: async (note) => { log.wakes.push(note); }, ...over };
};

test("the main AI's next step carries every unread note, once", () => {
    const board = { helpers: [helper({ notes: ["Which branch should I use?"] }), helper({ no: 2, task: "Fix the tests", notes: ["old note", "The tests need Node 22."], notesRead: 1 }), helper({ no: 3 })] };
    const text = takeNotes(board);
    assert.ok(text.startsWith("[Message from Helper 1, still working]: Which branch should I use?\n\n[Message from Helper 2, still working]: The tests need Node 22."));
    assert.match(text, /\[To answer a helper, use message_helper: a helper that is waiting has your message at once/);
    assert.equal(text.includes("old note"), false);
    assert.equal(takeNotes(board), "", "given once");
    assert.deepEqual(helpersWithNotes(board), []);
    assert.equal(takeNotes(null), "");
    assert.equal(takeNotes({ helpers: [] }), "");
});

test("a helper that waits for the answer is said to be waiting; a finished one is said to be finished", () => {
    assert.match(takeNotes({ helpers: [helper({ notes: ["Push or not?"], waitingForMain: true })] }), /^\[Message from Helper 1, still working and is waiting for your answer\]: Push or not\?/);
    assert.match(takeNotes({ helpers: [helper({ notes: ["done early"], state: "done" })] }), /^\[Message from Helper 1, finished\]: done early/);
});

test("a workflow's helpers report through the workflow: their notes are not handed over here", () => {
    const board = { helpers: [helper({ notes: ["step 2 done"], quiet: true })] };
    assert.equal(takeNotes(board), "");
});

test("the chat is not answering: it is woken with the note at once", async () => {
    const h = helper({ notes: ["Which branch should I use?"], waitingForMain: true });
    const w = ways();
    assert.equal(await sendNotes({ board: { helpers: [h] }, ...w }), 1);
    assert.deepEqual(w.log.wakes, ["Helper 1 (Find where the login token is checked) says:\nWhich branch should I use?\n\n[Helper 1 is still working and is waiting for your answer.]"]);
    // (given once: nothing goes out a second time)
    assert.equal(await sendNotes({ board: { helpers: [h] }, ...w }), 0);
    assert.equal(w.log.wakes.length, 1);
});

test("the chat is answering: nothing is sent, the note waits for the next step; the end of that answer sends it", async () => {
    const h = helper({ notes: ["The build is broken on main."] });
    const board = { helpers: [h] };
    const w = ways({ answering: async () => true });
    assert.equal(await sendNotes({ board, ...w }), 0);
    assert.deepEqual(w.log.wakes, []);
    assert.equal(h.notesRead, 0, "still unread, for the next step");
    // the answer ended without another step
    assert.equal(await sendNotes({ board, answerEnded: true, ...w }), 1);
    assert.match(w.log.wakes[0], /^Helper 1 \(Find where the login token is checked\) says:\nThe build is broken on main\.\n\n\[Helper 1 is still working\.\]$/);
});

test("a note read with the main AI's step is not sent again at the end of the answer", async () => {
    const h = helper({ notes: ["A"] });
    const board = { helpers: [h] };
    assert.ok(takeNotes(board));
    const w = ways();
    assert.equal(await sendNotes({ board, answerEnded: true, ...w }), 0);
    assert.deepEqual(w.log.wakes, []);
});

test("a background task owns the chat: the task is woken, never from the end of its own run and not while it answers", async () => {
    const board = { helpers: [helper({ notes: ["Need the API key name."] })] };
    const idle = ways({ hasTask: async () => true });
    await sendNotes({ board, ...idle });
    assert.equal(idle.log.taskWakes, 1);
    assert.deepEqual(idle.log.wakes, []);
    const ended = ways({ hasTask: async () => true });
    await sendNotes({ board, answerEnded: true, ...ended });
    assert.equal(ended.log.taskWakes, 0);
    const busy = ways({ hasTask: async () => true, answering: async () => true });
    await sendNotes({ board, ...busy });
    assert.equal(busy.log.taskWakes, 0);
});

test("several notes of one helper go in one message, each helper in its own", async () => {
    const board = { helpers: [helper({ notes: ["one", "two"] }), helper({ no: 2, task: "B", notes: ["three"], state: "failed" })] };
    const w = ways();
    assert.equal(await sendNotes({ board, ...w }), 2);
    assert.equal(w.log.wakes[0], "Helper 1 (Find where the login token is checked) says:\none\ntwo\n\n[Helper 1 is still working.]");
    assert.equal(w.log.wakes[1], "Helper 2 (B) says:\nthree\n\n[Helper 2 has stopped working.]");
    assert.equal(wakeNoteOf(board.helpers[0]), "");
});

test("the wake-up message of a note is told apart from a finished job's by its first words", () => {
    // (chat-wake.service.js wakeQuestion picks the closing words by this)
    const isNote = (n) => /^Helper \d+ \([\s\S]*?\) says:\n/.test(n);
    assert.equal(isNote(wakeNoteOf(helper({ notes: ["hello"] }))), true);
    assert.equal(isNote("Helper 1 (Find where the login token is checked) finished:\nreport"), false);
});

// The words that close a wake-up message (chat-wake.service.js wakeQuestion). Owner's test, 2026-11-23: one helper's
// finding and another helper's question came in one message, the closing words said "a helper wrote this", and the
// main AI answered the first helper only; the one with the question waited 5 minutes for nothing.
const { mock } = await import("node:test");
mock.module("../src/config/redis.js", { defaultExport: {} });
mock.module("../src/models/User.js", { defaultExport: {} });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => null } });
const { wakeQuestion } = await import("../src/services/chat-wake.service.js");

test("one helper wrote: answer it; several wrote in one message: answer every one of them", () => {
    const one = wakeQuestion([wakeNoteOf(helper({ notes: ["Which branch?"] }))]);
    assert.ok(one.startsWith("[SYSTEM: background work you started in this chat sent you a message while you were not answering."));
    assert.match(one, /\n\nA helper of this chat wrote this to you\. If it asks something or needs a decision, answer it now with message_helper: a helper that is waiting has your message at once\./);

    const two = wakeQuestion([wakeNoteOf(helper({ notes: ["Finding 1"] })), wakeNoteOf(helper({ no: 3, task: "Scripts (and Sanity)", notes: ["Question: full or short?"], waitingForMain: true }))]);
    assert.match(two, /\n\nA helper of this chat wrote this to you \(2 helpers wrote, each in its own part above: Helper 1, Helper 3\)\. Answer every one of them that asks something or needs a decision, each with its own message_helper call, before you end this answer: a helper that is waiting/);
    assert.match(two, /Helper 3 is still working and is waiting for your answer\./);
    // (the chat screen cuts the closing words off at these first words: they stay the same)
    assert.equal(two.split("\n\nA helper of this chat wrote this to you").length, 2);
});

test("a finished report with a working helper's note in the same message: the note is still to be answered", () => {
    const mixed = wakeQuestion(["Helper 1 (A) finished:\nReport A\n\n[1 other helper of this chat is still working.]", wakeNoteOf(helper({ no: 2, task: "B", notes: ["Should I go on?"] }))]);
    assert.ok(mixed.startsWith("[SYSTEM: background work you started in this chat has finished while you were not answering."));
    assert.match(mixed, /\n\nTell the user the result now, /);
    assert.match(mixed, /A part above where a helper "says" something is a message from a helper that is still working \(Helper 2\): answer it with message_helper before you end this answer\.$/);
    // (nothing but finished work: the words are as they were)
    const done = wakeQuestion(["Helper 1 (A) finished:\nReport A"]);
    assert.ok(done.endsWith("If the user's task needs a next step, do it; otherwise don't start new long work."));
});
