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
