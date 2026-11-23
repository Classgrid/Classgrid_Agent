// What an answer ends with when a tool ends the run (utils/stop-answer.js). Until 2026-11-22 every sleeping answer
// had the fixed line "💤 Waiting for <time>. I'll continue then." under the AI's own words (owner: "that line is to
// remove, hardcoded"). It is now the answer only when the AI said nothing at all.
import test from "node:test";
import assert from "node:assert/strict";
import { stopAnswerText } from "../src/utils/stop-answer.js";

const WAITING = "💤 Waiting for 22 Nov 2026, 11:54 am. I'll continue then.";
// What sleep_until's handler returns (agent-task.service.js sleepFromTool): with a message, and with none
const sleep = (message) => ({
    text: "SLEEPING: your run ends now.",
    ...(message ? { stopAnswer: message } : { stopAnswer: WAITING, stopAnswerOnlyIfSilent: true }),
});

test("the AI's message is the answer, with no waiting line under it", () => {
    assert.equal(stopAnswerText("", sleep("The first sleep is set until 11:54.")), "The first sleep is set until 11:54.");
});

test("what the AI wrote before the call is the answer when it gave no message", () => {
    assert.equal(stopAnswerText("Which file should I use?", sleep("")), "Which file should I use?");
});

test("the same words written and given as the message are shown once", () => {
    const words = "It's 11:53 IST. The first sleep is set until 11:54 IST.";
    assert.equal(stopAnswerText(words, sleep(words)), words);
    assert.equal(stopAnswerText(`${words} I'll tell you both wake times.`, sleep(words)), `${words} I'll tell you both wake times.`);
    assert.equal(stopAnswerText(words, sleep(`${words} Then a second one.`)), `${words} Then a second one.`);
});

test("different words written and given as the message are both shown, the written ones first", () => {
    assert.equal(stopAnswerText("I pushed the fix.", sleep("I'll check the build at 12:00.")), "I pushed the fix.\n\nI'll check the build at 12:00.");
});

test("an AI that said nothing at all gets the waiting line, so the answer is never empty", () => {
    assert.equal(stopAnswerText("", sleep("")), WAITING);
    assert.equal(stopAnswerText("   ", sleep(undefined)), WAITING);
});

test("no sleeping answer has the waiting line when the AI said anything", () => {
    for (const [said, message] of [["I'll wait.", ""], ["", "Back at noon."], ["One.", "Two."]]) {
        assert.equal(stopAnswerText(said, sleep(message)).includes("💤"), false, `${said} / ${message}`);
    }
});

test("a tool with only its own closing text keeps it (end_conversation)", () => {
    assert.equal(stopAnswerText("", { text: "ENDED: the chat is now closed.", stopAnswer: "This conversation has ended." }), "This conversation has ended.");
});

test("nothing to show at all gives an empty text, not an error", () => {
    assert.equal(stopAnswerText("", {}), "");
    assert.equal(stopAnswerText(undefined, null), "");
});

// ── 2026-11-23: no sentence is written for the AI at all (owner: "this is hardcoded, and the emoji too") ──────────
// sleepWords decides what a sleeping answer says. With nothing said the sleep is not set: the AI is asked for its
// own words and calls again. The fixed "💤 Waiting for…" line above is only what older answers still hold.
const { sleepWords } = await import("../src/utils/stop-answer.js");

test("nothing said and no message: the sleep is not set, the AI is asked for its own words", () => {
    const r = sleepWords({ message: "", said: "", origin: "chat" });
    assert.match(r.refuse, /^ERROR: not sleeping yet\./);
    assert.match(r.refuse, /`message`: one short sentence in your own words/);
    assert.equal("stopAnswer" in r, false);
    // a chat's own line is only for tasks from WhatsApp
    assert.match(sleepWords({ chatLine: "Waiting for the build.", origin: "chat" }).refuse, /^ERROR: not sleeping yet\./);
    // whitespace is nothing
    assert.match(sleepWords({ message: "  ", said: "\n ", origin: "chat" }).refuse, /^ERROR: not sleeping yet\./);
});

test("the AI's message, or what it wrote before the call, is the whole answer: nothing is added", () => {
    assert.deepEqual(sleepWords({ message: "I'll check the build again at 6:30 pm.", origin: "chat" }), { stopAnswer: "I'll check the build again at 6:30 pm.", quiet: false });
    const wrote = sleepWords({ said: "Waiting for the VS Code session's reply.", origin: "chat" });
    assert.deepEqual(wrote, { stopAnswer: "", quiet: false });
    assert.equal(stopAnswerText("Waiting for the VS Code session's reply.", { text: "SLEEPING", stopAnswer: wrote.stopAnswer }), "Waiting for the VS Code session's reply.");
    for (const r of [sleepWords({ message: "x", origin: "chat" }), wrote]) assert.equal(/💤|Waiting for .* I'll continue then/.test(r.stopAnswer), false);
});

test("a task from WhatsApp: asked for message or chat_line; the chat's own line is never sent on WhatsApp", () => {
    const refused = sleepWords({ origin: "whatsapp" });
    assert.match(refused.refuse, /`message`.*sent to the person on WhatsApp/);
    assert.match(refused.refuse, /`chat_line`.*not sent on WhatsApp/);
    // only the chat's line: it is the answer, and the task is marked quiet (afterRunDecide then sends nothing)
    assert.deepEqual(sleepWords({ chatLine: "Waiting for their photo until 7 pm.", origin: "whatsapp" }), { stopAnswer: "Waiting for their photo until 7 pm.", quiet: true });
    // with a message, or words written before the call, everything in the answer goes to WhatsApp: the chat's line is left out
    assert.deepEqual(sleepWords({ message: "Send me the photo when you can.", chatLine: "Waiting for the photo.", origin: "whatsapp" }), { stopAnswer: "Send me the photo when you can.", quiet: false });
    assert.deepEqual(sleepWords({ said: "Which photo do you mean?", chatLine: "Waiting for the photo.", origin: "whatsapp" }), { stopAnswer: "", quiet: false });
});
