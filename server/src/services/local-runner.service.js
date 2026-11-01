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
        console.log(`[Local runner] desktop app connected for user ${socket.userId}`);
    }
}

// Commands may run for a while; file tools are quick
const timeoutFor = (tool) => (tool === "execute_terminal_command" || tool === "run_code" ? 10 * 60 * 1000 : 60 * 1000);

/** Runs one tool in the user's desktop app for this local project. Returns the tool's text. */
export async function callLocal(project, tool, args = {}) {
    const io = getIO();
    const room = runnerRoom(String(project.owner));
    const payload = { tool, args: args || {}, projectId: String(project._id), root: project.localPath };
    const notOpen = "Error: this project is a folder on the user's computer, and the Classgrid desktop app isn't open there. Ask the user to open the Classgrid app on that computer, then try again.";
    try {
        // The app's socket on this server process: ask it directly (no Redis round trip)
        const here = await io.local.in(room).fetchSockets();
        if (here.length) {
            const reply = await here[0].timeout(timeoutFor(tool)).emitWithAck("local-tool", payload);
            return typeof reply?.text === "string" ? reply.text : notOpen;
        }
        // Connected to another server process: reach it through the Redis adapter (a few seconds to find it)
        const anywhere = await Promise.race([io.in(room).fetchSockets(), new Promise((r) => setTimeout(() => r([]), 4000))]).catch(() => []);
        if (!anywhere.length) return notOpen;
        const replies = await io.to(room).timeout(timeoutFor(tool)).emitWithAck("local-tool", payload);
        const reply = Array.isArray(replies) ? replies.find((r) => r && typeof r.text === "string") : null;
        return reply ? reply.text : notOpen;
    } catch (err) {
        return `Error: the Classgrid desktop app didn't answer in time (${err.message}). Ask the user to check the app is open.`;
    }
}
