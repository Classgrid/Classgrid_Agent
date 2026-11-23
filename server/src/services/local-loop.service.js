// The app drives the AI's loop (owner, 2026-11-09: "the loop runs on the PC, like Claude Code"), for every model.
// The model loops in llm-stream.js and llm-stream-anthropic.js keep speaking each model's own language; what they hand
// over here is the decision: after each model round they give the app the tool calls the model asked for
// (`round_end`), and the app says which to run and in what order (`run`, one at a time), skips the rest (`skip`), and
// closes the round (`round_done`). Steps on the computer then run in the app itself (pc_tool_call, local-runner
// pcExecutors); online tools run on the server. The app can stop the answer at once (`stop`). The answer streams on the
// durable turn (durable-turn.service.js), so the app's internet dropping loses nothing.
// Commands come in over HTTP: POST /api/ai/turn/:id/cmd.
import { StreamChatError } from "./llm-stream.js";
import { helperScope } from "../utils/step-scope.js";

// An app that is on the answer's stream but never drives a round (an older app, its commands not getting through):
// the server runs what is left itself, so the answer doesn't wait for ever. A stopped answer never gets here (below).
const ROUND_WAIT_MS = 15 * 60 * 1000;
const loops = new Map(); // turnId -> { userId, rounds: Map<roundId, Round>, nextRound, emit, onStop, stopped }

/**
 * Makes the driver for one answer. `driver(calls, { run, text })` is what the model loops call after a round with
 * tool calls; it resolves with a Map(callId -> { content, isError }) once the app has driven the round.
 * `signal`: the answer's own stop (streamAbort in streamAskAi). Every way an answer is stopped aborts it: the app's
 * Stop, the durable turn's grace running out with no app on the stream, a newer message in the chat. Each of them
 * ends a round's wait at once and its steps never run (found during the owner's Remote PC work, 2026-11-18: only the
 * app's Stop command did; after the other stops the answer hung on the round until the 15-minute timer, which then
 * ran the steps on the user's PC through the runner socket, after the answer had stopped).
 */
export function makeLocalLoopDriver({ turnId, userId, emit, onStop, signal = null }) {
    const state = { userId: String(userId), rounds: new Map(), nextRound: 0, emit, onStop, stopped: false, disposed: false };
    loops.set(turnId, state);
    const onAbort = () => stopLoop(state);
    if (signal?.aborted) stopLoop(state);
    else signal?.addEventListener?.("abort", onAbort, { once: true });
    // `helper`: which helper's round this is (helpers are driven by the app too, each round on its own); the main
    // answer's rounds carry none. Once the answer has ended (dispose), a helper still working gets null back and its
    // loop runs the calls itself, as the app's stream is gone.
    const driverFor = (helper) => async (calls, { run, text }) => {
        if (state.stopped || signal?.aborted) { stopLoop(state); throw new StreamChatError("Request aborted"); }
        if (state.disposed) return null;
        const roundId = ++state.nextRound;
        return new Promise((resolve, reject) => {
            const round = {
                calls, run, resolve, reject, helper,
                outcomes: new Map(),
                queue: Promise.resolve(), // runs happen one at a time, in the order the app asks
                closed: false,
                timer: setTimeout(() => finishRound(state, roundId, "the app did not drive this round in time, so the server ran it").catch(() => {}), ROUND_WAIT_MS),
            };
            round.timer.unref?.();
            state.rounds.set(roundId, round);
            emit({ type: "round_end", roundId, ...(helper !== undefined && helper !== null ? { helper } : {}), calls: calls.map((c) => ({ id: c.id, name: c.name, input: c.input })), text: String(text || "").slice(0, 4000) });
        });
    };
    const driver = driverFor(null);
    const dispose = () => {
        state.disposed = true;
        signal?.removeEventListener?.("abort", onAbort);
        if (loops.get(turnId) === state) loops.delete(turnId);
        // Rounds still open when the answer ends (a helper's): the server finishes them itself
        for (const [roundId] of state.rounds) finishRound(state, roundId, "the answer ended, so the server ran the rest").catch(() => {});
    };
    return { driver, driverFor, dispose };
}

async function runOne(state, roundId, round, id) {
    if (round.outcomes.has(id)) return;
    const call = round.calls.find((c) => c.id === id);
    if (!call) return;
    // A run the app asked for that had not started when the answer stopped: it never starts
    if (state.stopped) { round.outcomes.set(id, { ...NOT_RUN }); return; }
    let out;
    // (a helper's round: its step runs marked as a helper's. This call comes from the app's HTTP command, outside
    // the helper's own chain, so the mark is put here: utils/step-scope.js)
    const ofHelper = round.helper !== undefined && round.helper !== null;
    try { out = await (ofHelper ? helperScope.run({ helper: round.helper }, () => round.run(id)) : round.run(id)); } catch (e) { out = { content: `Tool error: ${e?.message || e}`, isError: true }; }
    round.outcomes.set(id, out || { content: "", isError: false });
    state.emit({ type: "tool_done", roundId, id, name: call.name, isError: !!out?.isError });
}

const NOT_RUN = { content: "Not run: the app skipped this call.", isError: true };

// Closes a round: whatever the app didn't ask for is run by the server when the app went quiet (`ranByServer`), or
// marked "not run" when the app closed the round on purpose
async function finishRound(state, roundId, ranByServer) {
    const round = state.rounds.get(roundId);
    if (!round || round.closed) return;
    round.closed = true;
    clearTimeout(round.timer);
    await round.queue.catch(() => {});
    for (const c of round.calls) {
        if (round.outcomes.has(c.id)) continue;
        if (ranByServer && !state.stopped) await runOne(state, roundId, round, c.id);
        else round.outcomes.set(c.id, { ...NOT_RUN });
    }
    state.rounds.delete(roundId);
    round.resolve(round.outcomes);
}

// The answer is stopped (any way): every open round ends now, without waiting for a step still running on the PC
// (the app stops that one itself), and nothing of it runs afterwards: not the app's queued runs (runOne), not the
// server after the round's timer (cleared here), not a round closed by the timer or dispose a moment before (its
// remaining calls are marked not run in finishRound, as `stopped` is set)
function stopLoop(state) {
    if (state.stopped) return;
    state.stopped = true;
    for (const [roundId, round] of state.rounds) {
        round.closed = true;
        clearTimeout(round.timer);
        const outcomes = new Map(round.outcomes);
        for (const c of round.calls) if (!outcomes.has(c.id)) outcomes.set(c.id, { ...NOT_RUN });
        state.rounds.delete(roundId);
        round.resolve(outcomes);
    }
}

/** One command from the app for an answer in progress. Returns { ok: true } or { error } */
export async function handleTurnCommand(turnId, userId, cmd) {
    const state = loops.get(String(turnId || ""));
    if (!state || state.userId !== String(userId)) return { error: "unknown_turn" };
    const type = String(cmd?.type || "");
    if (type === "stop") {
        stopLoop(state);
        try { state.onStop?.(); } catch { /* nothing to stop */ }
        return { ok: true };
    }
    const roundId = Number(cmd?.roundId);
    const round = state.rounds.get(roundId);
    if (!round || round.closed) return { error: "unknown_round" };
    if (type === "run") {
        const id = String(cmd?.id || "");
        if (!round.calls.some((c) => c.id === id)) return { error: "unknown_call" };
        round.queue = round.queue.then(() => runOne(state, roundId, round, id)).catch(() => {});
        return { ok: true };
    }
    if (type === "skip") {
        const id = String(cmd?.id || "");
        const call = round.calls.find((c) => c.id === id);
        if (!call) return { error: "unknown_call" };
        if (!round.outcomes.has(id)) {
            round.outcomes.set(id, { content: `Not run: ${String(cmd?.reason || "the app skipped this call").slice(0, 300)}`, isError: true });
            state.emit({ type: "tool_done", roundId, id, name: call.name, isError: true, skipped: true });
        }
        return { ok: true };
    }
    if (type === "round_done") {
        finishRound(state, roundId, false).catch(() => {});
        return { ok: true };
    }
    return { error: "unknown_command" };
}
