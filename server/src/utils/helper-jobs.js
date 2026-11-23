// A background command that a helper started on the user's computer belongs to that helper, not to the chat.
//
// A command that passes its wait keeps running in the background, and when it ends the app tells the server, which
// woke the CHAT with "the background command ... has just ended" (chat-wake.service.js onLocalJobDone). That is right
// for the main AI's own command. For a helper's command it woke the main AI for something it never started: in the
// owner's test of 2026-11-23 three slow folder listings of three helpers woke the main agent three times, each an
// answer of its own, while the helpers that wanted the results heard nothing.
//
// Now the server remembers which helper a background job belongs to (markHelperJob, when the app's answer says the
// command went to the background and the step was a helper's), and when the job ends its result goes to that helper
// with its next step (the sink ai-chat.controller.js sets); the chat is not woken. A helper that has already
// finished gets nothing and neither does the chat.
import redis from "../config/redis.js";

const KEY = (jobId) => `ai:helperjob:${jobId}`;
const KEEP_S = 12 * 60 * 60;

/** This background job was started by this helper of a chat */
export const markHelperJob = (jobId, helper) => {
    if (!jobId || helper == null) return Promise.resolve();
    return Promise.resolve(redis.set(KEY(String(jobId)), String(helper), "EX", KEEP_S)).catch(() => {});
};

/** The helper a finished job belongs to (its number), once; null when it is the chat's own job */
export async function takeHelperJob(jobId) {
    if (!jobId) return null;
    const helper = await Promise.resolve(redis.get(KEY(String(jobId)))).catch(() => null);
    if (helper == null || helper === "") return null;
    Promise.resolve(redis.del(KEY(String(jobId)))).catch(() => {});
    const no = Number(helper);
    return Number.isFinite(no) ? no : null;
}

/** What a helper is told when the app says its command went on in the background */
export const HELPER_JOB_NOTE = (id) => `It keeps running in the background as job_id ${id}. Don't check it again and again: its result and exit code come to you by themselves, with the result of one of your next steps, when it ends. Go on with other work meanwhile. Only when you have nothing left to do but wait for it, wait with check_background_command.`;

/** What the helper reads when its job has ended */
export function helperJobText(d) {
    const exit = d?.exitCode === undefined || d?.exitCode === null ? "" : `, exit code ${d.exitCode}`;
    const took = Number(d?.seconds) > 0 ? ` after ${Math.round(Number(d.seconds))} seconds` : "";
    const output = String(d?.output || "").trim();
    return `[Your background command \`${String(d?.command || "").slice(0, 500)}\` (job_id ${d?.jobId}) has ended${took}${exit}.${output ? ` The end of its output:\n${output.slice(-4000)}` : " It wrote no output."}]`;
}

// Where a helper's finished job goes: ai-chat.controller.js sets it (the helpers live in its memory).
// sink(chat, helperNo, text) returns true when that helper is still working and took it.
let sink = null;
export const setHelperJobSink = (fn) => { sink = typeof fn === "function" ? fn : null; };
export const giveToHelper = (chat, helper, d) => {
    try { return sink ? sink(String(chat), Number(helper), helperJobText(d)) === true : false; } catch { return false; }
};
