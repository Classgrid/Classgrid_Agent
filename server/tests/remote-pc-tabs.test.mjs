// Remote PC: Studio's own tabs on the phone (owner, 2026-11-18): Review, Files and the chat's background commands,
// asked of the chat's computer over its runner connection. services/remote-pc-tabs.service.js.
// Run: node --experimental-test-module-mocks --test tests/remote-pc-tabs.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const S = "11111111-2222-3333-4444-555555555555";
const user = { _id: "u1", email: "a@b.c" };
let row = null;
let allowed = true;
let sockets = [];
let project = null;
let saved = [];
let live = { events: [] };
const cloudCalls = [];

mock.module("../src/models/RemoteChat.js", {
    defaultExport: { findOne: (q) => ({ lean: async () => (row && q.sessionId === row.sessionId ? row : null) }) },
});
mock.module("../src/services/remote-pc.service.js", {
    namedExports: { deviceAllowed: async () => allowed, liveState: async () => live },
});
mock.module("../src/services/local-runner.service.js", {
    namedExports: {
        runnerSockets: async () => sockets,
        localProjectFor: async () => (project?.location === "local" ? project : project),
    },
});
mock.module("../src/services/ide-project.service.js", {
    namedExports: {
        projectForChat: async () => project,
        sandboxSsh: async () => ({ dispose() {} }),
        checkpointChanges: async (p, ssh, s, cp) => { cloudCalls.push(["show", s, cp]); return { files: [{ file: "a.js", added: 1, removed: 0, kind: "changed", diff: "@@" }] }; },
        rejectCheckpoint: async (p, ssh, s, cp, file) => { cloudCalls.push(["reject", cp, file]); return 2; },
        undoToCheckpoint: async (p, ssh, s, cp) => { cloudCalls.push(["undo", cp]); return 3; },
    },
});
mock.module("../src/config/supabaseClient.js", {
    namedExports: {
        primarySupabaseClient: {
            from: () => {
                const q = { select: () => q, eq: () => q, ilike: () => q, order: () => q, limit: async () => ({ data: saved.map((m) => ({ content: JSON.stringify(m) })) }) };
                return q;
            },
        },
    },
});

// A runner connection: answers each tool with handler(payload)
const sock = (data, handler) => {
    const asked = [];
    return { data, asked, timeout: () => ({ emitWithAck: async (ev, payload) => { asked.push(payload); return handler(payload); } }) };
};
const OLD = (p) => ({ text: `Error: ${p.tool} can't run on this computer.` });

const tabs = await import("../src/services/remote-pc-tabs.service.js");

const reset = () => {
    row = { sessionId: S, on: true, deviceId: "abcdef0123456789", deviceKind: "desktop" };
    allowed = true;
    sockets = [];
    project = { _id: "p1", name: "site", location: "local", localPath: "C:\\code\\site" };
    saved = [];
    live = { events: [] };
    cloudCalls.length = 0;
};

test("only the person's own chat with Remote PC on, on a computer that allows it", async () => {
    reset();
    row = null;
    await assert.rejects(tabs.reviewList(user, S), (e) => e.code === "not_remote" && e.status === 404);
    reset();
    allowed = false;
    await assert.rejects(tabs.filesList(user, S), (e) => e.code === "not_allowed" && e.status === 403);
    reset();
    await assert.rejects(tabs.chatJobs(user, S), (e) => e.code === "offline" && e.status === 503);
});

test("the chat's own computer is asked, its own app first; another computer never", async () => {
    reset();
    const other = sock({ remoteDevice: "ffffffffffffffff", runnerApp: "desktop", connectedAt: 1 }, () => ({ text: "ok", jobs: [{ id: "x" }] }));
    const ext = sock({ remoteDevice: row.deviceId, runnerApp: "extension", connectedAt: 1 }, () => ({ text: "ok", jobs: [{ id: "from-ext" }] }));
    const app = sock({ remoteDevice: row.deviceId, runnerApp: "desktop", connectedAt: 5 }, () => ({ text: "ok", jobs: [{ id: "from-app" }] }));
    sockets = [other, ext, app];
    const out = await tabs.computerSockets("u1", row);
    assert.deepEqual(out, [app, ext]);
    assert.deepEqual((await tabs.chatJobs(user, S)).jobs, [{ id: "from-app" }]);
    assert.equal(other.asked.length, 0);
    assert.equal(app.asked[0].chat, S);
    // (a connection that did not say its computer: only when none of the computer's did)
    const unknown = sock({ runnerApp: "desktop" }, () => ({ text: "ok", jobs: [] }));
    sockets = [other, unknown];
    assert.deepEqual(await tabs.computerSockets("u1", row), [unknown]);
});

test("Review lists the answers that changed files, saved and kept on the computer", async () => {
    reset();
    saved = [
        { checkpoint: "1700000000001", steps: [{ tool: "edit_project_file", args: { path: "a.js" }, result: "Edited a.js (edit 1: 1 place, +1 -1)." }] },
        { checkpoint: "1700000000002", steps: [{ tool: "view_project_file", args: { path: "a.js" }, result: "a.js (lines 1-2 of 2)" }] },
        { checkpoint: "1700000000003", steps: [{ tool: "execute_terminal_command", result: "ok\n\nFILES CHANGED IN PROJECT:\n+2 -0 b.js" }] },
    ];
    sockets = [
        sock({ remoteDevice: row.deviceId, runnerApp: "desktop" }, (p) => (p.tool === "review_list" ? { text: "ok", checkpoints: ["1700000000004", "1700000000001"] } : null)),
        sock({ remoteDevice: row.deviceId, runnerApp: "code" }, OLD),
    ];
    const out = await tabs.reviewList(user, S);
    assert.equal(out.place, "computer");
    assert.deepEqual(out.checkpoints, ["1700000000001", "1700000000003", "1700000000004"]);
    assert.deepEqual(out.here, ["1700000000001", "1700000000004"]);
    assert.equal(out.needsUpdate, true);
});

test("Review of one answer: from the computer, nothing kept there, an older app, a cloud project", async () => {
    reset();
    const files = [{ file: "a.js", added: 1, removed: 1, kind: "changed", diff: "@@ -1 +1 @@\n-a\n+b" }];
    sockets = [sock({ remoteDevice: row.deviceId }, (p) => ({ text: "ok", review: p.args.checkpoint === "1700000000001" ? { files, finished: true } : null }))];
    assert.deepEqual(await tabs.reviewShow(user, S, "1700000000001"), { files, finished: true });
    assert.deepEqual(await tabs.reviewShow(user, S, "1700000000009"), { files: [], finished: true });
    await assert.rejects(tabs.reviewShow(user, S, "../x"), (e) => e.status === 400);
    sockets = [sock({ remoteDevice: row.deviceId }, OLD)];
    assert.equal((await tabs.reviewShow(user, S, "1700000000001")).needsUpdate, true);
    project = { _id: "p2", name: "cloud", location: "cloud" };
    assert.equal((await tabs.reviewShow(user, S, "1700000000001")).files[0].file, "a.js");
    assert.deepEqual(cloudCalls[0], ["show", S, "1700000000001"]);
});

test("Reject one file, Reject all and Undo put the files back where the answer worked", async () => {
    reset();
    const app = sock({ remoteDevice: row.deviceId }, (p) => (p.tool === "review_reject" ? { text: "ok", reverted: p.args.file ? 1 : 4 } : null));
    sockets = [app];
    assert.deepEqual(await tabs.reviewPutBack(user, S, "1700000000001", { file: "src/a.js" }), { reverted: 1 });
    assert.equal(app.asked[0].args.file, "src/a.js");
    assert.deepEqual(await tabs.reviewPutBack(user, S, "1700000000001", { action: "undo", file: "src/a.js" }), { reverted: 4 });
    assert.equal(app.asked[1].args.file, undefined);
    sockets = [sock({ remoteDevice: row.deviceId }, () => ({ text: "Error: Could not put back a.js" }))];
    await assert.rejects(tabs.reviewPutBack(user, S, "1700000000001"), (e) => e.message === "Could not put back a.js");
    sockets = [sock({ remoteDevice: row.deviceId }, OLD)];
    await assert.rejects(tabs.reviewPutBack(user, S, "1700000000001"), (e) => e.code === "needs_update" && e.status === 409);
    project = { _id: "p2", location: "cloud" };
    assert.deepEqual(await tabs.reviewPutBack(user, S, "1700000000001", { action: "undo" }), { reverted: 3 });
    assert.deepEqual(await tabs.reviewPutBack(user, S, "1700000000001", { file: "a.js" }), { reverted: 2 });
    assert.deepEqual(cloudCalls, [["undo", "1700000000001"], ["reject", "1700000000001", "a.js"]]);
});

test("Files: the folder on the computer, and an app from before with the AI's own read tools", async () => {
    reset();
    const listing = { source: "local", repo: "me/site", branch: "main", files: [{ path: "src", type: "dir", size: null }, { path: "src/a.js", type: "file", size: 3 }] };
    sockets = [sock({ remoteDevice: row.deviceId }, (p) => (p.tool === "files_list" ? { text: "ok", listing } : p.tool === "files_read" ? { text: "ok", file: { path: p.args.path, binary: false, content: "abc", size: 3 } } : null))];
    const out = await tabs.filesList(user, S);
    assert.deepEqual(out, { place: "computer", projectId: "p1", name: "site", listing });
    assert.equal((await tabs.fileRead(user, S, "src/a.js")).content, "abc");
    await assert.rejects(tabs.fileRead(user, S, "../secret"), (e) => e.status === 404);
    // the older app
    const old = sock({ remoteDevice: row.deviceId }, (p) => {
        if (p.tool === "list_project_files") return { text: "Project folder: /\nsrc/\nsrc/a.js\nREADME.md" };
        if (p.tool === "view_project_file") return { text: "src/a.js (lines 1-2 of 2)\n1: const a = 1;\n2: export default a;" };
        return OLD(p);
    });
    sockets = [old];
    assert.deepEqual((await tabs.filesList(user, S)).listing.files, [{ path: "src", type: "dir", size: null }, { path: "src/a.js", type: "file", size: null }, { path: "README.md", type: "file", size: null }]);
    const f = await tabs.fileRead(user, S, "src/a.js");
    assert.equal(f.content, "const a = 1;\nexport default a;");
    assert.equal(f.truncated, false);
    assert.equal(old.asked.at(-1).root, "C:\\code\\site");
    // a cloud project: the phone uses the project's own routes
    project = { _id: "p2", name: "cloud", location: "cloud" };
    assert.deepEqual(await tabs.filesList(user, S), { place: "cloud", projectId: "p2", name: "cloud" });
});

test("Terminal: the chat's background commands, and an app from before checked one by one", async () => {
    reset();
    saved = [{ steps: [{ tool: "start_background_command", result: "Started in the background on the user's computer. job_id: job1-ab12. Check it with check_background_command." }] }];
    live = { events: [{ type: "tool_result", result: "(no output yet)\n[Still running after 120 seconds, so it keeps running in the background as job_id job2-cd34. Wait for it]" }] };
    const old = sock({ remoteDevice: row.deviceId }, (p) => {
        if (p.tool !== "check_background_command") return OLD(p);
        return p.args.job_id === "job1-ab12"
            ? { text: "npm run dev\nstill running, started 30s ago. Last output:\nready on 3000" }
            : { text: "npm test\nfinished (exit code 1), started 200s ago. Last output:\n(no output yet)" };
    });
    sockets = [old];
    const { jobs } = await tabs.chatJobs(user, S);
    assert.equal(jobs.length, 2);
    assert.deepEqual({ ...jobs[0], startedAt: null }, { id: "job1-ab12", command: "npm run dev", running: true, exitCode: null, startedAt: null, output: "ready on 3000" });
    assert.equal(jobs[1].running, false);
    assert.equal(jobs[1].exitCode, 1);
    assert.equal(jobs[1].output, "");
    assert.equal(old.asked.find((p) => p.tool === "check_background_command").args.wait_seconds, 0);
});

test("helpers: an answer that changed files, job ids in a step's text", () => {
    assert.equal(tabs.stepsChangedFiles([{ tool: "write_project_file", args: { path: "x" }, result: "Created x (3 lines, +3 -0)." }]), true);
    assert.equal(tabs.stepsChangedFiles([{ tool: "edit_project_file", args: { path: "x" }, result: "Error: old_text was not found (+1 -1)." }]), false);
    assert.deepEqual(tabs.jobIdsIn('Wait with check_background_command (job_id "job3-zz9", wait_seconds up to 120) job_id: job3-zz9'), ["job3-zz9"]);
});

test("Download File: the file's bytes as the Files tab has them", async () => {
    reset();
    sockets = [sock({ remoteDevice: row.deviceId }, (p) => (p.tool === "files_read"
        ? { text: "ok", file: p.args.path.endsWith(".png") ? { path: p.args.path, binary: true, image: true, mime: "image/png", data: Buffer.from("PNG").toString("base64") } : { path: p.args.path, binary: false, content: "héllo" } }
        : null))];
    const text = await tabs.fileDownload(user, S, "src/a.txt");
    assert.equal(text.name, "a.txt");
    assert.equal(text.buf.toString("utf8"), "héllo");
    assert.match(text.mime, /^text\/plain/);
    const pic = await tabs.fileDownload(user, S, "img/b.png");
    assert.equal(pic.mime, "image/png");
    assert.equal(pic.buf.toString(), "PNG");
    await assert.rejects(tabs.fileDownload(user, S, "../x"), (e) => e.status === 404);
});
