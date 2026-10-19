/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Jobs that used to depend on cron-job.org opening a link. cron-job.org switches a job off after one failed call
// (e.g. during a pm2 restart), and then nothing ran until someone opened the link by hand. The server now opens
// its own cron links on a schedule. The links still work for a manual run.
//
// PM2 can run several copies of the server (cluster mode): a short Redis lock makes sure only one copy runs
// each job per tick, so emails are never sent twice. Without Redis, only the first copy (instance 0) runs them.
import nodeCron from "node-cron";
import redis from "../config/redis.js";

const JOBS = [
    // Scheduled messages in Grids (group and direct chats). chat-scheduler.worker.js was never started, so these
    // only went out when cron-job.org opened the link.
    { name: "grid-scheduled-messages", schedule: "* * * * *", path: "/api/cron/process-scheduled-messages", lockSeconds: 55 },
    // Unpin Grid messages whose pin time has run out
    { name: "grid-unpin-expired", schedule: "*/5 * * * *", path: "/api/threads/cron/unpin-expired", lockSeconds: 240 },
    // Groups with auto-add / admin roles: add new role holders, remove ones who lost the role, promote/demote admins
    { name: "grid-sync-group-members", schedule: "0 3 * * *", path: "/api/cron/sync-group-members", lockSeconds: 3600 },
    // Agent review emails
    { name: "agent-reviews", schedule: "*/5 * * * *", path: "/api/ai/cron-process-reviews", lockSeconds: 240 },
    // Close support tickets that have gone quiet
    { name: "auto-close-tickets", schedule: "0 * * * *", path: "/api/cron/auto-close-tickets", lockSeconds: 1800 },
    // Delete expired chat messages (02:30 server time)
    { name: "delete-expired-messages", schedule: "30 2 * * *", path: "/api/cron/delete-expired-messages", lockSeconds: 3600 },
];

const isFirstInstance = () => String(process.env.NODE_APP_INSTANCE ?? "0") === "0";

async function takeLock(name, seconds) {
    try {
        const got = await redis.set(`cron-link-lock:${name}`, String(process.pid), "EX", seconds, "NX");
        return got === "OK";
    } catch {
        return isFirstInstance();
    }
}

async function runJob(job) {
    if (!(await takeLock(job.name, job.lockSeconds))) return;
    const port = process.env.PORT || 3000;
    const url = `http://127.0.0.1:${port}${job.path}?secret=${encodeURIComponent(process.env.CRON_SECRET || "")}`;
    const started = Date.now();
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10 * 60 * 1000) });
        const body = await res.text();
        const summary = body.length > 200 ? `${body.slice(0, 200)}…` : body;
        if (res.ok) console.log(`[CronLinks] ${job.name} ok in ${Date.now() - started}ms: ${summary}`);
        else console.error(`[CronLinks] ${job.name} failed (${res.status}): ${summary}`);
    } catch (err) {
        console.error(`[CronLinks] ${job.name} error:`, err.message);
    }
}

export const initCronLinkJobs = () => {
    for (const job of JOBS) {
        nodeCron.schedule(job.schedule, () => { runJob(job); });
    }
    console.log(`[CronLinks] Scheduled: ${JOBS.map((j) => `${j.name} (${j.schedule})`).join(", ")}`);
};
