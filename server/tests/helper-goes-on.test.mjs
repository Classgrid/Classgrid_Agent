// Helpers go on when the person has usage, and the same helper can be started again (owner, 2026-11-24: "when my
// usage gets over the helpers stop, but if I have credits they should continue... and when a helper gets stopped
// the main agent can't restart it; it should restart the same one, not start a new one").
//
// What happened: on 2026-11-24 07:39 UTC he gifted the account credits while its helpers were working near the end
// of the plan's session. At 07:44 both helpers stopped with "the user's tokens ran out", 9 crore credits unused: what
// an answer may use was read once, when it started. The main AI was then told "do not start this helper or any other
// again now: it is refused until the limit comes back" and answered "I can't restart it right now".
//
// Checked here:
//   1. services/answer-meter.js: the meter is raised to the real balance (refillMeter), with what the answer has not
//      been charged for yet still coming out of it (noteSettled), and it is read again only when low (meterLow)
//   2. services/llm-stream.js: the model loop waits for that reading before every round (beforeRound), so a helper
//      whose meter was at its end goes on, and without more to use it stops as before
//   3. the loop goes on from a kept conversation with a note at its end, and hands back the conversation after every
//      finished round (what the same helper is started again from)
//   4. utils/helper-restart.js: which helper is started again, what it carries on with, and what the main AI is told
// The models are stand-ins: nothing is sent anywhere.
// Run: node --experimental-test-module-mocks --test tests/helper-goes-on.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

let script = []; // what the model answers, one entry per request
const sent = [];
mock.module("../src/services/cf-neuron-cap.service.js", {
    namedExports: {
        isCfNeuronCapError: () => false,
        cfAiFetch: async (url, init) => {
            const next = script.shift();
            if (!next) throw new Error("no more answers in the script");
            sent.push(JSON.parse(init.body));
            const text = next.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
            return new Response(text, { status: 200, headers: { "content-type": "text/event-stream" } });
        },
    },
});

const meter = await import("../src/services/answer-meter.js");
const { streamChat } = await import("../src/services/llm-stream.js");
const restart = await import("../src/utils/helper-restart.js");
const words = await import("../src/utils/plan-words.js");

const provider = { name: "cloudflare", url: "https://api.cloudflare.com/client/v4/accounts/acc/ai/v1/chat/completions", apiKey: "k", model: "@cf/zai-org/glm-5.3" };
const tools = [{ type: "function", function: { name: "lookup", description: "look something up", parameters: { type: "object", properties: { q: { type: "string" } } } } }];
const messages = [{ role: "system", content: "You are a helper." }, { role: "user", content: "Explore the project." }];
const toolRound = (id) => [
    { choices: [{ delta: { content: "Looking. ", tool_calls: [{ index: 0, id, function: { name: "lookup", arguments: "{\"q\":\"x\"}" } }] } }], usage: { prompt_tokens: 100, completion_tokens: 5, total_tokens: 105 } },
    { choices: [{ delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } },
];
const lastRound = (text) => [
    { choices: [{ delta: { content: text } }], usage: { prompt_tokens: 200, completion_tokens: 20, total_tokens: 220 } },
    { choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 200, completion_tokens: 20, total_tokens: 220 } },
];
const newMeter = (spendable) => ({ spent: 0, spendable, stopped: false, firstRoundDone: false });
// The hooks the chat gives a helper (ai-chat.controller.js meterHooks), with the real meter rules; 1 token = 1 credit
const hooksFor = (m, who, readBalance) => {
    let lastCost = 0;
    return {
        beforeRound: async () => { if (readBalance && meter.meterLow(m, lastCost)) meter.refillMeter(m, await readBalance()); },
        onRoundUsage: (u, { cut } = {}) => { lastCost = u.total_tokens; meter.addRound(m, who, u.total_tokens, !!cut); },
        tokensLeft: () => meter.roundTokensLeft(m, who),
        maxOutputTokens: () => meter.roundMaxOutput(m, who, 1),
        inputTooBig: (u) => meter.roundInputTooBig(m, who, u.total_tokens),
    };
};

// ── 1. The meter ──

test("the meter is raised to the real balance, and never lowered from it", () => {
    const m = newMeter(50000); // (what was left of the session when the answer started, no credits yet)
    meter.addRound(m, "Helper 1", 49000);
    // 9 crore credits were gifted meanwhile
    assert.equal(meter.refillMeter(m, 90000000), true);
    assert.equal(m.spendable, 90000000);
    assert.equal(meter.roundTokensLeft(m, "Helper 1"), 90000000 - 49000);
    // (the account holds less than the meter allows: other chats used it; the meter stays, the charge stops at the balance)
    assert.equal(meter.refillMeter(m, 1000), false);
    assert.equal(m.spendable, 90000000);
    // (no limit: nothing to follow)
    const free = newMeter(undefined);
    assert.equal(meter.refillMeter(free, 5), false);
    assert.equal(free.spendable, undefined);
    assert.equal(meter.refillMeter(m, NaN), false);
});

test("what the answer has not been charged for yet still comes out of the balance", () => {
    // Two helpers used 300 and 200. The first has ended and was charged (settled); the second is still working, so
    // its 200 are not out of the account yet. The account now holds 1,000.
    const m = newMeter(400);
    meter.addRound(m, "Helper 1", 300);
    meter.addRound(m, "Helper 2", 200);
    meter.noteSettled(m, 300);
    assert.equal(meter.refillMeter(m, 1000), true);
    // really left: 1,000 less the 200 still to be charged
    assert.equal(meter.roundTokensLeft(m, "Helper 2"), 800);
    // the second helper ends and is charged: the account holds 800 and nothing is waiting; the same reading again
    meter.noteSettled(m, 200);
    assert.equal(meter.refillMeter(m, 800), false);
    assert.equal(meter.roundTokensLeft(m, "Helper 2"), 800);
    // nothing in the account and nothing settled since: the meter cannot go up, however often it is read
    const none = newMeter(100);
    meter.addRound(none, "Helper 1", 100);
    assert.equal(meter.refillMeter(none, 0), false);
    assert.equal(meter.roundTokensLeft(none, "Helper 1"), 0);
});

test("the balance is read again only when the meter is low", () => {
    const rich = newMeter(90000000);
    meter.addRound(rich, "Helper 1", 150000);
    assert.equal(meter.meterLow(rich, 150000), false, "crores left: never read again");
    const near = newMeter(1000000);
    meter.addRound(near, "Helper 1", 700000);
    assert.equal(meter.meterLow(near, 100000), true, "the next rounds may not fit");
    assert.equal(meter.meterLow(newMeter(100000), 0), true, "a small plan is always low");
    assert.equal(meter.meterLow(newMeter(undefined), 5000), false);
    assert.ok(meter.METER_REFRESH_MS >= 5000, "not on every round");
});

// ── 2. The model loop waits for the reading ──

test("what happened on 2026-11-24: credits come in while a helper works, and it goes on", async () => {
    script = [toolRound("call_a"), toolRound("call_b"), lastRound("The report.")];
    sent.length = 0;
    const m = newMeter(150); // (the end of the plan's session; the first round costs 110)
    let account = 40; // what the account holds; then the credits are gifted
    const reads = [];
    const r = await streamChat({
        provider, messages, tools, maxTokens: 1000, maxToolDepth: 10,
        toolHandlers: { lookup: async () => { account = 5000; return "found x"; } },
        ...hooksFor(m, "Helper 1", async () => { reads.push(account); return account; }),
    });
    assert.equal(r.stoppedForBudget, undefined, "it was not stopped");
    assert.equal(r.answer, "The report.");
    assert.equal(sent.length, 3, "all three rounds ran");
    assert.ok(reads.includes(5000), "the new balance was read before a round");
    assert.equal(m.spent, 440);
});

test("with nothing more to use it stops as before, and says so", async () => {
    script = [toolRound("call_a"), toolRound("call_b"), lastRound("The report.")];
    sent.length = 0;
    const m = newMeter(150);
    const r = await streamChat({
        provider, messages, tools, maxTokens: 1000, maxToolDepth: 10,
        toolHandlers: { lookup: async () => "found x" },
        ...hooksFor(m, "Helper 1", async () => 0),
    });
    assert.equal(r.stoppedForBudget, true);
    assert.ok(sent.length < 3, "the rounds past the limit were not run to the end");
    // (and the old way, with no reading at all, is the same stop: what he saw)
    script = [toolRound("call_a"), toolRound("call_b"), lastRound("The report.")];
    const old = await streamChat({ provider, messages, tools, maxTokens: 1000, maxToolDepth: 10, toolHandlers: { lookup: async () => "found x" }, ...hooksFor(newMeter(150), "Helper 1", null) });
    assert.equal(old.stoppedForBudget, true);
});

test("a reading that fails never stops or breaks the round", async () => {
    script = [lastRound("Done.")];
    const r = await streamChat({ provider, messages, tools, maxTokens: 1000, beforeRound: async () => { throw new Error("the database is away"); } });
    assert.equal(r.answer, "Done.");
});

// ── 3. The same conversation goes on ──

test("the conversation is handed back after every finished round, and the loop goes on from it with the note", async () => {
    // First run: one round with a tool, then it is cut (here: stopped right after the step). What was kept is the
    // helper's work up to its last finished round.
    script = [toolRound("call_a")];
    sent.length = 0;
    const h = { no: 2, state: "running", steps: [], live: "", changes: new Map() };
    const cut = new AbortController();
    await assert.rejects(streamChat({
        provider, messages, tools, maxTokens: 1000, maxToolDepth: 10, signal: cut.signal,
        toolHandlers: { lookup: async () => "found x in auth.js line 10" },
        onConversation: (kept) => { h.saved = { shape: "cf", conversation: kept.slice() }; cut.abort(); },
    }));
    assert.deepEqual(h.saved.conversation.map((x) => x.role), ["system", "user", "assistant", "tool"]);
    h.state = "failed";

    // Started again: the same helper, from where it stopped
    const again = restart.reviveHelper(h, { said: "Look at login too." }).again;
    assert.equal(h.state, "running");
    assert.equal(h.restarts, 1);
    const goOn = restart.resumeFrom(h.saved, "cf", again.note);
    assert.equal(goOn.resumeProvider, "cf");
    script = [lastRound("Report from where I stopped.")];
    sent.length = 0;
    const r = await streamChat({ provider, messages, tools, maxTokens: 1000, maxToolDepth: 10, toolHandlers: { lookup: async () => "again" }, ...goOn });
    assert.equal(r.answer, "Report from where I stopped.");
    const got = sent[0].messages;
    assert.deepEqual(got.map((x) => x.role), ["system", "user", "assistant", "tool", "user"], "its earlier work is in front of it");
    assert.equal(got[3].content, "found x in auth.js line 10");
    assert.match(got[4].content, /^\[You were stopped before the work was finished/);
    assert.match(got[4].content, /The main AI has started you again now\. Carry on from where you stopped/);
    assert.match(got[4].content, /The main AI says: Look at login too\.\]$/);
    // (the kept conversation itself is not changed by going on from it)
    assert.equal(h.saved.conversation.length, 4);
});

test("a kept conversation in the other loop's shape: turned into Claude's, never handed to another model as it is", () => {
    const cf = { shape: "cf", conversation: [{ role: "system", content: "s" }, { role: "user", content: "task" }, { role: "assistant", content: "", tool_calls: [{ id: "a" }] }, { role: "tool", tool_call_id: "a", content: "r" }] };
    const toClaude = (c) => [{ role: "user", content: [{ type: "text", text: "task" }] }, { role: "assistant", content: [{ type: "tool_use", id: "a", name: "lookup", input: {} }] }, { role: "user", content: [{ type: "tool_result", tool_use_id: "a", content: `r of ${c.length}` }] }];
    const claude = restart.resumeFrom(cf, "claude", "[note]", toClaude);
    assert.equal(claude.resumeProvider, "claude");
    const last = claude.resumeConversation[claude.resumeConversation.length - 1];
    assert.equal(last.role, "user");
    assert.deepEqual(last.content.map((b) => b.type), ["tool_result", "text"], "the note is one more block after the results");
    assert.equal(last.content[1].text, "[note]");
    // Claude's own kept conversation: the note joins its last message, the kept copy is untouched
    const kept = { shape: "claude", conversation: toClaude(cf.conversation) };
    const own = restart.resumeFrom(kept, "claude", "[note]");
    assert.equal(own.resumeConversation.length, 3);
    assert.equal(kept.conversation[2].content.length, 1);
    // Claude's shape for another model, or nothing kept: no conversation to go on from (it gets the record of its steps)
    assert.equal(restart.resumeFrom(kept, "cf", "[note]"), null);
    assert.equal(restart.resumeFrom(cf, "claude", "[note]"), null, "no way to turn it");
    assert.equal(restart.resumeFrom(null, "cf", "[note]"), null);
    assert.equal(restart.resumeFrom({ shape: "cf", conversation: [] }, "cf", "[note]"), null);
});

// ── 4. Which helper, and what is said ──

const helper = (no, more = {}) => ({ no, task: `task ${no}`, state: "failed", report: "it had a problem on its side", reportTaken: true, endedAt: Date.now() - 60000, steps: [], notes: [], changes: new Map(), ...more });

test("the same helper is found by its number; a working one and an unknown one are refused with the reason", () => {
    const helpers = [helper(1, { state: "running" }), helper(2), helper(3, { state: "done" })];
    assert.equal(restart.helperToRestart(helpers, 2).helper, helpers[1]);
    assert.equal(restart.helperToRestart(helpers, "3").helper, helpers[2], "a finished one can be started again too");
    assert.match(restart.helperToRestart(helpers, 1).error, /^Error: Helper 1 is still working, so it is not started again\. Send it a message with message_helper\./);
    assert.match(restart.helperToRestart(helpers, 9).error, /^Error: there is no Helper 9 in this chat to start again \(the helpers here: 1, 2, 3\)\./);
});

test("a stopped helper stays on the board so it can be started again, for a while", () => {
    const now = Date.now();
    const helpers = [
        helper(1, { state: "running" }),
        helper(2), // stopped a minute ago, report read
        helper(3, { state: "done" }), // finished, report read: goes, as before
        helper(4, { state: "done", reportTaken: false }), // report not read yet: stays, as before
        helper(5, { endedAt: now - restart.RESTART_KEEP_MS - 1000 }), // stopped long ago
    ];
    assert.deepEqual(restart.keptHelpers(helpers, now).map((h) => h.no), [1, 2, 4]);
    // (only the newest few stopped ones)
    const many = Array.from({ length: 8 }, (_, i) => helper(i + 1));
    assert.deepEqual(restart.keptHelpers(many, now).map((h) => h.no), [4, 5, 6, 7, 8]);
    // a helper that ended long ago no longer keeps its conversation
    const old = helper(6, { endedAt: now - restart.RESTART_KEEP_MS - 1000, saved: { shape: "cf", conversation: [{}] } });
    const fresh = helper(7, { saved: { shape: "cf", conversation: [{}] } });
    restart.forgetOldWork([old, fresh], now);
    assert.equal(old.saved, undefined);
    assert.ok(fresh.saved);
});

test("started again, it is the same record: its number, task, steps and files stay, its report and stop are cleared", () => {
    const h = helper(2, {
        title: "Check the login", limitStop: true, mainNote: "x", reportTold: true, live: "I read 3 of 8 files.",
        steps: [{ id: "h0-0", tool: "view_project_file", args: { path: "auth.js" }, result: "export const login = ...", status: "success" }, { id: "h0-1", tool: "main_message", args: { message: "hi" }, result: "Read." }],
        changes: new Map([["auth.js", { added: 4, removed: 1 }]]), notes: ["a note"], tokens: 900, startedAt: 5,
    });
    const steps = h.steps;
    const same = restart.reviveHelper(h, { said: "", now: 77 });
    assert.equal(same, h);
    assert.deepEqual([h.no, h.task, h.title, h.tokens, h.startedAt], [2, "task 2", "Check the login", 900, 5]);
    assert.equal(h.steps, steps);
    assert.deepEqual([h.state, h.report, h.mainNote, h.reportTaken, h.reportTold, h.limitStop, h.endedAt, h.restarts, h.restartedAt], ["running", "", "", false, false, false, null, 1, 77]);
    assert.equal(h.abort.signal.aborted, false);
    // what it carries on with says why it stopped (worked out before the record was cleared)
    assert.match(h.again.note, /because the person's usage ran out at that moment/);
    assert.equal(h.again.note.includes("The main AI says"), false);
    // without a kept conversation: the record of its steps, the files it changed and what it had written
    assert.match(h.again.text, /^\[You are started again: this job stopped before it was finished, because the person's usage ran out at that moment\./);
    assert.match(h.again.text, /Your steps so far \(1\):\n1\. view_project_file \{"path":"auth\.js"\} -> export const login = \.\.\./);
    assert.match(h.again.text, /Files you changed: auth\.js \(\+4 -1\)/);
    assert.match(h.again.text, /What you had written when you stopped:\nI read 3 of 8 files\./);
    assert.match(h.again.text, /Do not do again what is already done\.\]$/);
    // a second time
    h.state = "failed";
    restart.reviveHelper(h);
    assert.equal(h.restarts, 2);
});

test("what the main AI is told: start the same helper again, never 'do not start it again'", () => {
    const hint = restart.restartHint(3);
    assert.match(hint, /start this same helper again yourself, without asking: run_project_helpers with helpers: \[\{ restart_helper: 3 \}\]/);
    assert.match(hint, /It carries on from where it stopped\./);
    assert.match(hint, /do not start it a third time in this turn/);
    const limit = restart.limitRestartHint(3);
    assert.match(limit, /the person's usage may be back \(the limit came back, or credits were added\): start this same helper again with run_project_helpers, helpers: \[\{ restart_helper: 3 \}\]/);
    assert.match(limit, /If that is refused, or it stops the same way again, do not try again in this turn/);
    // the report of a helper the usage stopped no longer forbids starting it again
    const report = words.helperLimitReport("I read 3 of the 8 files.\n\nSTOP", "STOP");
    assert.equal(/do not start/i.test(report), false);
    assert.match(report, /^the person's usage ran out while this helper was working, so it stopped before it finished\. This is not a finished report\./);
    // usage still used up when the main AI tries: refused with the time it comes back, and not tried again
    const soon = words.comesBackText(new Date(Date.now() + 3 * 3600 * 1000).toISOString());
    assert.match(restart.stillUsedUpText(3, soon), /^Error: Helper 3 was not started again: the person's usage is still used up, and it comes back on .+ \(India time\)\. Do not try again in this turn\./);
    assert.match(restart.stillUsedUpText(3), /^Error: Helper 3 was not started again: the person's usage is still used up\. Do not try again in this turn\./);
});

test("the note for the main AI goes with the report it is sent, and is not part of the report the person sees", async () => {
    const { sendReports } = await import("../src/utils/helper-reports.js");
    const h = helper(2, { reportTaken: false, mainNote: restart.restartHint(2) });
    const notes = [];
    await sendReports({ board: { helpers: [h] }, max: 80000, hasTask: async () => false, wakeTask: async () => {}, answering: async () => false, wake: async (n) => { notes.push(n); } });
    assert.equal(notes.length, 1);
    assert.match(notes[0], /Helper 2 \(task 2\) failed:\nit had a problem on its side/);
    assert.match(notes[0], /restart_helper: 2/);
    assert.equal(h.report.includes("restart_helper"), false);
});
