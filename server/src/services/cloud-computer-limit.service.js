// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// The plan's cloud computer limits: hours a month (sandbox_hours_per_month) and how many run at once
// (sandbox_sessions). Until 2026-11-17 both were only shown on the plan card and stopped nobody (owner: "check every
// limit of each plan is 100 percent really used ... fix all issues").
//
// The cloud computer is every container that runs for a person on the sandbox server: the AI's terminal commands and
// code runs, background commands, the code editor box (ide-u-<user>), its package install box (ide-npm-<user>) and
// Studio's live browser (studio-b-<user>).
//
// HOURS. Once a minute (the box check in routes/ide.routes.js, which already holds a lock so one server process does
// it) the running containers are listed and every account with at least one running gets that minute. One minute is
// counted once however many containers run, so nothing is counted twice. A run shorter than a minute is counted only
// when the check falls inside it, which evens out over a month. Containers say whose they are with the label
// cg-user (set by cloudLabel below) or, for the three named boxes, by their name. The count is per account (the user
// id, so every email of an account shares it), by India month, in Redis with the other plan counters.
// When the hours are used up: nothing new starts (the gates below) and what is still running is switched off.
//
// AT ONCE. One "cloud computer" is one chat running something on the sandbox. A new run waits a little for another
// chat's run to finish and is refused when the plan's number of chats are still busy. What is running is read from
// the sandbox itself (the cg-session label), so a run that ended never holds a place.
//
// -1 = no limit; hours 0 = not included in the plan. Plans off or a staff account: no limit. A count or a check
// that cannot be read never blocks (the same rule as the other plan counters).
import redis from "../config/redis.js";
import { planOf } from "./plan-limits.service.js";
import { usedThisMonth, addThisMonth, nextMonthText } from "./plan-usage.service.js";

const HEX_ID = /^[a-f0-9]{24}$/i;
const KIND = "sandbox";
const LAST_SAMPLE = "plan:sandbox:lastsample";
const START_LOCK = (userId) => `plan:sandboxstart:${userId}`;
const NAMED_BOX = /^(?:ide-u|ide-npm|studio-b)-([a-f0-9]{24})$/i;
const WAIT_MS = 20000; // how long a run waits for another chat's run to finish before it is refused

const cleanSession = (s) => String(s || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The docker flags that say whose container this is (and for which chat), or "" for an unknown account */
export function cloudLabel(userId, sessionId) {
    const uid = String(userId || "").toLowerCase();
    if (!HEX_ID.test(uid)) return "";
    const sid = cleanSession(sessionId);
    return `--label cg-user=${uid}${sid ? ` --label cg-session=${sid}` : ""}`;
}

// The person's plan row, kept for half a minute (a chat runs many commands in a row)
const planMemo = new Map();
async function planFor(userId) {
    const hit = planMemo.get(userId);
    if (hit && hit.until > Date.now()) return hit.plan;
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId).select("plan role email").lean();
    const plan = user ? await planOf(user) : null;
    if (planMemo.size > 5000) planMemo.clear();
    planMemo.set(userId, { plan, until: Date.now() + 30000 });
    return plan;
}

/** Hours of the plan: null = no limit, 0 = not included, else the number */
const hoursCap = (plan) => {
    const n = Number(plan?.sandbox_hours_per_month);
    return !plan || !Number.isFinite(n) || n < 0 ? null : n;
};
/** Cloud computers at once: null = no limit, else at least 1 */
const atOnceCap = (plan) => {
    const n = Number(plan?.sandbox_sessions);
    if (!plan || !Number.isFinite(n) || n === -1) return null;
    return Math.max(1, Math.floor(n));
};

export const hoursRefusal = (plan, cap) => (cap === 0
    ? `The cloud computer is not included in the ${plan.name} plan. Upgrade your plan to run code and projects in the cloud.`
    : `You've used the ${cap} hours of cloud computer a month of your ${plan.name} plan. It refills on ${nextMonthText()}. Upgrade your plan for more.`);

/**
 * May this account use the cloud computer now, by its hours? (the editor box, the live browser, a background command)
 * Returns { allowed: true, plan } or { allowed: false, code, error }.
 */
export async function cloudHoursGate(userId) {
    const uid = String(userId || "").toLowerCase();
    if (!HEX_ID.test(uid)) return { allowed: true, plan: null };
    try {
        const plan = await planFor(uid);
        const cap = hoursCap(plan);
        if (cap === null) return { allowed: true, plan };
        if (cap === 0) return { allowed: false, code: "cloud_computer_not_included", error: hoursRefusal(plan, 0) };
        const used = await usedThisMonth(uid, KIND);
        if (used >= cap * 3600) return { allowed: false, code: "cloud_hours_used_up", error: hoursRefusal(plan, cap) };
        return { allowed: true, plan };
    } catch (e) {
        console.warn("[cloud computer] hours check failed:", e.message);
        return { allowed: true, plan: null };
    }
}

/** The chats (cg-session) of this account with something running on the sandbox now, without `ownSession` */
async function otherBusyChats(ssh, uid, ownSession) {
    const { stdout } = await ssh.execCommand(`docker ps --filter label=cg-user=${uid} --format '{{.Label "cg-session"}}'`);
    const chats = new Set(String(stdout || "").split("\n").map((l) => l.trim()).filter(Boolean));
    chats.delete(ownSession);
    return chats;
}

/**
 * The check before a run on the sandbox (terminal command, code run, background command): the hours, then how many
 * chats run at once. `ssh` is the open connection to the sandbox. Returns { allowed: true, label } with the docker
 * flags for the run, or { allowed: false, code, error }.
 */
export async function cloudComputerGate(ssh, { userId, sessionId } = {}) {
    const uid = String(userId || "").toLowerCase();
    const label = cloudLabel(uid, sessionId);
    if (!label) return { allowed: true, label: "" };
    const hours = await cloudHoursGate(uid);
    if (!hours.allowed) return hours;
    const max = atOnceCap(hours.plan);
    if (max === null) return { allowed: true, label };
    const own = cleanSession(sessionId);
    try {
        const until = Date.now() + WAIT_MS;
        for (;;) {
            // One chat starts at a time for an account, so two chats starting in the same moment can't both see a
            // free place. The lock ends by itself after 3 seconds, by when the run that took it shows in `docker ps`.
            // It is between chats only: a chat that holds it starts as many runs as it likes (its helpers run
            // commands side by side), and each of them keeps the lock for 3 more seconds.
            const got = await redis.set(START_LOCK(uid), own || "1", "EX", 3, "NX");
            const mine = got || (await redis.get(START_LOCK(uid))) === (own || "1");
            if (mine) {
                if (!got) await redis.expire(START_LOCK(uid), 3);
                const busy = await otherBusyChats(ssh, uid, own);
                if (busy.size < max) return { allowed: true, label };
                await redis.del(START_LOCK(uid)).catch(() => {});
            }
            if (Date.now() >= until) break;
            await sleep(mine ? 1000 : 300);
        }
        return {
            allowed: false, code: "cloud_computers_busy",
            error: `Your ${hours.plan.name} plan runs ${max} cloud computer${max === 1 ? "" : "s"} at a time, and ${max === 1 ? "another chat is using it" : "other chats are using them"} now. Wait for ${max === 1 ? "it" : "one"} to finish (or stop its background command), or upgrade your plan.`,
        };
    } catch (e) {
        console.warn("[cloud computer] at-once check failed:", e.message);
        return { allowed: true, label };
    }
}

/** The accounts with at least one container running, from the lines of `docker ps --format '{{.Names}}|{{.Label "cg-user"}}'` */
export function accountsRunning(psOutput) {
    const users = new Set();
    for (const line of String(psOutput || "").split("\n")) {
        const [name = "", owner = ""] = line.trim().split("|");
        const byLabel = owner.trim().toLowerCase();
        if (HEX_ID.test(byLabel)) { users.add(byLabel); continue; }
        const m = NAMED_BOX.exec(name.trim());
        if (m) users.add(m[1].toLowerCase());
    }
    return users;
}

/**
 * The once-a-minute count (called from the box check, which holds the lock and the sandbox connection): every
 * account with something running gets the time since the last count, and an account whose hours are used up has
 * its containers switched off. Returns { counted, stopped } for the log.
 */
export async function sampleCloudComputers(ssh) {
    const now = Date.now();
    const last = Number(await redis.get(LAST_SAMPLE)) || 0;
    await redis.set(LAST_SAMPLE, String(now), "EX", 3600);
    // The first count after a restart, or after a long gap, is one minute; a skipped tick is made up, up to two
    const seconds = last && now > last ? Math.min((now - last) / 1000, 120) : 60;
    const { stdout } = await ssh.execCommand(`docker ps --format '{{.Names}}|{{.Label "cg-user"}}'`);
    const users = accountsRunning(stdout);
    const stopped = [];
    for (const uid of users) {
        await addThisMonth(uid, KIND, seconds);
        const plan = await planFor(uid).catch(() => null);
        const cap = hoursCap(plan);
        if (cap === null) continue;
        const used = await usedThisMonth(uid, KIND);
        if (used < cap * 3600) continue;
        // The hours are used up: the editor box, the install box, the live browser and every run of this account stop
        // (uid is 24 hex characters, checked above). The editor's port is forgotten, so opening a project again goes
        // through the hours check; the box check then backs up and clears the project code as for any closed editor.
        await ssh.execCommand(
            `docker rm -f ide-u-${uid} ide-npm-${uid} studio-b-${uid} >/dev/null 2>&1; ` +
            `docker ps -q --filter label=cg-user=${uid} | xargs -r docker rm -f >/dev/null 2>&1; true`
        );
        await redis.del(`ide:port:${uid}`).catch(() => {});
        // (a command that was running comes back to the AI with no word of why it ended: hoursRanOutNote below says it)
        await redis.set(HOURS_OUT(uid), JSON.stringify({ plan: plan?.name || "", cap }), "EX", HOURS_OUT_S).catch(() => {});
        stopped.push(uid);
    }
    return { counted: users.size, stopped };
}

// The plan's hours ran out while something was running, and it was switched off (sampleCloudComputers). The command
// came back to the AI as a normal result with an exit code, or as "No background command ... (it may have finished
// long ago)", so the AI did not know the plan's hours had ended it and ran it again. For a few minutes after the
// switch-off, a result of that account's run carries this note.
const HOURS_OUT = (uid) => `cloud:hours-out:${uid}`;
const HOURS_OUT_S = 15 * 60;
export async function hoursRanOutNote(userId) {
    const uid = String(userId || "").toLowerCase();
    if (!HEX_ID.test(uid)) return "";
    let out = null;
    try { out = JSON.parse((await redis.get(HOURS_OUT(uid))) || "null"); } catch { out = null; }
    if (!out) return "";
    return `\n\n[This run was stopped by Classgrid: the ${out.cap} hours of cloud computer a month of the person's ${out.plan ? `${out.plan} ` : ""}plan ran out while it was running, and everything running for them in the cloud was switched off. Do not run it again: it is refused until the hours refill on ${nextMonthText()}. Tell the user plainly that their plan's cloud computer hours for this month are used up.]`;
}

/** Hours of cloud computer the account has used this month, for the Usage page (one decimal) */
export async function cloudHoursUsed(userId) {
    const uid = String(userId || "").toLowerCase();
    if (!HEX_ID.test(uid)) return 0;
    return Math.round(((await usedThisMonth(uid, KIND)) / 3600) * 10) / 10;
}
