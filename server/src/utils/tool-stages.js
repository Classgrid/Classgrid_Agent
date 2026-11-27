// A tool that takes long says where it is: its stages, each one as it really happens.
//
// Until 2026-11-27 a step told the chat two things, that it started and what came back. make_video works for minutes
// (the page is recorded frame by frame, joined, uploaded) and the chat showed one fixed line the whole time (owner:
// "you show 'video making' something; remove that, add every step, show it really").
//
// One stage: { key, text, state, note?, image? }
//   key    which stage it is, the same for every report of it ("record", "still-0"): a later report with the same
//          key replaces the earlier one in its place
//   text   the row's words, written here on the server, so the website, the desktop app and the phone say the same
//   state  "running" | "done" | "failed"
//   note   a few more words beside the row: how far it is ("frame 300 of 1350"), or why it failed
//   image  a picture of this stage (an https link): the apps show it small at the end of the row
//
// How a stage travels:
//   - a handler calls reportStage(stage) (or uses stageRun below); it needs no argument for it: the step it belongs to
//     is known from where it runs (withStages), also from a callback of another library when stageReporter() was
//     taken first
//   - the chat's own step (ai-chat.controller.js showStep): the stage is kept in the step's `stages` list, which is
//     saved with the answer, and sent as the event { type: "tool_stage", tool, call, stage } (call: the step's id,
//     the same id its tool_start carries)
//   - a helper's step: kept in the helper's own step, which the Agent map shows
// An app from before this ignores both the event (a type it does not know) and the `stages` field of a step.
import { AsyncLocalStorage } from "node:async_hooks";

export const STAGE_STATES = ["running", "done", "failed"];
// How many stages one step keeps, and how long their words may be (they are saved with the answer)
export const MAX_STAGES = 40;
const TEXT_MAX = 120;
const NOTE_MAX = 300;

const scope = new AsyncLocalStorage();

const oneLine = (v, max) => {
    const text = String(v ?? "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/** A stage as it is sent and saved: only the known fields, cut to size. null when it has no key, words or state. */
export function cleanStage(stage) {
    if (!stage || typeof stage !== "object") return null;
    const key = String(stage.key ?? "").trim().slice(0, 40);
    const text = oneLine(stage.text, TEXT_MAX);
    if (!key || !text || !STAGE_STATES.includes(stage.state)) return null;
    const note = oneLine(stage.note, NOTE_MAX);
    const image = typeof stage.image === "string" && /^https:\/\/\S+$/i.test(stage.image) && stage.image.length <= 2000 ? stage.image : "";
    return { key, text, state: stage.state, ...(note ? { note } : {}), ...(image ? { image } : {}) };
}

/**
 * Puts a stage in a step's list (the list is changed in place): a stage with a key the list already has takes that
 * one's place, a new one goes to the end. Returns the stage as kept, or null when it was not taken (not a stage, or
 * the list is full).
 */
export function putStage(list, stage) {
    const clean = cleanStage(stage);
    if (!clean || !Array.isArray(list)) return null;
    const at = list.findIndex((s) => s?.key === clean.key);
    if (at >= 0) list[at] = clean;
    else if (list.length < MAX_STAGES) list.push(clean);
    else return null;
    return clean;
}

/** Runs a tool's handler so that the stages it reports go to `report` (null: they go nowhere). */
export const withStages = (report, fn) => scope.run(typeof report === "function" ? { report } : null, fn);

/**
 * The reporter of the step running now, to keep and call later from anywhere (a callback of another library runs
 * outside the step's own chain). Never throws; does nothing when the tool runs where nobody shows stages.
 */
export function stageReporter() {
    const store = scope.getStore();
    return (stage) => { try { store?.report(stage); } catch { /* showing a stage never breaks the tool */ } };
}

/** Reports one stage of the step running now. */
export const reportStage = (stage) => stageReporter()(stage);

/**
 * A tool's stages in order, for its handler. `words`: { <key>: { running, done, failed } }, the row's words in each
 * state (a numbered key, "still-2", takes the words of "still").
 *   start(key, extra)  the stage begins; the one running before it is done
 *   update(extra)      the running stage again, with a new note
 *   done(extra)        the running stage is done
 *   fail(reason)       the running stage failed, with the reason as its note
 * `report` is where each stage goes (the default: the step running now).
 */
export function stageRun(words, report = stageReporter()) {
    let running = null;
    const send = (key, state, extra = {}) => {
        const w = words[key] || words[String(key).replace(/-\d+$/, "")];
        if (w?.[state]) report({ ...extra, key, text: w[state], state });
    };
    return {
        get running() { return running; },
        start(key, extra) {
            if (running && running !== key) send(running, "done");
            running = key;
            send(key, "running", extra);
        },
        update(extra) { if (running) send(running, "running", extra); },
        done(extra) { if (running) { send(running, "done", extra); running = null; } },
        fail(reason) { if (running) { send(running, "failed", { note: reason }); running = null; } },
    };
}

/** An id for a step of an answer: the time it started, and never the same twice (two steps in one millisecond). */
export function stepIds() {
    let last = 0;
    return () => { last = Math.max(Date.now(), last + 1); return String(last); };
}
