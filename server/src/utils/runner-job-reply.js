// A background command on the user's computer is kept by the Classgrid app that started it: the desktop app,
// Classgrid Code and the editor extension each have their own list (desktop/runner.js, `jobs`). A step about a job
// that reaches another of the person's apps is answered "Error: no background command <id>". That means "not mine",
// not "it is gone": the person's other apps are asked before the AI is told so.
// (owner, 2026-11-22: a job started from the editor extension finished, the chat was woken, and its
// check_background_command went to the desktop app, the oldest connection, which answered with that error both times.)

export const JOB_TOOLS = new Set(["check_background_command", "stop_background_command", "send_background_input"]);
const NO_SUCH_JOB = /^Error: no background command \S+/;

/** True when `reply` is an app saying it doesn't have the job this `tool` step is about */
export const noSuchJobHere = (tool, reply) =>
    JOB_TOOLS.has(String(tool)) && typeof reply?.text === "string" && NO_SUCH_JOB.test(reply.text);

/**
 * Of two answers to the same job step, the one to give the AI: the other app's when it has something real to say
 * about the job, else the first one. `other` may be null (no other app) or the "didn't answer in time" error.
 */
export const betterJobReply = (tool, first, other) =>
    typeof other?.text === "string" && !noSuchJobHere(tool, other) && !/didn't answer in time/.test(other.text) ? other : first;
