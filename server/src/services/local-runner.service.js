// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Local runner: a project the user opened from a folder on their own computer (IdeProject.location "local") has
 * its file and terminal tools run by the Classgrid desktop app on that computer, not on our cloud sandbox.
 * The app keeps a socket open with auth.runner = true; it joins the room runner:<userId>. A tool call is sent to
 * that room with an acknowledgement and the app answers with the tool's text.
 */
import crypto from "node:crypto";
import { getIO } from "./socket.service.js";
import { projectForChat } from "./ide-project.service.js";
import redis from "../config/redis.js";

// ── The app that is chatting runs the step itself (owner's requirement, 2026-11-09) ──────────────────────────
// While an answer streams to the desktop app or Classgrid Code and the app said it can run steps (body.pcTools),
// streamAskAi registers an executor for the user. Every step on the computer is then sent down THAT answer's own
// stream as a `pc_tool_call` event; the app runs it with its runner and posts the reply to POST /api/ai/pc-tool-result.
// No separate socket between the AI and the terminal: the result travels back on the same line the chat uses, to the
// very app the user is typing in (never "the oldest connection"). The socket below stays only as the fallback: turns
// with no app on the stream (wake-ups, WhatsApp tasks), helpers that outlive the answer, and older apps.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// One executor per answer in progress: { userId, sessionId, send(event) => boolean, alive() => boolean }. A step is
// sent to the answer's own app (by chat), so the desktop app, Classgrid Code and the website used at the same time
// each get their own steps (keyed by user alone, a second app's answer took over the first one's steps, 2026-11-10).
const pcExecutors = new Set();
export function registerPcExecutor(exec) {
    exec.userId = String(exec.userId);
    exec.sessionId = exec.sessionId ? String(exec.sessionId) : null;
    pcExecutors.add(exec);
    return () => { pcExecutors.delete(exec); };
}
export function pcExecutorFor(userId, sessionId) {
    const u = String(userId);
    const live = [...pcExecutors].filter((e) => e.userId === u && e.alive());
    if (!live.length) return null;
    if (sessionId) {
        const own = live.find((e) => e.sessionId === String(sessionId));
        if (own) return own;
    }
    // No chat named (a lookup before the answer, a repo sync): only when the user has a single answer running is it
    // clear which app to ask; otherwise the socket path decides
    return live.length === 1 ? live[0] : null;
}
const PC_RESULT = (id) => `ai:pctool:res:${id}`;
const PC_OWNER = (id) => `ai:pctool:owner:${id}`;
export const PC_REPLY_CHARS = 300000; // same cap as the runner's own replies (desktop/runner.js REPLY_CHARS)
// How long the server waits for the app's reply: the AI's own timeout_seconds (plus a minute for the app), else the
// tool's usual limit
const pcTimeoutFor = (tool, args) => {
    const chosen = Number(args?.timeout_seconds);
    if (Number.isFinite(chosen) && chosen > 0) return (Math.min(600, Math.max(5, chosen)) + 60) * 1000;
    return timeoutFor(tool, args);
};
async function askViaApp(exec, userId, tool, payload) {
    const id = crypto.randomBytes(12).toString("hex");
    await redis.set(PC_OWNER(id), String(userId), "EX", 3600).catch(() => {});
    const timeoutMs = pcTimeoutFor(tool, payload?.args);
    const sent = exec.send({ type: "pc_tool_call", id, tool, args: payload?.args || {}, root: payload?.root, projectId: payload?.projectId, chat: payload?.chat, ...(exec.checkpoint ? { checkpoint: exec.checkpoint } : {}), timeout_ms: timeoutMs });
    if (!sent) return null; // the stream is gone: the caller falls back to the socket
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
        const raw = await redis.get(PC_RESULT(id)).catch(() => null);
        if (raw !== null) {
            redis.del(PC_RESULT(id), PC_OWNER(id)).catch(() => {});
            try { const r = JSON.parse(raw); return r && typeof r.text === "string" ? r : { text: String(raw) }; } catch { return { text: String(raw) }; }
        }
        if (!exec.alive()) return null; // the user's stream dropped while the step ran: the socket path takes over
        await wait(300);
    }
    return { text: `Error: the Classgrid desktop app didn't answer in time (${Math.round(timeoutMs / 1000)} s). Ask the user to check the app is open.` };
}
/** The app's reply to a pc_tool_call (POST /api/ai/pc-tool-result): kept for the waiting step above */
export async function storePcToolReply(userId, id, reply) {
    if (!/^[0-9a-f]{24}$/.test(String(id || ""))) return "bad_id";
    const owner = await redis.get(PC_OWNER(id)).catch(() => null);
    if (!owner || owner !== String(userId)) return "unknown";
    const obj = reply && typeof reply === "object" ? reply : { text: String(reply ?? "") };
    const text = typeof obj.text === "string" ? obj.text : String(obj.text ?? "");
    const stored = { ...obj, text: text.length > PC_REPLY_CHARS ? `${text.slice(0, PC_REPLY_CHARS)}\n… (cut: the answer was too long; read or search a smaller part)` : text };
    await redis.set(PC_RESULT(id), JSON.stringify(stored), "EX", 3600);
    return "ok";
}

export const LOCAL_TOOLS = new Set([
    "list_project_files", "view_project_file", "search_project", "find_project_files", "write_project_file", "edit_project_file",
    "execute_terminal_command", "start_background_command", "check_background_command", "stop_background_command",
    "run_code", // Python / JavaScript / shell code runs in the project folder on their computer too
    "push_project_to_github", // git commit and push in the folder, with the user's own GitHub login
    "editor_context", // what the user is doing in the built-in editor (file, cursor, errors, terminal commands)
    "wait_until", // wait until a server is up, a page answers or a file appears
    "notebook_edit", // change one cell of a Jupyter notebook
    "send_background_input", // type into a running background command
]);

/** The chat's project when it is a folder on the user's computer, else null (in its own copy when the chat moved there) */
export async function localProjectFor(sessionId) {
    if (!sessionId) return null;
    const project = await projectForChat(sessionId).catch(() => null);
    return project?.location === "local" ? inChatWorktree(project, sessionId) : null;
}

// The main chat working in its own copy of a folder project (git worktree, on its own branch): use_worktree.
// While it is set, all the chat's project tools run in that copy; the user's main folder is left alone.
const WORKTREE = (sessionId) => `chatworktree:${sessionId}`;
export async function chatWorktree(sessionId) {
    if (!sessionId) return null;
    try { return JSON.parse((await redis.get(WORKTREE(sessionId))) || "null"); } catch { return null; }
}
export async function setChatWorktree(sessionId, wt) {
    if (wt) await redis.set(WORKTREE(sessionId), JSON.stringify(wt), "EX", 60 * 24 * 3600);
    else await redis.del(WORKTREE(sessionId));
}
export async function inChatWorktree(project, sessionId) {
    const wt = project?.location === "local" ? await chatWorktree(sessionId).catch(() => null) : null;
    return wt ? { owner: project.owner, _id: project._id, name: project.name, location: "local", localPath: wt.dir, mainPath: project.localPath, worktree: wt } : project;
}

const runnerRoom = (userId) => `runner:${userId}`;

/** Called for every socket: desktop app runners join their user's runner room */
export function registerRunnerSocket(socket) {
    if (socket.handshake?.auth?.runner && socket.userId) {
        socket.join(runnerRoom(String(socket.userId)));
        // A background command finished on the user's computer: its chat is woken with the result
        const userId = String(socket.userId);
        socket.on("local-job-done", (d) => { import("./chat-wake.service.js").then((m) => m.onLocalJobDone(userId, d)).catch(() => {}); });
        console.log(`[Local runner] desktop app connected for user ${socket.userId}`);
    }
}

// Commands may run for a while; file tools are quick
// (editor_context is asked before every answer, only for extra context: a desktop app that doesn't answer, e.g. while it
// updates, held each message 60 s before the AI started; 3 s, then the answer goes on without it)
// (a file sent from the computer straight to Classgrid's storage, read_local_file with upload: a big sound file on a slow connection)
const timeoutFor = (tool, args = null) => (tool === "editor_context" ? 3000 : tool === "computer" ? 2 * 60 * 1000 : tool === "execute_terminal_command" || tool === "run_code" || tool === "push_project_to_github" || tool === "clone_repo" || tool === "sync_repo" || tool === "check_background_command" || tool === "wait_until" || args?.upload ? 11 * 60 * 1000 : tool === "browser" ? 2 * 60 * 1000 : 60 * 1000);

// A command still running in the background: the AI is told it will be woken with the result (chat-wake.service.js
// onLocalJobDone), so it ends its answer instead of calling check_background_command again and again, up to 2 minutes
// each (a slow download held answers 3-35 minutes that way; 2026-11-05). The desktop app's own text said to wait.
const WAKE_NOTE = (id) => `It keeps running in the background as job_id ${id}. Don't wait for it and don't check it again and again: you are woken automatically with its result and exit code when it finishes. Tell the user briefly that it is running and end your answer now (or go on with other work that doesn't need its result). Only use check_background_command for its output so far if the user asks, and stop_background_command to stop it.`;
function withWakeNote(reply) {
    if (typeof reply?.text !== "string") return reply;
    const text = reply.text
        .replace(/so it keeps running in the background as job_id (\S+?)\. Wait for it to finish with check_background_command \([^)]*\), or stop it with stop_background_command\./, (_m, id) => `so: ${WAKE_NOTE(id)}`)
        .replace(/^Started in the background on the user's computer\. job_id: (\S+?)\. Check it with check_background_command\.$/, (_m, id) => `Started on the user's computer. ${WAKE_NOTE(id)}`);
    return text === reply.text ? reply : { ...reply, text };
}

// Sends one tool call to the user's desktop app. Returns its whole answer ({ text, ... }), or null when the app isn't open.
async function askRunner(userId, tool, payload) {
    const quiet = withQuietProgress(tool, payload);
    // The app that is chatting runs it (see pcExecutors above); the socket only when there is no such app
    const exec = pcExecutorFor(userId, payload?.chat);
    if (exec) {
        const reply = await askViaApp(exec, userId, tool, quiet);
        if (reply) return withWakeNote(reply);
    }
    return withWakeNote(await askRunnerOnce(userId, tool, quiet));
}
// Windows PowerShell draws a progress bar for every piece of a download (Invoke-WebRequest, Expand-Archive...), even in a
// hidden window, which makes them many times slower: it is switched off for the AI's PowerShell commands
function withQuietProgress(tool, payload) {
    const a = payload?.args;
    if (!["execute_terminal_command", "start_background_command"].includes(tool) || !a?.command) return payload;
    if (["bash", "sh", "git-bash", "cmd"].includes(String(a.shell || "powershell").toLowerCase())) return payload;
    return { ...payload, args: { ...a, command: `$ProgressPreference='SilentlyContinue'; ${a.command}` } };
}
// A runner connection whose line silently died (the user's internet dropped, the PC slept) stays in the room until the
// socket's ping timeout, which is 24 hours here (socket.service.js), and it is asked first, being the oldest: every
// step on the computer then waited the whole tool timeout on it (browser 2 min, a command 11 min) before the live app
// was asked, so a chat "never came back" (2026-11-09: three dead connections ahead of the app, 4 minutes per browser
// step, 33 minutes per command). Before a step, every connection is asked at once for a quick answer, and the ones
// that don't answer are dropped and disconnected, so only live ones are asked.
const PROBE_MS = 4000;
async function liveSockets(here) {
    const checked = await Promise.all(here.map(async (s) => {
        try {
            await s.timeout(PROBE_MS).emitWithAck("local-tool", { tool: "ping", args: {} }); // any answer counts, even "can't run"
            return s;
        } catch {
            try { s.disconnect(true); } catch { /* already gone */ }
            return null;
        }
    }));
    return checked.filter(Boolean);
}

async function askRunnerOnce(userId, tool, payload) {
    const io = getIO();
    const room = runnerRoom(String(userId));
    try {
        // The app's socket on this server process: ask it directly (no Redis round trip)
        // (oldest connection first, as before 2026-11-04: newest first sent Studio's browser steps to Classgrid Code's
        // connection whenever it was opened after the app; owner asked to undo only that change, 2026-11-05)
        const all = await io.local.in(room).fetchSockets();
        const here = all.length ? await liveSockets(all) : all;
        if (all.length && !here.length) return null; // every connection here is dead: the app isn't really open
        if (here.length) {
            // (only the editor state goes to all of them, being read-only: the first answer is used)
            if (tool === "editor_context" && here.length > 1) {
                const reply = await Promise.any(here.map((s) => s.timeout(timeoutFor(tool, payload?.args)).emitWithAck("local-tool", payload))).catch(() => null);
                return typeof reply?.text === "string" ? reply : null;
            }
            // A connection that can't do this step (Classgrid Code's has no browser, only the desktop app's has) says so at
            // once, and the next one is asked: the newest connection was Classgrid Code's whenever it was open, so the AI's
            // browser fell back to an empty cloud browser instead of the Studio browser on screen (2026-11-05)
            // A connection that doesn't answer at all (Classgrid Code left open after the app was closed: every step of the
            // chat and its helpers timed out on it, 2026-11-08) is skipped, and the next one is asked
            let reply = null;
            let lastError = null;
            for (const s of here) {
                try {
                    reply = await s.timeout(timeoutFor(tool, payload?.args)).emitWithAck("local-tool", payload);
                } catch (err) {
                    lastError = err;
                    reply = null;
                    try { s.disconnect(true); } catch { /* already gone */ } // it answered the probe but not the step: not asked again
                    continue;
                }
                if (!(typeof reply?.text === "string" && /can't run on this computer|wasn't opened in the Classgrid app/.test(reply.text))) break;
            }
            if (typeof reply?.text !== "string" && lastError) throw lastError;
            return typeof reply?.text === "string" ? reply : null;
        }
        // Connected to another server process: reach it through the Redis adapter (a few seconds to find it)
        const anywhere = await Promise.race([io.in(room).fetchSockets(), new Promise((r) => setTimeout(() => r([]), 4000))]).catch(() => []);
        if (!anywhere.length) return null;
        const replies = await io.to(room).timeout(timeoutFor(tool, payload?.args)).emitWithAck("local-tool", payload);
        return (Array.isArray(replies) ? replies.find((r) => r && typeof r.text === "string") : null) || null;
    } catch (err) {
        return { text: `Error: the Classgrid desktop app didn't answer in time (${err.message}). Ask the user to check the app is open.` };
    }
}

/** Whether the user's desktop app is connected right now (on any server process) */
export async function runnerOnline(userId) {
    try {
        const io = getIO();
        const room = runnerRoom(String(userId));
        if ((await io.local.in(room).fetchSockets()).length) return true;
        const anywhere = await Promise.race([io.in(room).fetchSockets(), new Promise((r) => setTimeout(() => r([]), 4000))]).catch(() => []);
        return anywhere.length > 0;
    } catch {
        return false;
    }
}

/** Runs one tool in the user's desktop app for this local project. Returns the tool's text. */
export async function callLocal(project, tool, args = {}, chat = null) {
    const reply = await askRunner(project.owner, tool, { tool, args: args || {}, projectId: String(project._id), root: project.localPath, ...(chat ? { chat: String(chat) } : {}) });
    return reply ? reply.text : "Error: this project is a folder on the user's computer, and the Classgrid desktop app isn't open there. Ask the user to open the Classgrid app on that computer, then try again.";
}

/** Runs one tool in the user's desktop app, not tied to a project (the terminal in a chat, the browser). Returns its answer, or null when the app isn't open. */
export function callRunner(userId, tool, args = {}, chat = null) {
    return askRunner(userId, tool, { tool, args: args || {}, ...(chat ? { chat: String(chat) } : {}) });
}

/** The AI using any app on the user's computer: a screen picture after each step (uploaded, so the chat step and models
 * that can't see pictures get a link). Returns { text, images } or an error text. */
export async function useComputer(userId, args = {}, chat = null) {
    const reply = await callRunner(userId, "computer", args, chat);
    if (!reply) return "The Classgrid desktop app isn't open on the user's computer. Tell the user to open it, then try again.";
    if (/can't run on this computer/.test(reply.text)) return "Error: the user's Classgrid desktop app is an older version that can't use apps on their computer. Ask them to update the app, then try again.";
    const image = reply.computer?.image;
    if (!image) return reply.text;
    let link = "";
    try {
        const { uploadBufferToR2 } = await import("../config/r2Client.js");
        link = await uploadBufferToR2(Buffer.from(image, "base64"), "screen.jpg", "image/jpeg");
    } catch (e) {
        console.warn(`[computer] could not upload the screen picture: ${e.message}`);
    }
    return { text: `${reply.text}${link ? ` Screenshot link: ${link}` : ""}`, images: [{ data: image }] };
}

export const COMPUTER_TERMINAL_TOOLS = new Set(["execute_terminal_command", "start_background_command", "check_background_command", "stop_background_command", "wait_until", "send_background_input"]);
// Project Mode's file tools, used on files anywhere on the computer in those chats (full paths)
export const COMPUTER_FILE_TOOLS = { write_project_file: "computer_write", edit_project_file: "computer_edit", search_project: "computer_search", find_project_files: "computer_list", list_project_files: "computer_list", notebook_edit: "computer_edit" };

/** The terminal tools in a desktop app chat that isn't a project: the command runs on the user's own computer (asks first). */
export async function runOnComputer(userId, tool, args = {}, chat = null) {
    const reply = await callRunner(userId, tool, args, chat);
    if (!reply) return "The Classgrid desktop app isn't open on the user's computer, so the command didn't run. Tell the user to open the Classgrid desktop app, then try again.";
    if (/can't run on this computer|wasn't opened in the Classgrid app/.test(reply.text)) return "Error: the user's Classgrid desktop app is an older version that can't do this on their computer. Ask them to update the app (or reinstall it from classgrid.in), then try again.";
    return reply.text;
}

const LOCAL_FILE_TEXT_CHARS = 18000;

// The whole file the app sends in pieces (the socket takes at most 1 MB per message): { buf }, or an error text
async function gatherFile(userId, file) {
    const parts = [Buffer.from(file.data, "base64")];
    for (let n = 1; n < Number(file.chunks || 1); n++) {
        const next = await callRunner(userId, "read_local_file", { path: file.path, chunk: n }, chat);
        if (!next) return "The Classgrid desktop app isn't open on the user's computer any more. Tell the user to open it, then try again.";
        if (typeof next.file?.data !== "string" || next.file.chunk !== n || next.file.bytes !== file.bytes) return next.text?.startsWith("Error") ? next.text : `Error: ${file.path} changed while it was being read. Try again.`;
        parts.push(Buffer.from(next.file.data, "base64"));
    }
    return { buf: Buffer.concat(parts) };
}

// A sound file (or a video's sound) from the user's computer, put on Classgrid's storage: { link }, or an error text.
// The app sends it there itself in one request (to a signed link made here) instead of through this server in 512 KB
// pieces, one round trip each (a 10-minute video's sound was 38 of them, 2026-11-09). An older app, or a send that
// failed, still comes in pieces.
async function soundToStorage(userId, file, name, mime) {
    const { getPresignedUploadUrl, uploadBufferToR2 } = await import("../config/r2Client.js");
    try {
        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(name, mime, 15 * 60);
        // (chunk 1: an older app that doesn't know "upload" answers with one small piece instead of reading it all again)
        const sent = await callRunner(userId, "read_local_file", { path: file.path, chunk: 1, upload: { url: uploadUrl, mime } }, chat);
        if (sent?.uploaded?.bytes === file.bytes) return { link: publicUrl };
        if (sent?.text) console.warn(`[read_local_file] the app didn't send the sound to storage itself: ${String(sent.text).slice(0, 200)}`);
    } catch (e) {
        console.warn(`[read_local_file] could not have the app send the sound to storage: ${e.message}`);
    }
    const got = await gatherFile(userId, file);
    if (typeof got === "string") return got;
    return { link: await uploadBufferToR2(got.buf, name, mime) };
}

// Sound on Classgrid's storage, turned into words like any audio (transcribe_audio)
async function soundToText(link) {
    try {
        const { handleToolCall } = await import("../mcp/tools.js");
        const said = String((await handleToolCall("transcribe_audio", { fileUrl: link }))?.content?.[0]?.text || "").trim();
        if (!said || /^Error/i.test(said)) return ` Its sound couldn't be turned into words${said ? ` (${said.replace(/^Error:\s*/i, "").slice(0, 200)})` : ""}. The sound file is here: ${link}`;
        return ` Words heard in its sound (speech to text, may have small mistakes; songs come out as their lyrics):
${said}
(The sound file: ${link})`;
    } catch (e) {
        console.warn(`[read_local_file] could not turn the sound into words: ${e.message}`);
        return " Its sound couldn't be turned into words this time.";
    }
}

/**
 * read_local_file: any file or folder on the user's computer, read by their Classgrid desktop app (the chat asks the
 * user first on the permission card). Pictures come back as images the AI looks at itself (as view_image), documents
 * (PDF, Word, Excel, PowerPoint) as their text, other files as text.
 */
export async function readLocalFile(userId, args = {}, { seesImages = false, chat = null } = {}) {
    const given = String(args?.path || "").trim();
    if (!given) return "Error: path is empty. Give the full path of the file, like C:\\Users\\name\\Downloads\\photo.png";
    const notOpen = "The Classgrid desktop app isn't open on the user's computer, so files there can't be read right now. Tell the user to open the Classgrid desktop app, then try again.";
    const first = await callRunner(userId, "read_local_file", { path: given, start_line: args?.start_line, end_line: args?.end_line, start_page: args?.start_page }, chat);
    if (!first) return notOpen;
    if (/read_local_file can't run on this computer/.test(first.text)) return "Error: the user's Classgrid desktop app is an older version that can't read files on their computer. Ask them to update the app (or reinstall it from classgrid.in), then try again.";
    // A scanned PDF whose pages the app already made into pictures on the computer (only the pictures came here)
    if (Array.isArray(first.images) && first.images.length && first.pdfPages) {
        let linkText = "";
        try {
            const { uploadBufferToR2 } = await import("../config/r2Client.js");
            const links = await Promise.all(first.images.map((b64, n) => uploadBufferToR2(Buffer.from(b64, "base64"), `local-pdf-page-${first.pdfPages.first + n}.jpg`, "image/jpeg")));
            linkText = ` If no pictures are shown to you below, read each page with analyze_image (ask it to write out all the text and tables on the page): ${links.map((l, n) => `page ${first.pdfPages.first + n}: ${l}`).join(", ")}`;
        } catch (e) {
            console.warn(`[read_local_file] could not upload the PDF's pages for analyze_image: ${e.message}`);
        }
        return { text: `${first.text}${linkText}`, images: first.images.map((data) => ({ data })) };
    }
    // A video: pictures from across it, taken by the app (one by one, and all on one sheet for analyze_image), and
    // the words in its sound
    if (first.video && Array.isArray(first.video.frames)) {
        let link = "";
        try {
            const { uploadBufferToR2 } = await import("../config/r2Client.js");
            if (first.video.sheet) link = await uploadBufferToR2(Buffer.from(first.video.sheet, "base64"), "local-video-frames.jpg", "image/jpeg");
        } catch (e) {
            console.warn(`[read_local_file] could not upload the video's frames for analyze_image: ${e.message}`);
        }
        let heard = "";
        if (first.file?.kind === "audio") {
            const sound = await soundToStorage(userId, first.file, "local-video-sound.wav", "audio/wav");
            heard = typeof sound === "string" ? ` Its sound couldn't be fetched (${sound.replace(/^Error: /, "")}).` : await soundToText(sound.link);
        }
        const frames = first.video.frames;
        const shown = first.video.sheet ? [first.video.sheet, ...frames] : frames;
        const order = first.video.sheet ? " The first picture is a sheet with all of them, in order, left to right, top to bottom; then each one bigger, in order." : "";
        return { text: `${first.text}${order}${link ? ` If no pictures are shown to you below, use analyze_image with this link (all the pictures on one sheet, in order, left to right, top to bottom): ${link}` : ""}${heard}`, images: shown.map((data) => ({ data })) };
    }
    const file = first.file;
    if (!file || typeof file.data !== "string") return first.text;

    const sizeOf = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} bytes`);
    if (file.kind === "audio") {
        const sound = await soundToStorage(userId, file, file.name || "local-audio", file.mime);
        if (typeof sound === "string") return sound;
        return `Audio ${file.path} (${sizeOf(file.bytes)}).${await soundToText(sound.link)}`;
    }

    const got = await gatherFile(userId, file);
    if (typeof got === "string") return got;
    const { buf } = got;
    const size = sizeOf(buf.length);

    if (file.kind === "image") {
        // A model that can't see pictures uses analyze_image on a Classgrid link, like an uploaded picture. A model that
        // sees pictures gets the picture itself below, so it doesn't wait for that upload (2026-11-09).
        let link = "";
        if (!seesImages) {
            try {
                const { uploadBufferToR2 } = await import("../config/r2Client.js");
                link = await uploadBufferToR2(buf, file.mime === "image/jpeg" ? "local-file.jpg" : `local-file${String(file.name).match(/\.(png|gif|webp)$/i)?.[0] || ".png"}`, file.mime);
            } catch (e) {
                console.warn(`[read_local_file] could not upload the picture for analyze_image: ${e.message}`);
            }
        }
        const text = `Picture ${file.path} (${size}${buf.length !== file.size ? ", made smaller to show it" : ""}) is attached below. Look at it yourself; describe only what you actually see.${link ? ` If no picture is shown to you below, use analyze_image with this link: ${link}` : ""}`;
        return { text, images: [{ data: buf.toString("base64") }] };
    }

    const { extractDocumentText, DocumentReadError } = await import("./document-text.service.js");
    try {
        const doc = await extractDocumentText(buf, { fileName: file.name, contentType: file.mime });
        const lines = String(doc.text || "").split("\n");
        const start = Math.min(lines.length, Math.max(1, Number(args?.start_line) || 1));
        const last = Math.min(lines.length, Number(args?.end_line) || lines.length);
        const out = [];
        let chars = 0;
        for (let n = start; n <= last && (!out.length || chars + lines[n - 1].length <= LOCAL_FILE_TEXT_CHARS); n++) {
            out.push(lines[n - 1].slice(0, LOCAL_FILE_TEXT_CHARS));
            chars += lines[n - 1].length + 1;
        }
        const end = start + out.length - 1;
        const more = end < lines.length ? ` To read more, call read_local_file again with start_line ${end + 1}.` : "";
        return `${file.path} (${doc.kind}${doc.detail ? `, ${doc.detail}` : ""}, lines ${start}-${end} of ${lines.length} of its text).${more}\n${out.join("\n")}`;
    } catch (e) {
        if (!(e instanceof DocumentReadError)) return `Error: ${file.path} could not be read (${e.message}).`;
        // A scanned PDF has no text: its pages are shown as pictures instead
        if (file.mime === "application/pdf") {
            try {
                const { pdfPageImages } = await import("./llm-stream-anthropic.js");
                // Up to 20 pages in one step; start_page reads the next ones
                const { images, pages, first } = await pdfPageImages(buf, 20, args?.start_page);
                if (images.length) {
                    // A model that can't see pictures reads each page with analyze_image on its Classgrid link
                    let links = [];
                    try {
                        const { uploadBufferToR2 } = await import("../config/r2Client.js");
                        links = await Promise.all(images.map((jpg, n) => uploadBufferToR2(jpg, `local-pdf-page-${first + n}.jpg`, "image/jpeg")));
                    } catch (err) {
                        console.warn(`[read_local_file] could not upload the PDF's pages for analyze_image: ${err.message}`);
                    }
                    const last = first + images.length - 1;
                    const linkText = links.length ? ` If no pictures are shown to you below, read each page with analyze_image (ask it to write out all the text and tables on the page): ${links.map((l, n) => `page ${first + n}: ${l}`).join(", ")}` : "";
                    const more = last < pages ? ` To see pages ${last + 1}-${Math.min(pages, last + 20)}, call read_local_file again with start_page: ${last + 1}. Don't use the terminal for this PDF.` : "";
                    return { text: `${file.path} is a scanned PDF with no text inside (${pages} page${pages === 1 ? "" : "s"}). ${images.length === pages ? `Its ${pages === 1 ? "page is" : `${pages} pages are`}` : `Pages ${first}-${last} of ${pages} are`} attached below as ${images.length === 1 ? "a picture; read it" : "pictures; read them"} yourself.${more}${linkText}`, images: images.map((jpg) => ({ data: jpg.toString("base64") })) };
                }
            } catch (err) {
                console.warn(`[read_local_file] could not draw the PDF's pages: ${err.message}`);
            }
        }
        return `Error: ${file.path}: ${e.message.replace(/ Use the analyze_image tool.*$/, "")}`;
    }
}
