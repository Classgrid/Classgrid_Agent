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
    assert.ok(text.startsWith("the person's usage ran out while this helper was working, so it stopped before it finished. This is not a finished report."));
    // (it no longer forbids starting the helper again: the main AI starts the same helper again when the usage is
    // back, utils/helper-restart.js; tests/helper-goes-on.test.mjs)
    assert.equal(/do not start/i.test(text), false);
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
    assert.equal(free, "Error: no helper was started, because the Free plan allows 1 helper working at the same time in a chat and it is already working. Do not call run_project_helpers again now: it is refused until a helper finishes (its report reaches you by itself). Wait for a report or do that work yourself. Do not bring up the plan or this limit by yourself; only if the user asks why no more helpers are working, say that the Free plan allows 1 helper working at the same time in a chat.");
    assert.match(w.helpersBusyText({ maxHelpers: 3, planName: "Pro" }), /because the Pro plan allows 3 helpers working at the same time in a chat and they are already working\./);
    assert.match(w.helpersBusyText({ maxHelpers: 5, planName: "Max" }), /because at most 5 helpers can work at the same time in a chat and they are already working\./);
    assert.equal(w.helpersNotInPlanText("Free"), "Error: helpers are not included in the Free plan. Do the work yourself in this chat. Do not bring up the plan by yourself; only if the user asks for helpers or asks why none are working, say that their plan has none.");
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

test("a call: the real longest time of this call and why it ends, not '15 minutes' on every plan", () => {
    const free = w.callTimeWords({ maxMs: 5 * 60000, planName: "Free" });
    assert.equal(free.line, "The call can last at most 5 minutes (the longest call on the caller's Free plan). If the caller asks why a call ended, that is the reason.");
    assert.equal(free.ends, "[The call ends in about 15 seconds, because 5 minutes are the longest one call can be on the caller's Free plan. Say goodbye now. Give that reason only if the caller asks why the call is ending.]");
    const out = w.callTimeWords({ maxMs: 2 * 60000, planName: "Free", minutesRunOut: true });
    assert.match(out.line, /^The call can last at most 2 minutes \(the call minutes left on the caller's Free plan for this period\)\./);
    assert.match(out.ends, /because the call minutes of the caller's Free plan for this period are used up\./);
    const max = w.callTimeWords({ maxMs: 15 * 60000, planName: "Max" });
    assert.match(max.line, /^The call can last at most 15 minutes\. /);
    assert.match(max.ends, /because 15 minutes is the longest a call can be\./);
    assert.match(w.callTimeWords({ maxMs: 60000 }).line, /^The call can last at most 1 minute \(the longest call on the caller's plan\)\./);
});

test("a task from a call is told its minutes of work; a task with no cap is told nothing", () => {
    assert.match(w.workTimeNote(9 * 60000, 10 * 60000), /\[The caller's plan gives this task 10 minutes of work, and 9 minutes are left\. The work is stopped when the time runs out: do the most important part first, and send what you have before the time ends\.\]$/);
    assert.match(w.workTimeNote(40000, 10 * 60000), /and 1 minute is left\./);
    assert.equal(w.workTimeNote(Infinity, 0), "");
    assert.equal(w.workTimeNote(Infinity, undefined), "");
});

test("ask_classgrid on a call when the caller's usage is used up: plain words", () => {
    assert.equal(w.askRefusedForUsage(null), "Classgrid could not do it: the caller's plan usage limit is used up. Tell the caller that plainly, and do not ask Classgrid again on this call.");
    assert.match(w.askRefusedForUsage(new Date(Date.now() + 3600000).toISOString()), /is used up and comes back on .+ \(India time\)\. Tell the caller that plainly/);
});

test("a background task's run refused by the plan is told apart from a failed run and from the usage limit", () => {
    for (const code of ["chats_cap_reached", "model_locked", "claude_cap_reached", "fable_cap_reached"]) assert.equal(w.isPlanRefusal({ answer: "", error: "x", code }), true, code);
    // (the usage limit has its own pause, with the time it comes back)
    assert.equal(w.isPlanRefusal({ answer: "", error: "Insufficient tokens.", code: "ai_quota_exceeded", quota: { resetDate: null } }), false);
    assert.equal(w.isPlanRefusal({ answer: "", error: "the request failed (500)" }), false);
    assert.equal(w.isPlanRefusal({ answer: "Done.", code: "model_locked" }), false);
});

test("limits that were not checked where the AI works: the Library, a paid extra, the voice minutes", () => {
    const full = w.libraryFullNote({ planName: "Free", used: "590 MB", cap: "600 MB" });
    assert.match(full, /^\nNOT added to the user's Library: the Library of their Free plan is full \(590 MB of 600 MB used\)\. The link above works: /);
    assert.match(full, /give it to the user as usual\. Do not bring up the Library or the plan by yourself; only if the user asks where the file is in their Library, say it was not saved there because the Library is full/);
    assert.equal(w.paidFromCreditsNote("picture", "Pro"), " This picture was past the number the person's Pro plan includes for this period, so it was paid from their AI credits. Do not bring that up by yourself; say it only if the user asks about their limit or their credits.");
    assert.match(w.paidFromCreditsNote("message"), /past the number the person's plan includes/);
    assert.equal(w.notTranscribedText("You've used the 15 minutes of voice input a day of your Free plan. It refills on 25 Nov."), "NOT transcribed: You've used the 15 minutes of voice input a day of your Free plan. It refills on 25 Nov. Tell the user that plainly, and do not turn this sound into text another way.");
});

test("the note at the end of an answer the limit stopped says which limit and when it comes back", () => {
    const soon = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const usage = w.limitStopNote({ planName: "Free", resetAt: soon });
    assert.match(usage, /^_\(Stopped here: your Free plan's usage limit ran out while I was working\. It comes back on .+ \(India time\)\. Ask me to continue then\.\)_$/);
    const claude = w.limitStopNote({ planName: "Pro", claude: true, resetAt: soon });
    assert.match(claude, /^_\(Stopped here: this week's Claude credits of your Pro plan ran out while I was working\. They come back on .+\. Ask me to continue then, or pick another model to go on now\.\)_$/);
    const fable = w.limitStopNote({ planName: "Max", fable: true, resetAt: soon });
    assert.match(fable, /^_\(Stopped here: this week's Claude Fable share of your Max plan ran out while I was working\. It comes back on .+\. Ask me to continue then, or pick Sonnet or Opus to go on now\.\)_$/);
    // (the time is not known: the closing words are the old ones)
    assert.equal(w.limitStopNote({ planName: "Free" }), "_(Stopped here: your Free plan's usage limit ran out while I was working. When it comes back, ask me to continue.)_");
    assert.equal(w.limitStopNote(), "_(Stopped here: your plan's usage limit ran out while I was working. When it comes back, ask me to continue.)_");
});

test("an answer that ends with the stop note is known in the old words and in every new form", () => {
    const soon = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    assert.equal(w.isBudgetStop(`Half an answer.\n\n${STOP}`), true);
    for (const o of [{ planName: "Free", resetAt: soon }, { planName: "Pro", claude: true, resetAt: soon }, { planName: "Max", fable: true }, {}]) assert.equal(w.isBudgetStop(`Half an answer.\n\n${w.limitStopNote(o)}`), true, JSON.stringify(o));
    assert.equal(w.isBudgetStop("A whole answer about a plan's limit that ran out while I was working."), false);
    assert.equal(w.isBudgetStop(`${STOP}\n\nMore text after it.`), false);
});
