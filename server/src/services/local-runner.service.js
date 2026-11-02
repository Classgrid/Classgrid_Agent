// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Local runner: a project the user opened from a folder on their own computer (IdeProject.location "local") has
 * its file and terminal tools run by the Classgrid desktop app on that computer, not on our cloud sandbox.
 * The app keeps a socket open with auth.runner = true; it joins the room runner:<userId>. A tool call is sent to
 * that room with an acknowledgement and the app answers with the tool's text.
 */
import { getIO } from "./socket.service.js";
import { projectForChat } from "./ide-project.service.js";

export const LOCAL_TOOLS = new Set([
    "list_project_files", "view_project_file", "search_project", "write_project_file", "edit_project_file",
    "execute_terminal_command", "start_background_command", "check_background_command", "stop_background_command",
    "run_code", // Python / JavaScript / shell code runs in the project folder on their computer too
    "push_project_to_github", // git commit and push in the folder, with the user's own GitHub login
    "editor_context", // what the user is doing in the built-in editor (file, cursor, errors, terminal commands)
]);

/** The chat's project when it is a folder on the user's computer, else null */
export async function localProjectFor(sessionId) {
    if (!sessionId) return null;
    const project = await projectForChat(sessionId).catch(() => null);
    return project?.location === "local" ? project : null;
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
const timeoutFor = (tool) => (tool === "execute_terminal_command" || tool === "run_code" || tool === "push_project_to_github" || tool === "check_background_command" ? 10 * 60 * 1000 : tool === "browser" ? 2 * 60 * 1000 : 60 * 1000);

// Sends one tool call to the user's desktop app. Returns its whole answer ({ text, ... }), or null when the app isn't open.
async function askRunner(userId, tool, payload) {
    const io = getIO();
    const room = runnerRoom(String(userId));
    try {
        // The app's socket on this server process: ask it directly (no Redis round trip)
        const here = await io.local.in(room).fetchSockets();
        if (here.length) {
            const reply = await here[0].timeout(timeoutFor(tool)).emitWithAck("local-tool", payload);
            return typeof reply?.text === "string" ? reply : null;
        }
        // Connected to another server process: reach it through the Redis adapter (a few seconds to find it)
        const anywhere = await Promise.race([io.in(room).fetchSockets(), new Promise((r) => setTimeout(() => r([]), 4000))]).catch(() => []);
        if (!anywhere.length) return null;
        const replies = await io.to(room).timeout(timeoutFor(tool)).emitWithAck("local-tool", payload);
        return (Array.isArray(replies) ? replies.find((r) => r && typeof r.text === "string") : null) || null;
    } catch (err) {
        return { text: `Error: the Classgrid desktop app didn't answer in time (${err.message}). Ask the user to check the app is open.` };
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

export const COMPUTER_TERMINAL_TOOLS = new Set(["execute_terminal_command", "start_background_command", "check_background_command", "stop_background_command"]);
// Project Mode's file tools, used on files anywhere on the computer in those chats (full paths)
export const COMPUTER_FILE_TOOLS = { write_project_file: "computer_write", edit_project_file: "computer_edit", search_project: "computer_search", list_project_files: "computer_list" };

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
        const next = await callRunner(userId, "read_local_file", { path: file.path, chunk: n });
        if (!next) return "The Classgrid desktop app isn't open on the user's computer any more. Tell the user to open it, then try again.";
        if (typeof next.file?.data !== "string" || next.file.chunk !== n || next.file.bytes !== file.bytes) return next.text?.startsWith("Error") ? next.text : `Error: ${file.path} changed while it was being read. Try again.`;
        parts.push(Buffer.from(next.file.data, "base64"));
    }
    return { buf: Buffer.concat(parts) };
}

// Sound from the user's computer: put on Classgrid's storage, then turned into words like any audio (transcribe_audio)
async function soundToText(buf, name, mime) {
    try {
        const { uploadBufferToR2 } = await import("../config/r2Client.js");
        const link = await uploadBufferToR2(buf, name, mime);
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
export async function readLocalFile(userId, args = {}) {
    const given = String(args?.path || "").trim();
    if (!given) return "Error: path is empty. Give the full path of the file, like C:\\Users\\name\\Downloads\\photo.png";
    const notOpen = "The Classgrid desktop app isn't open on the user's computer, so files there can't be read right now. Tell the user to open the Classgrid desktop app, then try again.";
    const first = await callRunner(userId, "read_local_file", { path: given, start_line: args?.start_line, end_line: args?.end_line });
    if (!first) return notOpen;
    if (/read_local_file can't run on this computer/.test(first.text)) return "Error: the user's Classgrid desktop app is an older version that can't read files on their computer. Ask them to update the app (or reinstall it from classgrid.in), then try again.";
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
            const sound = await gatherFile(userId, first.file);
            heard = typeof sound === "string" ? ` Its sound couldn't be fetched (${sound.replace(/^Error: /, "")}).` : await soundToText(sound.buf, "local-video-sound.wav", "audio/wav");
        }
        const frames = first.video.frames;
        const shown = first.video.sheet ? [first.video.sheet, ...frames] : frames;
        const order = first.video.sheet ? " The first picture is a sheet with all of them, in order, left to right, top to bottom; then each one bigger, in order." : "";
        return { text: `${first.text}${order}${link ? ` If no pictures are shown to you below, use analyze_image with this link (all the pictures on one sheet, in order, left to right, top to bottom): ${link}` : ""}${heard}`, images: shown.map((data) => ({ data })) };
    }
    const file = first.file;
    if (!file || typeof file.data !== "string") return first.text;

    const got = await gatherFile(userId, file);
    if (typeof got === "string") return got;
    const { buf } = got;
    const size = buf.length >= 1048576 ? `${(buf.length / 1048576).toFixed(1)} MB` : buf.length >= 1024 ? `${Math.round(buf.length / 1024)} KB` : `${buf.length} bytes`;

    if (file.kind === "audio") return `Audio ${file.path} (${size}).${await soundToText(buf, file.name || "local-audio", file.mime)}`;
    if (file.kind === "image") {
        // A model that can't see pictures uses analyze_image on a Classgrid link, like an uploaded picture
        let link = "";
        try {
            const { uploadBufferToR2 } = await import("../config/r2Client.js");
            link = await uploadBufferToR2(buf, file.mime === "image/jpeg" ? "local-file.jpg" : `local-file${String(file.name).match(/\.(png|gif|webp)$/i)?.[0] || ".png"}`, file.mime);
        } catch (e) {
            console.warn(`[read_local_file] could not upload the picture for analyze_image: ${e.message}`);
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
