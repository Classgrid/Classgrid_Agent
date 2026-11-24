// "Run in background" on a command the AI is waiting for (owner, 2026-11-24, with a recording of another app: "also
// build it like yours, instead of showing Waiting for output"). desktop/runner.js: a command step that is still
// running can be moved to the background by the person (backgroundCommand, named by the step's id). The command is
// not stopped: it goes on as a background job, the step answers at once with what the command printed so far, and
// the job ends like any other (its output can be read, and the chat that started it is woken).
// Checked here, with real commands on this computer:
//   - a running command is moved: the step answers at once, in the words the server turns into "you are woken with
//     the result" (server/src/services/local-runner.service.js withWakeNote), and the command runs on to its end
//   - pressed twice, for a command that has ended, or for an unknown step: nothing happens (false)
//   - a command nobody moves still answers with its own output and exit code, as before
//   - code run with run_code can be moved the same way
// The runner is loaded as the editor extension loads it (no Electron); its connection is a stand-in.
// Run: node --test tests/run-in-background.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const realLoad = Module._load;
Module._load = function (request, ...rest) {
    if (request === "socket.io-client") return { io: () => ({ on() {}, emit() {}, disconnect() {} }) };
    if (request === "xlsx") return {};
    return realLoad.call(this, request, ...rest);
};
const require = createRequire(import.meta.url);
const runner = require(path.resolve(here, "../../desktop/runner.js"));

const win = process.platform === "win32";
const slow = (seconds, word) => (win ? `Write-Host start; Start-Sleep -Seconds ${seconds}; Write-Host ${word}` : `echo start; sleep ${seconds}; echo ${word}`);
const quick = (word) => (win ? `Write-Host ${word}` : `echo ${word}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = { timeout: 60000 };
// The server's own rule for a command that went to the background (withWakeNote): these words must be in the answer
const SERVER_KNOWS = /so it keeps running in the background as job_id (\S+?)\. Wait for it to finish with check_background_command \([^)]*\), or stop it with stop_background_command\./;

test("a running command is moved to the background: the step answers at once and the command runs on", T, async () => {
    const started = Date.now();
    const step = runner.runTool({ tool: "execute_terminal_command", args: { command: slow(6, "finished-in-background") }, chat: "chat-1", call: "call-1" });
    let answered = false;
    step.then(() => { answered = true; });
    await sleep(2500);
    assert.equal(answered, false, "the AI is still waiting for it");
    assert.equal(runner.backgroundCommand("call-1"), true);
    const reply = await step;
    assert.ok(Date.now() - started < 5500, "it answered before the command ended");
    assert.match(reply.text, /\[The user moved this command to the background while it was still running, so it keeps running in the background as job_id job/);
    const jobId = reply.text.match(SERVER_KNOWS)?.[1];
    assert.ok(jobId, "in the words the server turns into 'you are woken with the result'");
    assert.match(reply.text, /^start/, "with what it had printed so far");
    assert.equal(reply.text.includes("finished-in-background"), false);
    // pressed again: nothing more to move
    assert.equal(runner.backgroundCommand("call-1"), false);
    // the command was not stopped: it ends by itself, with its output
    const end = await runner.runTool({ tool: "check_background_command", args: { job_id: jobId, wait_seconds: 30 } });
    assert.match(end.text, /finished \(exit code 0\)/);
    assert.match(end.text, /finished-in-background/);
});

test("a command nobody moves answers with its own output, and cannot be moved after it ended", T, async () => {
    const reply = await runner.runTool({ tool: "execute_terminal_command", args: { command: quick("plain-run") }, chat: "chat-1", call: "call-2" });
    assert.match(reply.text, /plain-run/);
    assert.match(reply.text, /\[exit code 0\]$/);
    assert.equal(runner.backgroundCommand("call-2"), false);
    assert.equal(runner.backgroundCommand("no-such-step"), false);
    assert.equal(runner.backgroundCommand(""), false);
    assert.equal(runner.backgroundCommand(undefined), false);
});

test("a step with no id (asked another way) runs as before and offers nothing to move", T, async () => {
    const reply = await runner.runTool({ tool: "execute_terminal_command", args: { command: quick("no-id") }, chat: "chat-1" });
    assert.match(reply.text, /no-id/);
});

test("code run with run_code is moved the same way", T, async () => {
    const step = runner.runTool({ tool: "run_code", args: { language: win ? "powershell" : "bash", code: slow(5, "code-done") }, chat: "chat-2", call: "call-3" });
    await sleep(2000);
    assert.equal(runner.backgroundCommand("call-3"), true);
    const reply = await step;
    const jobId = reply.text.match(SERVER_KNOWS)?.[1];
    assert.ok(jobId);
    const end = await runner.runTool({ tool: "check_background_command", args: { job_id: jobId, wait_seconds: 30 } });
    assert.match(end.text, /code-done/);
});
