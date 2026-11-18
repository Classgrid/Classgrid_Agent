// Remote PC: Studio's own tabs on the phone (owner, 2026-11-18: "the phone is a live view of Studio Mode, it needs
// everything"; the live browser is left out). The phone reaches the chat's computer only through here: each request is
// checked (the person's own Remote PC chat, still on, its computer allowed) and sent to that computer's app over its
// runner connection (local-runner.service.js), the way the AI's steps go.
//
//   Review   the chat's answers with changes and each one's files with their diffs; Reject (one file or all) and Undo.
//            A folder on the computer: the app keeps each answer's before-copies (desktop/runner.js keepBefore, and
//            since 2026-11-18 a snapshot before the answer's first command, keepTreeBefore). A cloud project: the
//            server's own snapshots (ide-project.service.js checkpointChanges), as Studio's Review tab does.
//   Files    the project folder on the computer, and one file of it, read only. A cloud project: the phone uses the
//            project's own file routes (/api/ide/projects/:id/files), as Studio does.
//   Terminal the chat's background commands with their newest output.
//
// The app's screen tools (review_list, review_show, review_reject, files_list, files_read, jobs_list) came with the
// desktop app after 1.0.30. An app from before answers "can't run on this computer": the files are then listed and read
// with the AI's own read tools, and the background commands checked one by one, with check_background_command; Review
// on the computer needs the newer app (needsUpdate).
import RemoteChat from "../models/RemoteChat.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";

const NEEDS_UPDATE = /can't run on this computer/;
const CHECKPOINT = /^\d{10,16}$/;
const JOB_ID = /^job\d+-[0-9a-z]{1,8}$/;
// Which apps run a chat of each kind (RemoteChat.deviceKind), as remote-device.service.js
const APPS_OF_KIND = { desktop: ["desktop"], editor: ["code", "extension"] };

export class RemoteTabError extends Error {
    constructor(message, code, status) { super(message); this.code = code; this.status = status; }
}
const offline = () => new RemoteTabError("Your computer is offline. Open Classgrid on it and try again.", "offline", 503);

/** The chat's Remote PC record when the phone may use it, else a RemoteTabError (off, or the computer not allowed). */
export async function remoteChatRow(user, sessionId) {
    const row = await RemoteChat.findOne({ userId: user._id, sessionId: String(sessionId), on: true }).lean();
    if (!row) throw new RemoteTabError("Remote PC is off for this chat. Type /remote in it on your computer.", "not_remote", 404);
    const { deviceAllowed } = await import("./remote-pc.service.js");
    if (!(await deviceAllowed(user._id, row.deviceId))) throw new RemoteTabError("Remote PC is turned off on that computer (Settings, General, Remote PC in the Classgrid app there).", "not_allowed", 403);
    return row;
}

/**
 * The runner connections of the chat's computer, the chat's own app first (the Classgrid app for its chats, Classgrid
 * Code or the extension for theirs), then that computer's other apps. A connection that did not say its computer (apps
 * before 2026-11-18) is used only when none of that computer's did.
 */
export async function computerSockets(userId, row) {
    const { runnerSockets } = await import("./local-runner.service.js");
    const all = (await runnerSockets(userId).catch(() => [])) || [];
    const mine = row?.deviceId ? all.filter((s) => s?.data?.remoteDevice === row.deviceId) : all;
    const pick = mine.length ? mine : all.filter((s) => !s?.data?.remoteDevice);
    const wanted = APPS_OF_KIND[row?.deviceKind] || null;
    const rank = (s) => (!wanted || !s?.data?.runnerApp ? 1 : wanted.includes(s.data.runnerApp) ? 0 : 2);
    const at = (s) => Number(s?.data?.connectedAt) || 0;
    return [...pick].sort((a, b) => rank(a) - rank(b) || at(a) - at(b));
}

async function askSocket(s, payload, timeoutMs) {
    try {
        const reply = await s.timeout(timeoutMs).emitWithAck("local-tool", payload);
        return reply && typeof reply.text === "string" ? reply : null;
    } catch {
        return null;
    }
}

/**
 * Asks the chat's computer, one connection after another, until one answers with what `wanted(reply)` accepts.
 * Returns { reply } or { reply: null, old } (old: a connection said it has no such tool: an app from before).
 */
export async function askComputer(userId, row, tool, args = {}, { root = null, timeoutMs = 20000, wanted = () => true, sockets = null } = {}) {
    const list = sockets || (await computerSockets(userId, row));
    if (!list.length) throw offline();
    const payload = { tool, args, chat: String(row.sessionId), ...(root ? { root } : {}) };
    let old = false;
    let answered = false;
    for (const s of list) {
        const reply = await askSocket(s, payload, timeoutMs);
        if (!reply) continue;
        answered = true;
        if (NEEDS_UPDATE.test(reply.text) && reply.text.includes(tool)) { old = true; continue; }
        if (wanted(reply)) return { reply, old };
    }
    if (!answered) throw offline();
    return { reply: null, old };
}

// ── The chat's own answers (what Studio's chat reads to list them) ─────────────────────────────────────────────
const EDIT_TOOLS = new Set(["write_project_file", "edit_project_file", "write_project_file_from_spec"]);
const RUN_TOOLS = new Set(["run_code", "execute_terminal_command", "run_project_helpers", "check_helpers"]);

/** Whether an answer's steps changed files (Studio's FilesChangedSummary: only such an answer is in the Review list). */
export function stepsChangedFiles(steps) {
    for (const s of Array.isArray(steps) ? steps : []) {
        if (!s || s.status === "loading" || /^(error|no project is open)/i.test(String(s.result || "").trim())) continue;
        if (EDIT_TOOLS.has(s.tool) && /\+(\d+) -(\d+)\)\./.test(String(s.result || "")) && s.args?.path) return true;
        if (RUN_TOOLS.has(s.tool) && /FILES CHANGED IN PROJECT:\n\+\d+ -\d+ /.test(String(s.result || ""))) return true;
    }
    return false;
}

/** The background command ids the chat's answers started ("job_id: job2-ab3d", "as job_id job2-ab3d"). */
export function jobIdsIn(text) {
    const out = [];
    for (const m of String(text || "").matchAll(/job_id:? "?(job\d+-[0-9a-z]{1,8})\b/g)) if (!out.includes(m[1])) out.push(m[1]);
    return out;
}

async function savedAnswers(sessionId, like) {
    const { data } = await primarySupabaseClient
        .from("ai_chat_messages")
        .select("content, created_at")
        .eq("session_id", String(sessionId))
        .eq("role", "assistant")
        .ilike("content", like)
        .order("created_at", { ascending: true })
        .limit(500);
    const out = [];
    for (const r of data || []) {
        try {
            const m = JSON.parse(r.content);
            if (m && typeof m === "object") out.push(m);
        } catch { /* a plain answer: no steps */ }
    }
    return out;
}

// The chat's project: { place: "computer" | "cloud" | "none", project }
async function chatPlace(sessionId) {
    const { localProjectFor } = await import("./local-runner.service.js");
    const { projectForChat } = await import("./ide-project.service.js");
    const here = await localProjectFor(String(sessionId)).catch(() => null);
    if (here?.location === "local" && here.localPath) return { place: "computer", project: here };
    const project = here || (await projectForChat(String(sessionId)).catch(() => null));
    return project ? { place: "cloud", project } : { place: "none", project: null };
}

// ── Review ───────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * The chat's answers with changes, oldest first: { place, projectId, checkpoints, here, needsUpdate }. here: the ones
 * the computer kept (Studio opens on the newest of those, else the newest of all).
 */
export async function reviewList(user, sessionId) {
    const row = await remoteChatRow(user, sessionId);
    const { place, project } = await chatPlace(sessionId);
    const saved = (await savedAnswers(sessionId, '%"checkpoint":"%').catch(() => []))
        .filter((m) => typeof m.checkpoint === "string" && CHECKPOINT.test(m.checkpoint) && stepsChangedFiles(m.steps))
        .map((m) => m.checkpoint);
    let here = [];
    let needsUpdate = false;
    if (place === "computer") {
        // (each app keeps its own copies: every connection of the computer is asked)
        const sockets = await computerSockets(String(user._id), row);
        for (const s of sockets) {
            const r = await askComputer(String(user._id), row, "review_list", {}, { sockets: [s], timeoutMs: 15000 }).catch(() => null);
            if (r?.old) needsUpdate = true;
            if (Array.isArray(r?.reply?.checkpoints)) here.push(...r.reply.checkpoints.filter((c) => CHECKPOINT.test(String(c))).map(String));
        }
        here = [...new Set(here)].sort();
    }
    const checkpoints = [...new Set([...saved, ...here])].sort();
    return { place, projectId: project?._id ? String(project._id) : null, checkpoints, here, needsUpdate };
}

async function withSandbox(fn) {
    const { sandboxSsh } = await import("./ide-project.service.js");
    let ssh;
    try {
        ssh = await sandboxSsh();
        return await fn(ssh);
    } finally {
        ssh?.dispose();
    }
}

/** One answer's changes: { files: [{ file, added, removed, kind, diff, cut? }], finished, needsUpdate? } */
export async function reviewShow(user, sessionId, checkpoint) {
    if (!CHECKPOINT.test(String(checkpoint))) throw new RemoteTabError("Unknown checkpoint", "bad_checkpoint", 400);
    const row = await remoteChatRow(user, sessionId);
    const { place, project } = await chatPlace(sessionId);
    if (place === "computer") {
        const r = await askComputer(String(user._id), row, "review_show", { checkpoint: String(checkpoint) }, { timeoutMs: 60000, wanted: (x) => !!x.review || /^Error/.test(x.text) });
        if (r.reply && /^Error/.test(r.reply.text)) throw new RemoteTabError(r.reply.text.replace(/^Error:\s*/, ""), "computer_error", 400);
        if (r.reply?.review) return { files: r.reply.review.files || [], finished: r.reply.review.finished !== false };
        // (nothing kept on the computer for it: it changed no files there, as Studio shows it)
        return { files: [], finished: true, ...(r.old ? { needsUpdate: true } : {}) };
    }
    if (place === "cloud") {
        const { checkpointChanges } = await import("./ide-project.service.js");
        try {
            return await withSandbox((ssh) => checkpointChanges(project, ssh, String(sessionId), String(checkpoint)));
        } catch (e) {
            throw new RemoteTabError(e.message || "Could not load the changes", "review_failed", 400);
        }
    }
    return { files: [], finished: true };
}

/** Reject (one file, or all) or Undo one answer's changes: { reverted } (how many files were put back). */
export async function reviewPutBack(user, sessionId, checkpoint, { action = "reject", file = null } = {}) {
    if (!CHECKPOINT.test(String(checkpoint))) throw new RemoteTabError("Unknown checkpoint", "bad_checkpoint", 400);
    const one = typeof file === "string" && file.trim() ? file.trim().slice(0, 2000) : null;
    const row = await remoteChatRow(user, sessionId);
    const { place, project } = await chatPlace(sessionId);
    if (place === "computer") {
        // (Undo on a folder is Reject of every file, as Studio does it there: the before-copies put back)
        const r = await askComputer(String(user._id), row, "review_reject", { checkpoint: String(checkpoint), ...(one && action === "reject" ? { file: one } : {}) }, {
            timeoutMs: 2 * 60 * 1000,
            wanted: (x) => typeof x.reverted === "number" || /^Error/.test(x.text),
        });
        if (r.reply && /^Error/.test(r.reply.text)) throw new RemoteTabError(r.reply.text.replace(/^Error:\s*/, ""), "computer_error", 400);
        if (r.reply) return { reverted: r.reply.reverted };
        if (r.old) throw new RemoteTabError("Update the Classgrid app on your computer to undo or reject changes from your phone.", "needs_update", 409);
        return { reverted: 0 };
    }
    if (place === "cloud") {
        const svc = await import("./ide-project.service.js");
        try {
            const reverted = await withSandbox((ssh) => (action === "undo"
                ? svc.undoToCheckpoint(project, ssh, String(sessionId), String(checkpoint))
                : svc.rejectCheckpoint(project, ssh, String(sessionId), String(checkpoint), one)));
            return { reverted };
        } catch (e) {
            throw new RemoteTabError(e.message || (action === "undo" ? "Could not undo the changes" : "Could not reject the changes"), "review_failed", 400);
        }
    }
    return { reverted: 0 };
}

// ── Files ────────────────────────────────────────────────────────────────────────────────────────────────────
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|ico)$/i;

/** The older app's list_project_files text as the Files tab's entries */
export function entriesFromListText(text) {
    const files = [];
    for (const line of String(text || "").split("\n").slice(1)) {
        const p = line.trim();
        if (!p || p.startsWith("…") || p === "(empty)") continue;
        if (p.endsWith("/")) files.push({ path: p.slice(0, -1), type: "dir", size: null });
        else files.push({ path: p, type: "file", size: null });
    }
    return files;
}

/** The older app's view_project_file text ("rel (lines 1-9 of 9)\n1: ...") as the file's text */
export function contentFromViewText(text) {
    const lines = String(text || "").split("\n");
    const head = lines.shift() || "";
    const total = Number((head.match(/ of (\d+)\)$/) || [])[1]) || 0;
    const out = [];
    for (const l of lines) {
        const m = l.match(/^(\d+): ([\s\S]*)$/);
        if (m) out.push(m[2]);
    }
    return { content: out.join("\n"), truncated: total > out.length || /… \(cut:/.test(String(text)) };
}

/**
 * The chat's project files for the Files tab: { place, projectId, name, listing } (listing on the computer: { source:
 * "local", repo, branch, files }); a cloud project: the phone lists it with the project's own routes.
 */
export async function filesList(user, sessionId) {
    const row = await remoteChatRow(user, sessionId);
    const { place, project } = await chatPlace(sessionId);
    const base = { place, projectId: project?._id ? String(project._id) : null, name: project?.name || null };
    if (place !== "computer") return base;
    const root = project.localPath;
    const r = await askComputer(String(user._id), row, "files_list", {}, { root, timeoutMs: 30000, wanted: (x) => !!x.listing });
    if (r.reply?.listing) {
        if (r.reply.listing.error) throw new RemoteTabError(r.reply.listing.error, "computer_error", 400);
        return { ...base, listing: r.reply.listing };
    }
    // An app from before: the AI's own list (500 entries, 6 folders deep)
    const old = await askComputer(String(user._id), row, "list_project_files", { path: "", depth: 6 }, { root, timeoutMs: 30000, wanted: (x) => /^Project folder:/.test(x.text) || /^Error/.test(x.text) });
    if (!old.reply || /^Error/.test(old.reply.text)) throw new RemoteTabError(old.reply?.text?.replace(/^Error:\s*/, "") || "Could not load the files", "computer_error", 400);
    const files = entriesFromListText(old.reply.text);
    return { ...base, listing: { source: "local", repo: null, branch: null, files, truncated: /first 500 entries/.test(old.reply.text) } };
}

/** One file of the project on the computer, read only: { path, binary, image?, mime?, data?, content?, size?, truncated? } */
export async function fileRead(user, sessionId, rel) {
    const p = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!p || p.length > 2000 || p.split("/").some((x) => x === "..")) throw new RemoteTabError("File not found", "not_found", 404);
    const row = await remoteChatRow(user, sessionId);
    const { place, project } = await chatPlace(sessionId);
    if (place !== "computer") throw new RemoteTabError("File not found", "not_found", 404);
    const root = project.localPath;
    const r = await askComputer(String(user._id), row, "files_read", { path: p }, { root, timeoutMs: 30000, wanted: (x) => !!x.file });
    if (r.reply?.file) {
        if (r.reply.file.error) throw new RemoteTabError(r.reply.file.error, "computer_error", r.reply.file.error === "File not found" ? 404 : 400);
        return r.reply.file;
    }
    // An app from before: read with the AI's own file tool (text only)
    if (IMAGE_EXT.test(p)) return { path: p, binary: true, image: true };
    const old = await askComputer(String(user._id), row, "view_project_file", { path: p, start_line: 1, end_line: 1000000 }, { root, timeoutMs: 30000, wanted: (x) => / \(lines \d+-\d+ of \d+\)$/.test(x.text.split("\n")[0]) || /^Error/.test(x.text) });
    if (!old.reply || /^Error/.test(old.reply.text)) throw new RemoteTabError(old.reply?.text?.replace(/^Error:\s*/, "") || "Could not open the file", "computer_error", 400);
    return { path: p, binary: false, ...contentFromViewText(old.reply.text) };
}

// ── Terminal: the chat's background commands ─────────────────────────────────────────────────────────────────
/** The older app's check_background_command text as one job */
export function jobFromCheckText(id, text) {
    const t = String(text || "");
    if (/^Error/.test(t)) return null;
    const [command = "", state = ""] = t.split("\n");
    const m = state.match(/^(still running|finished \(exit code (-?\d+|null)\)), started (\d+)s ago\. Last output:$/);
    const output = t.split("Last output:\n").slice(1).join("Last output:\n");
    return {
        id,
        command,
        running: !m || m[1] === "still running",
        exitCode: m && m[2] !== undefined && m[2] !== "null" ? Number(m[2]) : null,
        startedAt: m ? Date.now() - Number(m[3]) * 1000 : null,
        output: output === "(no output yet)" ? "" : output,
    };
}

/** The chat's background commands on the computer: { jobs: [{ id, command, running, exitCode, startedAt, output }] } */
export async function chatJobs(user, sessionId) {
    const row = await remoteChatRow(user, sessionId);
    const r = await askComputer(String(user._id), row, "jobs_list", {}, { timeoutMs: 15000, wanted: (x) => Array.isArray(x.jobs) });
    if (r.reply) return { jobs: r.reply.jobs };
    // An app from before: the jobs the chat's answers started (saved, and the one running now), checked one by one
    const { liveState } = await import("./remote-pc.service.js");
    const saved = await savedAnswers(sessionId, "%job_id%").catch(() => []);
    const live = await liveState(String(sessionId)).catch(() => ({ events: [] }));
    const ids = [];
    for (const m of saved) for (const s of m.steps || []) for (const id of jobIdsIn(s?.result)) if (!ids.includes(id)) ids.push(id);
    for (const e of live.events || []) if (e?.type === "tool_result") for (const id of jobIdsIn(e.result)) if (!ids.includes(id)) ids.push(id);
    const jobs = [];
    for (const id of ids.filter((x) => JOB_ID.test(x)).slice(-30)) {
        const one = await askComputer(String(user._id), row, "check_background_command", { job_id: id, wait_seconds: 0 }, { timeoutMs: 15000 }).catch(() => null);
        const job = one?.reply ? jobFromCheckText(id, one.reply.text) : null;
        if (job) jobs.push(job);
    }
    return { jobs };
}

/**
 * Download File (Studio's Files tab, its More menu): the file as the Files tab has it, as bytes: { name, mime, buf }.
 * On the computer, what it sent (a text file's first 512 KB, a picture up to 600 KB); a cloud project's file through
 * its own Files route, with the person's own sign-in (authorization: the request's header).
 */
export async function fileDownload(user, sessionId, rel, authorization = "") {
    const p = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!p || p.length > 2000 || p.split("/").some((x) => x === "..")) throw new RemoteTabError("File not found", "not_found", 404);
    await remoteChatRow(user, sessionId);
    const { place, project } = await chatPlace(sessionId);
    let file = null;
    if (place === "computer") file = await fileRead(user, sessionId, p);
    else if (place === "cloud") {
        const port = process.env.PORT || 3000;
        const r = await fetch(`http://127.0.0.1:${port}/api/ide/projects/${encodeURIComponent(String(project._id))}/file?path=${encodeURIComponent(p)}`, { headers: { authorization: String(authorization || "") } });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new RemoteTabError(data.error || "Could not open the file", "cloud_error", r.status === 404 ? 404 : 400);
        file = data;
    } else throw new RemoteTabError("File not found", "not_found", 404);
    const name = p.split("/").pop() || "file";
    if (file?.data) return { name, mime: file.mime || "application/octet-stream", buf: Buffer.from(String(file.data), "base64") };
    if (typeof file?.content === "string") return { name, mime: "text/plain; charset=utf-8", buf: Buffer.from(file.content, "utf8") };
    throw new RemoteTabError("This file can't be shown as text.", "binary", 415);
}
