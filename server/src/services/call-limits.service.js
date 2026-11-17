// WhatsApp call limits of a plan (owner, 2026-11-17). Every number is a PlanConfig field the super admin sets:
//   calls_per_day, calls_per_week, calls_per_month: answered calls in the last 24 hours, 7 days and 30 days. Each one
//     can be set on its own; a call is taken only when every set limit has room.
//   call_tasks_per_call: how many tasks (start_task) one call may start.
//   call_tasks_at_once: how many tasks from calls may run at once for one person.
//   call_task_max_minutes: the minutes of work one task from a call may use (the time its runs take, not the time it
//     sleeps or waits for the user).
// -1, or a field a plan row does not have yet, means no limit (so a row saved before these fields keeps today's
// behaviour); 0 means not included. Plans off, or Classgrid staff (no plan row): only the owner's fixed caps in
// whatsapp-call.service.js apply, as before.
// Users: whatsapp-call.service.js (the call, its tasks, its live work) and agent-task.service.js (later runs of a
// task from a call).
import { biggerPlanNames, paidPlansText } from "./email-templates.service.js";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
export const MONTH_MS = 30 * DAY_MS;
const WINDOW_MS = { day: DAY_MS, week: WEEK_MS, month: MONTH_MS };
// A task from a call works for at most 48 hours (agent-task.service.js), so an older record is not running
const TASK_LIFE_MS = 48 * 60 * 60 * 1000;
// The call record states (models/Call.js) of a task that is running or about to run again by itself
export const RUNNING_STATES = ["queued", "working", "retrying"];

/** A plan's number: null = no limit (-1, not set, not a number), else a whole number of 0 or more */
export function planNumber(v) {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
}

// ─── Calls per day, week and month ────────────────────────────

/** The call count limits of a plan: { day, week, month } (null = no limit). The day stays under the owner's fixed cap
 * (maxPerDay answered calls per number in 24 hours), as before; plans off (no plan): only that cap. */
export function callCountCaps(plan, maxPerDay) {
    if (!plan) return { day: maxPerDay, week: null, month: null };
    const day = planNumber(plan.calls_per_day);
    return {
        day: day === null ? maxPerDay : Math.min(maxPerDay, day),
        week: planNumber(plan.calls_per_week),
        month: planNumber(plan.calls_per_month),
    };
}

/** The first of day, week and month whose limit has no room, from the times (ms) of the calls already made:
 * { which, cap, used, backAt } (backAt: when enough of those calls are old enough for one more; null for a limit of
 * 0), or null when every set limit has room. `times`: { day: [...], week: [...], month: [...] } */
export function fullCallLimit(caps, times, now = Date.now()) {
    for (const which of ["day", "week", "month"]) {
        const cap = caps?.[which];
        if (cap === null || cap === undefined) continue;
        const inWindow = (times?.[which] || []).map(Number).filter((t) => t > now - WINDOW_MS[which]).sort((a, b) => a - b);
        if (inWindow.length >= cap) {
            const backAt = cap > 0 ? new Date(inWindow[inWindow.length - cap] + WINDOW_MS[which]) : null;
            return { which, cap, used: inWindow.length, backAt };
        }
    }
    return null;
}

/** The line sent on WhatsApp with the call's work: "(Call 2 of 3 for today, 5 of 10 for this week.)" */
export function callsLineText(caps, times, now = Date.now()) {
    const words = { day: "for today", week: "for this week", month: "for this month" };
    const parts = [];
    for (const which of ["day", "week", "month"]) {
        const cap = caps?.[which];
        if (cap === null || cap === undefined) continue;
        const used = (times?.[which] || []).filter((t) => Number(t) > now - WINDOW_MS[which]).length;
        parts.push(`${used + 1} of ${cap} ${words[which]}`);
    }
    return parts.length ? `(Call ${parts.join(", ")}.)` : "";
}

/** The start times (ms, oldest first) of this person's answered calls since `sinceMs`, from the call records
 * (models/Call.js: a call's record is made when it is answered; its first line is the AI's greeting) */
export async function callTimesSince(userId, sinceMs) {
    const { default: Call } = await import("../models/Call.js");
    const rows = await Call.find({ user_id: userId, origin: "call", started_at: { $gte: new Date(sinceMs) }, "transcript.0": { $exists: true } })
        .select("started_at").sort({ started_at: 1 }).limit(5000).lean();
    return rows.map((r) => new Date(r.started_at).getTime());
}

// ─── Tasks from a call ────────────────────────────────────────

/** The task limits of a plan: { perCall, atOnce, maxMinutes } (null = no limit). Plans off: no limits. */
export function callTaskCaps(plan) {
    if (!plan) return { perCall: null, atOnce: null, maxMinutes: null };
    return {
        perCall: planNumber(plan.call_tasks_per_call),
        atOnce: planNumber(plan.call_tasks_at_once),
        maxMinutes: planNumber(plan.call_task_max_minutes),
    };
}

/** How many tasks from this person's calls are running (or about to run again by themselves) now, from the call
 * records. Records not written for 48 hours are left out (no task from a call works longer). */
export async function runningCallTasks(userId, now = Date.now()) {
    const { default: Call } = await import("../models/Call.js");
    return Call.countDocuments({ user_id: userId, origin: "call", status: { $in: RUNNING_STATES }, updatedAt: { $gte: new Date(now - TASK_LIFE_MS) } });
}

/** Whether one more task may be saved on this call: null (yes), or { why, cap, running }.
 * why: "none" (the plan has no tasks from calls), "per_call" (this call has all its tasks), "at_once" (the most tasks
 * from calls are already running). All tasks of one call run as one job (owner's rule, 2026-10-24), so only a
 * call's first task starts a new one. `running()` is asked only when needed. */
export async function callTaskRefusal(caps, { savedThisCall = 0, running = async () => 0 } = {}) {
    if (caps?.perCall === 0 || caps?.atOnce === 0 || caps?.maxMinutes === 0) return { why: "none", cap: 0, running: 0 };
    if (caps?.perCall !== null && caps?.perCall !== undefined && savedThisCall >= caps.perCall) return { why: "per_call", cap: caps.perCall, running: 0 };
    if (savedThisCall === 0 && caps?.atOnce !== null && caps?.atOnce !== undefined) {
        const now = Number(await running()) || 0;
        if (now >= caps.atOnce) return { why: "at_once", cap: caps.atOnce, running: now };
    }
    return null;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What the AI on the call is told when a task is not started (it tells the caller; the task is not queued: call
 * tasks have no queue) */
export function callTaskRefusedToolText(refusal, { plan = null, paidNames = [] } = {}) {
    const planText = plan?.name ? `their ${plan.name} plan` : "their plan";
    const more = biggerPlanNames(plan, paidNames);
    const upgrade = (what) => (more.length ? ` They can upgrade to ${paidPlansText(more, "or")} for ${what} (classgrid.in/pricing).` : "");
    if (refusal?.why === "none") {
        return `Not started: tasks after the call are not part of ${planText}. Tell the caller plainly that this task was not started because ${planText} does not include tasks from calls. You can still answer their questions on this call.${upgrade("tasks from calls")} Do not call start_task again on this call.`;
    }
    if (refusal?.why === "per_call") {
        return `Not started: on ${planText} one call can start ${plural(refusal.cap, "task")}, and this call already has ${refusal.cap}. Tell the caller plainly that this task was not started because of that limit, and that they can call again for it.${upgrade("more tasks on a call")} Do not call start_task again on this call.`;
    }
    return `Not started: the caller already has ${plural(refusal?.running || 0, "task")} from calls running, and ${planText} runs at most ${refusal?.cap ?? 0} at once. Tell the caller plainly that this task was not started because of that limit, and that they can ask for it again when one of those tasks is done.${upgrade("more tasks at once")}`;
}

/** The line in the call's instructions that tells the AI the caller's task limits (empty when there are none) */
export function callTaskLimitsLine(caps, plan = null) {
    if (!caps) return "";
    const planText = plan?.name ? `The caller's ${plan.name} plan` : "The caller's plan";
    if (caps.perCall === 0 || caps.atOnce === 0 || caps.maxMinutes === 0) return `${planText} has no tasks after the call: answer on the call and do not use start_task.`;
    const parts = [];
    if (caps.perCall !== null) parts.push(`one call can start up to ${plural(caps.perCall, "task")} (start_task)`);
    if (caps.maxMinutes !== null) parts.push(`each task gets up to ${plural(caps.maxMinutes, "minute")} of work`);
    if (caps.atOnce !== null) parts.push(`at most ${plural(caps.atOnce, "task")} from calls run at once`);
    return parts.length ? `${planText}: ${parts.join(", ")}. Keep each task to what fits in that.` : "";
}

// ─── Minutes of work of one task from a call ──────────────────
// A task from a call gets work_cap_ms when it starts (null: no limit). The time of each of its runs is added to its
// work_ms; a run is stopped when the task's minutes run out (agent-task.service.js then ends the task and tells the
// user). Its sleep and its waits for the user do not count.

/** The ms of work this task has left (Infinity: no limit) */
export const workLeftMs = (task) => (Number(task?.work_cap_ms) > 0 ? Math.max(0, Number(task.work_cap_ms) - (Number(task.work_ms) || 0)) : Infinity);

/** A clock for one run of a task: aborts `stop` when the task's minutes run out. hit(): it ran out during this run;
 * done(): the run is over (its time is added to the task). `addTime(taskId, ms)` saves the time. */
export function workClock(task, stop, addTime) {
    const left = workLeftMs(task);
    const startedAt = Date.now();
    let hit = false;
    const timer = Number.isFinite(left) ? setTimeout(() => { hit = true; stop?.abort(); }, left) : null;
    return {
        limited: Number.isFinite(left),
        hit: () => hit,
        async done() {
            if (timer) clearTimeout(timer);
            if (Number.isFinite(left) && addTime) await Promise.resolve(addTime(task._id, Date.now() - startedAt)).catch(() => {});
        },
    };
}
