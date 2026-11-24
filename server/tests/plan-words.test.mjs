// What the AI is told when the person's plan stops or shrinks something (utils/plan-words.js; owner, 2026-11-24:
// "find all limits and fix it so the AI knows its limit"). Each text has to say that it is the plan's limit, which
// one, and what to do, so the AI neither guesses nor promises what will be refused again.
// Run: node --test tests/plan-words.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const w = await import("../src/utils/plan-words.js");
const STOP = "_(Stopped here: your plan's limit ran out while I was working. When it comes back, ask me to continue.)_";

test("a helper cut by the limit: not a finished report, the note for the person is taken off, what it wrote is kept", () => {
    const text = w.helperLimitReport(`I read 3 of the 8 files.\nauth.js checks the token at line 10.\n\n${STOP}`, STOP);
    assert.ok(text.startsWith("the person's plan usage limit ran out while this helper was working, so it stopped before it finished. This is not a finished report."));
    assert.match(text, /Do not start this helper or any other again now: it is refused until the limit comes back\./);
    assert.match(text, /Tell the user plainly that their plan's usage limit ran out and that this part is not finished\./);
    assert.ok(text.endsWith("What it had written before it stopped:\nI read 3 of the 8 files.\nauth.js checks the token at line 10."));
    assert.equal(text.includes("ask me to continue"), false);
    // (it had written nothing yet)
    assert.equal(w.helperLimitReport(STOP, STOP).includes("What it had written"), false);
});

test("the file reader or writer cut by the limit: nothing is used, and no other way is tried", () => {
    assert.match(w.READER_LIMIT_ERROR, /^the person's plan usage limit ran out in the middle of it, so nothing was read or written\./);
    assert.match(w.READER_LIMIT_ERROR, /Do not try it again now and do not do it another way/);
});

test("a picture when the usage is used up: plain words with the time it comes back, not a code", () => {
    const soon = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const made = w.usageUsedUpText("made", soon);
    assert.match(made, /^NOT made: the person's plan usage limit is used up, and it comes back on .+ \(India time\)\. Do not call this tool again in this conversation and do not make the picture another way/);
    assert.match(made, /Tell the user plainly that their plan's usage limit is used up and when it comes back\.$/);
    assert.equal(made.includes("ai_quota_exceeded"), false);
    // (no time known, or a time already past: no time is said)
    assert.equal(w.usageUsedUpText("edited", null), "NOT edited: the person's plan usage limit is used up. Do not call this tool again in this conversation and do not make the picture another way (no code, SVG, canvas, HTML or outside links). Tell the user plainly that their plan's usage limit is used up.");
    assert.equal(w.comesBackText("2020-01-01T00:00:00Z"), "");
});

test("every helper the plan allows is working: the plan's number is named and no retry is invited", () => {
    const free = w.helpersBusyText({ maxHelpers: 1, planName: "Free" });
    assert.equal(free, "Error: no helper was started, because the Free plan allows 1 helper working at the same time in a chat and it is already working. Do not call run_project_helpers again now: it is refused until a helper finishes (its report reaches you by itself). Tell the user plainly that the Free plan allows 1 helper working at the same time in a chat, then wait for a report or do that work yourself.");
    assert.match(w.helpersBusyText({ maxHelpers: 3, planName: "Pro" }), /because the Pro plan allows 3 helpers working at the same time in a chat and they are already working\./);
    assert.match(w.helpersBusyText({ maxHelpers: 5, planName: "Max" }), /because at most 5 helpers can work at the same time in a chat and they are already working\./);
    assert.equal(w.helpersNotInPlanText("Free"), "Error: helpers are not included in the Free plan. Do the work yourself in this chat, and if the user asked for helpers, tell them plainly that their plan has none.");
});

test("a helper that runs on another model than the one asked for: the reason", () => {
    const base = { asked: "Claude Opus 5.5", askedId: "claude-opus-5-5", ran: "@cf/zai-org/glm-5.3", claude: true, planName: "Free" };
    assert.equal(w.helperModelWhy({ ...base, planHasClaude: false }), "Claude models are not in the person's Free plan");
    assert.equal(w.helperModelWhy({ ...base, planAllows: false }), "that model is not in the person's Free plan");
    assert.equal(w.helperModelWhy({ ...base, planName: "Pro", claudeLeft: false }), "this week's Claude credits of the person's Pro plan are used up");
    assert.equal(w.helperModelWhy({ ...base, askedId: "claude-fable-5-2", fable: true }), "Claude Fable is never used for a helper");
    assert.equal(w.helperModelWhy({ ...base, off: true }), "that model is turned off right now");
    assert.equal(w.helperModelWhy({ asked: "gpt-9", askedId: null, ran: "x" }), "Classgrid has no model of that name");
    // (it runs on the model asked for, or none was asked: nothing to say)
    assert.equal(w.helperModelWhy({ ...base, ran: "claude-opus-5-5" }), "");
    assert.equal(w.helperModelWhy({ asked: "", askedId: null, ran: "x" }), "");
});

test("the note under 'Started N helper(s)' lists only the helpers whose model changed", () => {
    assert.equal(w.helperModelNote([{ no: 1, askedName: "", ranName: "DeepSeek V4.1 Flash", why: "" }]), "");
    const note = w.helperModelNote([
        { no: 1, askedName: "Claude Opus 5.5", ranName: "GLM 5.3", why: "Claude models are not in the person's Free plan" },
        { no: 2, askedName: "", ranName: "DeepSeek V4.1 Flash", why: "" },
    ]);
    assert.equal(note, "\n\nNot on the model you asked for:\nHelper 1 runs on GLM 5.3, not Claude Opus 5.5: Claude models are not in the person's Free plan.\nGo on with these helpers as they are. Tell the user about it only if they asked for that model themselves.");
});

test("Deep thinking not in the plan, and older messages left out for the plan's context size", () => {
    assert.match(w.thinkingNotInPlanNote("Free"), /Deep thinking is not in their Free plan, so this answer is written at the Normal level\. Do not say that you thought deeply\./);
    assert.match(w.contextCutNote(1, "Free"), /The 1 oldest message of this chat is not in front of you: the user's Free plan carries a limited amount of a chat at once\./);
    assert.match(w.contextCutNote(12, "Pro"), /The 12 oldest messages of this chat are not in front of you/);
    assert.match(w.contextCutNote(12, "Pro"), /you can read them with recall_chat and search_recall_chat\. Never tell the user that something was not said: look it up first\.$/);
});
