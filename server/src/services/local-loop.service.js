// The app drives the AI's loop (owner, 2026-11-09: "the loop runs on the PC, like Claude Code"), for every model.
// The model loops in llm-stream.js and llm-stream-anthropic.js keep speaking each model's own language; what they hand
// over here is the decision: after each model round they give the app the tool calls the model asked for
// (`round_end`), and the app says which to run and in what order (`run`, one at a time), skips the rest (`skip`), and
// closes the round (`round_done`). Steps on the computer then run in the app itself (pc_tool_call, local-runner
// pcExecutors); online tools run on the server. The app can stop the answer at once (`stop`). The answer streams on the
// durable turn (durable-turn.service.js), so the app's internet dropping loses nothing.
// Commands come in over HTTP: POST /api/ai/turn/:id/cmd.
import { StreamChatError } from "./llm-stream.js";

const ROUND_WAIT_MS = 15 * 60 * 1000; // an app that never drives a round: the server runs what is left itself
const loops = new Map(); // turnId -> { userId, rounds: Map<roundId, Round>, nextRound, emit, onStop, stopped }

/**
 * Makes the driver for one answer. `driver(calls, { run, text })` is what the model loops call after a round with
 * tool calls; it resolves with a Map(callId -> { content, isError }) once the app has driven the round.
 */
export function makeLocalLoopDriver({ turnId, userId, emit, onStop }) {
    const state = { userId: String(userId), rounds: new Map(), nextRound: 0, emit, onStop, stopped: false };
    loops.set(turnId, state);
    const driver = async (calls, { run, text }) => {
        if (state.stopped) throw new StreamChatError("Request aborted");
        const roundId = ++state.nextRound;
        return new Promise((resolve, reject) => {
            const round = {
                calls, run, resolve, reject,
                outcomes: new Map(),
                queue: Promise.resolve(), // runs happen one at a time, in the order the app asks
                closed: false,
                timer: setTimeout(() => finishRound(state, roundId, "the app did not drive this round in time, so the server ran it").catch(() => {}), ROUND_WAIT_MS),
            };
            round.timer.unref?.();
            state.rounds.set(roundId, round);
            emit({ type: "round_end", roundId, calls: calls.map((c) => ({ id: c.id, name: c.name, input: c.input })), text: String(text || "").slice(0, 4000) });
        });
    };
    const dispose = () => {
        if (loops.get(turnId) === state) loops.delete(turnId);
        for (const r of state.rounds.values()) { clearTimeout(r.timer); }
        state.rounds.clear();
    };
    return { driver, dispose };
}

async function runOne(state, roundId, round, id) {
    if (round.outcomes.has(id)) return;
    const call = round.calls.find((c) => c.id === id);
    if (!call) return;
    let out;
    try { out = await round.run(id); } catch (e) { out = { content: `Tool error: ${e?.message || e}`, isError: true }; }
    round.outcomes.set(id, out || { content: "", isError: false });
    state.emit({ type: "tool_done", roundId, id, name: call.name, isError: !!out?.isError });
}

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
        else round.outcomes.set(c.id, { content: "Not run: the app skipped this call.", isError: true });
    }
    state.rounds.delete(roundId);
    round.resolve(round.outcomes);
}

/** One command from the app for an answer in progress. Returns { ok: true } or { error } */
export async function handleTurnCommand(turnId, userId, cmd) {
    const state = loops.get(String(turnId || ""));
    if (!state || state.userId !== String(userId)) return { error: "unknown_turn" };
    const type = String(cmd?.type || "");
    if (type === "stop") {
        state.stopped = true;
        for (const [roundId] of state.rounds) finishRound(state, roundId, false).catch(() => {});
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
