// A long tool says where it is, stage by stage (utils/tool-stages.js), and make_video is the first to do it (owner,
// 2026-11-27: "you show 'video making' something; remove that, add every step, show it really").
// Checked here, with no sandbox, no Chromium, no ffmpeg and no storage:
//   1. the stage as it is sent and saved: only its known fields, a later report with the same key takes the earlier
//      one's place, the list has an end
//   2. whose step a stage goes to: the step running now, also from a callback that runs later and elsewhere; a helper
//      started inside a step of the main AI never reports into that step
//   3. the recorder itself (RENDER_JS, run here with stand-ins for Chromium and ffmpeg) prints its marks in order,
//      and the marks are read whole however its output is cut into pieces
//   4. a whole video: the stages the chat gets, in order, and the list saved with the step; a recording that fails
//      shows the stage it failed in, with the reason
//   5. renderVideo itself, with a stand-in for the SSH connection to the sandbox: the recorder's output becomes
//      stages while it still runs, and its marks never end up in an error's words
// A real video (the sandbox's Chromium and ffmpeg, the uploads) can only be seen on a real run.
// Run: node --experimental-test-module-mocks --test tests/tool-stages.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// The sandbox host, as renderVideo talks to it (node-ssh): what the recorder prints, piece by piece, and what it leaves
let sandbox = {};
const sandboxSaid = [];
class FakeSSH {
    async connect() { if (sandbox.unreachable) throw new Error(sandbox.unreachable); }
    async execCommand(command, options = {}) {
        sandboxSaid.push(command.split(" ").slice(0, 2).join(" "));
        if (command.startsWith("docker run")) {
            for (const piece of sandbox.output || []) {
                options.onStdout?.(Buffer.from(piece));
                sandbox.seen?.();
            }
            return { stdout: (sandbox.output || []).join(""), stderr: sandbox.stderr || "" };
        }
        if (command.includes("result.json")) return { stdout: sandbox.result ?? "", stderr: "" };
        return { stdout: "", stderr: "" };
    }
    async getFile(local, remote) {
        if (remote.endsWith("out.mp4")) fs.writeFileSync(local, Buffer.alloc(3 * 1048576 + 200000));
        else if ((sandbox.stills ?? 3) > Number(remote.match(/check_(\d)\.jpg$/)?.[1] ?? 9)) fs.writeFileSync(local, "jpg");
        else throw new Error("No such file");
    }
    dispose() {}
}
mock.module("node-ssh", { namedExports: { NodeSSH: FakeSSH } });

const { cleanStage, putStage, withStages, reportStage, stageReporter, stageRun, stepIds, MAX_STAGES } = await import("../src/utils/tool-stages.js");
const { VIDEO_STAGES, RENDER_JS, readMarks, withoutMarks, followMark, renderVideo } = await import("../src/services/video-render.service.js");

// ── 1. the stage ─────────────────────────────────────────────────────────────────────────────────────────────

test("a stage keeps its known fields only, as one line each", () => {
    assert.deepEqual(
        cleanStage({ key: "record", text: "Recording  the\nframes", state: "running", note: "frame 300 of 1350", html: "<b>never sent</b>", secret: 1 }),
        { key: "record", text: "Recording the frames", state: "running", note: "frame 300 of 1350" },
    );
    assert.deepEqual(cleanStage({ key: "still-0", text: "Saved a still frame", state: "done", image: "https://cdn.classgrid.in/ai-generated/1-frame-2s.jpg" }),
        { key: "still-0", text: "Saved a still frame", state: "done", image: "https://cdn.classgrid.in/ai-generated/1-frame-2s.jpg" });
});

test("what is not a stage is not sent: no key, no words, a state nobody knows, a picture that is not an https link", () => {
    assert.equal(cleanStage(null), null);
    assert.equal(cleanStage({ text: "Recording the frames", state: "running" }), null);
    assert.equal(cleanStage({ key: "record", state: "running" }), null);
    assert.equal(cleanStage({ key: "record", text: "Recording the frames", state: "paused" }), null);
    assert.equal("image" in cleanStage({ key: "a", text: "A", state: "done", image: "javascript:alert(1)" }), false);
    assert.equal("image" in cleanStage({ key: "a", text: "A", state: "done", image: "http://plain.example/a.jpg" }), false);
});

test("a long reason is cut, so a failed stage never saves a whole stack with the answer", () => {
    const kept = cleanStage({ key: "record", text: "Couldn't record the frames", state: "failed", note: "x".repeat(5000) });
    assert.ok(kept.note.length <= 300);
    assert.ok(kept.note.endsWith("…"));
});

test("a later report of the same stage takes its place; a new stage goes to the end", () => {
    const list = [];
    putStage(list, { key: "prepare", text: "Preparing the page", state: "running" });
    putStage(list, { key: "prepare", text: "Prepared the page", state: "done" });
    putStage(list, { key: "record", text: "Recording the frames", state: "running", note: "frame 0 of 90" });
    putStage(list, { key: "record", text: "Recording the frames", state: "running", note: "frame 60 of 90" });
    assert.deepEqual(list, [
        { key: "prepare", text: "Prepared the page", state: "done" },
        { key: "record", text: "Recording the frames", state: "running", note: "frame 60 of 90" },
    ]);
});

test("a step keeps a limited number of stages; a stage it already has can still change", () => {
    const list = [];
    for (let i = 0; i < MAX_STAGES + 5; i++) putStage(list, { key: `k${i}`, text: "Working", state: "running" });
    assert.equal(list.length, MAX_STAGES);
    assert.equal(putStage(list, { key: "one-more", text: "Working", state: "running" }), null);
    assert.deepEqual(putStage(list, { key: "k0", text: "Worked", state: "done" }), { key: "k0", text: "Worked", state: "done" });
    assert.equal(list[0].state, "done");
});

// ── 2. whose step ────────────────────────────────────────────────────────────────────────────────────────────

test("a stage goes to the step that is running, and to nobody when no step shows stages", async () => {
    const got = [];
    reportStage({ key: "a", text: "A", state: "running" }); // (outside any step: nothing happens, nothing throws)
    await withStages((s) => got.push(s.key), async () => {
        await new Promise((r) => setTimeout(r, 1));
        reportStage({ key: "inside", text: "A", state: "running" });
    });
    assert.deepEqual(got, ["inside"]);
});

test("two steps running at once each get their own stages", async () => {
    const first = [], second = [];
    const work = (name, ms) => async () => { await new Promise((r) => setTimeout(r, ms)); reportStage({ key: name, text: "A", state: "done" }); };
    await Promise.all([withStages((s) => first.push(s.key), work("one", 5)), withStages((s) => second.push(s.key), work("two", 1))]);
    assert.deepEqual([first, second], [["one"], ["two"]]);
});

test("a reporter taken inside the step still reports from a callback that runs later, outside it", async () => {
    const got = [];
    let later;
    await withStages((s) => got.push(s.key), async () => { later = stageReporter(); });
    later({ key: "from-a-callback", text: "A", state: "running" });
    assert.deepEqual(got, ["from-a-callback"]);
});

test("a helper started inside a step of the main AI never reports into that step", async () => {
    const mainStep = [], helperStep = [];
    await withStages((s) => mainStep.push(s.key), async () => {
        // (ai-chat.controller.js: a helper is started under withStages(null), and each of its own steps under its own)
        await withStages(null, async () => {
            reportStage({ key: "lost", text: "A", state: "running" });
            await withStages((s) => helperStep.push(s.key), async () => reportStage({ key: "helpers-own", text: "A", state: "running" }));
        });
        reportStage({ key: "mains-own", text: "A", state: "running" });
    });
    assert.deepEqual([mainStep, helperStep], [["mains-own"], ["helpers-own"]]);
});

test("a reporter that throws never breaks the tool", async () => {
    await withStages(() => { throw new Error("the stream is gone"); }, async () => reportStage({ key: "a", text: "A", state: "running" }));
});

test("step ids are never the same twice, even for steps started in the same millisecond", () => {
    const next = stepIds();
    const ids = Array.from({ length: 200 }, next);
    assert.equal(new Set(ids).size, 200);
    assert.ok(ids.every((id) => /^\d{13,}$/.test(id)), "an id is still the time in milliseconds, as before");
});

// ── 3. the recorder's marks ──────────────────────────────────────────────────────────────────────────────────

// RENDER_JS as it runs in the sandbox, with stand-ins for what it loads: Chromium (playwright) and ffmpeg (spawn)
async function runRecorder(cfg, { slowFrames = false } = {}) {
    const written = {};
    let out = "";
    const realNow = Date.now;
    let clock = 1_000_000;
    const fakes = {
        fs: {
            readFileSync: () => JSON.stringify(cfg),
            writeFileSync: (p, data) => { written[p] = data; },
            existsSync: () => false,
        },
        child_process: {
            spawn: () => {
                let close;
                return {
                    stdin: { write: () => true, once: () => {}, end: () => close(0) },
                    stderr: { on: () => {} },
                    on: (name, fn) => { if (name === "close") close = fn; },
                };
            },
        },
        playwright: {
            chromium: {
                launch: async () => ({
                    newPage: async () => ({
                        on: () => {},
                        addInitScript: async () => {},
                        goto: async () => {},
                        evaluate: async () => {},
                        screenshot: async () => {
                            if (slowFrames) clock += 700; // (each frame takes 0.7 s to draw)
                            return Buffer.from("jpg");
                        },
                    }),
                    close: async () => {},
                }),
            },
        },
    };
    Date.now = () => clock;
    try {
        const run = new Function("require", "process", RENDER_JS);
        run((name) => fakes[name], { stdout: { write: (s) => { out += s; } } });
        // (the script's own async work: wait until it has written its result)
        for (let i = 0; i < 2000 && !written["/work/result.json"]; i++) await new Promise((r) => setImmediate(r));
    } finally {
        Date.now = realNow;
    }
    return { out, result: JSON.parse(written["/work/result.json"] || "null"), written };
}

test("the recorder says: opening, the frame it is at while it records, then joining", async () => {
    const { out, result } = await runRecorder({ seconds: 2, fps: 30, width: 1280, height: 720, checks: [0.4, 1, 1.7] }, { slowFrames: true });
    assert.equal(result.ok, true);
    assert.equal(result.frames, 60);
    const { marks, rest } = readMarks(out);
    assert.equal(rest, "");
    assert.deepEqual(marks[0], { at: "open" });
    assert.deepEqual(marks[1], { at: "record", frame: 0, total: 60 });
    assert.deepEqual(marks.at(-1), { at: "join", total: 60 });
    const during = marks.slice(2, -1);
    assert.ok(during.length >= 10, "a slow recording reports its frame as it goes");
    assert.ok(during.length < 60, "but not every frame: one line every two seconds");
    assert.ok(during.every((m, i) => m.at === "record" && m.total === 60 && m.frame > (during[i - 1]?.frame ?? 0) && m.frame <= 60));
});

test("a quick recording prints no frame lines in between (nothing to flood the chat with)", async () => {
    const { out } = await runRecorder({ seconds: 1, fps: 30, width: 640, height: 360, checks: [0.2, 0.5, 0.85] });
    assert.deepEqual(readMarks(out).marks, [{ at: "open" }, { at: "record", frame: 0, total: 30 }, { at: "join", total: 30 }]);
});

test("the still frames are still written by the recorder, one per check time", async () => {
    const { written } = await runRecorder({ seconds: 1, fps: 30, width: 640, height: 360, checks: [0.2, 0.5, 0.85] });
    assert.deepEqual(Object.keys(written).filter((p) => p.includes("check_")).sort(), ["/work/check_0.jpg", "/work/check_1.jpg", "/work/check_2.jpg"]);
});

test("marks are read whole however the output is cut into pieces, and nothing else in the output is taken for one", () => {
    const text = `@cg-stage {"at":"open"}\nDocker says something\n@cg-stage {"at":"record","frame":0,"total":90}\n@cg-stage {"at":"record","frame":45,"total":90}\n@cg-stage not json\n@cg-stage {"at":"join","total":90}\n`;
    for (const size of [1, 7, 23, 1000]) {
        const marks = [];
        let unread = "";
        for (let i = 0; i < text.length; i += size) {
            const got = readMarks(unread + text.slice(i, i + size));
            unread = got.rest;
            marks.push(...got.marks);
        }
        assert.deepEqual(marks.map((m) => m.at), ["open", "record", "record", "join"], `pieces of ${size}`);
    }
    assert.equal(withoutMarks(text), "Docker says something");
});

// ── 4. a whole video ─────────────────────────────────────────────────────────────────────────────────────────

// The step as ai-chat.controller.js showStep keeps it, and the events it sends
function shownStep() {
    const step = { id: "1790000000000", type: "tool", tool: "make_video", status: "loading" };
    const events = [];
    const report = (stage) => {
        if (!Array.isArray(step.stages)) step.stages = [];
        const kept = putStage(step.stages, stage);
        if (kept) events.push({ type: "tool_stage", tool: step.tool, call: step.id, stage: kept });
    };
    return { step, events, report };
}

// What the make_video handler does around the recording (ai-chat.controller.js), with the storage left out
async function makeVideo(stages, { marks, stills = [2, 5, 8.5], libraryFails = false, recordingFails = "" }) {
    try {
        stages.start("prepare");
        for (const m of marks) followMark(stages, m);
        if (recordingFails) throw new Error(recordingFails);
        stages.start("fetch");
        stages.done({ note: "4.2 MB" });
        stages.start("upload");
        stages.done();
        for (const [i, at] of stills.entries()) {
            stages.start(`still-${i}`, { note: `at ${at}s` });
            stages.done({ note: `at ${at}s`, image: `https://cdn.classgrid.in/ai-generated/17900-frame-${at}s.jpg` });
        }
        try {
            stages.start("library");
            if (libraryFails) throw new Error("the Library is not reachable");
            stages.done();
        } catch (e) { stages.fail(e.message); }
        return "SUCCESS";
    } catch (e) {
        stages.fail(e.message);
        return `FAILED to make the video: ${e.message}`;
    }
}

const MARKS = [{ at: "open" }, { at: "record", frame: 0, total: 300 }, { at: "record", frame: 140, total: 300 }, { at: "record", frame: 290, total: 300 }, { at: "join", total: 300 }];

test("a video: every stage reaches the chat as it happens, in order, each naming its step", async () => {
    const { step, events, report } = shownStep();
    let result;
    await withStages(report, async () => { result = await makeVideo(stageRun(VIDEO_STAGES), { marks: MARKS }); });
    assert.equal(result, "SUCCESS");
    assert.ok(events.every((e) => e.type === "tool_stage" && e.tool === "make_video" && e.call === step.id));
    assert.deepEqual(events.map((e) => `${e.stage.key} ${e.stage.state}${e.stage.note ? ` (${e.stage.note})` : ""}`), [
        "prepare running", "prepare done",
        "open running", "open done",
        "record running (frame 0 of 300)", "record running (frame 140 of 300)", "record running (frame 290 of 300)", "record done (300 frames)",
        "join running", "join done",
        "fetch running", "fetch done (4.2 MB)",
        "upload running", "upload done",
        "still-0 running (at 2s)", "still-0 done (at 2s)",
        "still-1 running (at 5s)", "still-1 done (at 5s)",
        "still-2 running (at 8.5s)", "still-2 done (at 8.5s)",
        "library running", "library done",
    ]);
});

test("a video: what is saved with the step is one row per stage, all done, each still frame with its picture", async () => {
    const { step, report } = shownStep();
    await withStages(report, () => makeVideo(stageRun(VIDEO_STAGES), { marks: MARKS }));
    assert.deepEqual(step.stages, [
        { key: "prepare", text: "Prepared the page", state: "done" },
        { key: "open", text: "Opened the page", state: "done" },
        { key: "record", text: "Recorded the frames", state: "done", note: "300 frames" },
        { key: "join", text: "Joined the frames into a video", state: "done" },
        { key: "fetch", text: "Got the video", state: "done", note: "4.2 MB" },
        { key: "upload", text: "Uploaded the video", state: "done" },
        { key: "still-0", text: "Saved a still frame", state: "done", note: "at 2s", image: "https://cdn.classgrid.in/ai-generated/17900-frame-2s.jpg" },
        { key: "still-1", text: "Saved a still frame", state: "done", note: "at 5s", image: "https://cdn.classgrid.in/ai-generated/17900-frame-5s.jpg" },
        { key: "still-2", text: "Saved a still frame", state: "done", note: "at 8.5s", image: "https://cdn.classgrid.in/ai-generated/17900-frame-8.5s.jpg" },
        { key: "library", text: "Added the video to the Library", state: "done" },
    ]);
    // (saved as JSON with the answer and read back the same)
    assert.deepEqual(JSON.parse(JSON.stringify(step)).stages, step.stages);
});

test("a recording that fails: the stage it was in shows as failed with the real reason, the later stages never appear", async () => {
    const { step, report } = shownStep();
    const reason = "ffmpeg failed: Conversion failed!\nPage errors: Couldn't load https://fonts.example/a.woff2";
    let result;
    await withStages(report, async () => {
        result = await makeVideo(stageRun(VIDEO_STAGES), { marks: MARKS.slice(0, 3), recordingFails: reason });
    });
    assert.equal(result, `FAILED to make the video: ${reason}`, "what the model is told is the same as before");
    assert.deepEqual(step.stages, [
        { key: "prepare", text: "Prepared the page", state: "done" },
        { key: "open", text: "Opened the page", state: "done" },
        { key: "record", text: "Couldn't record the frames", state: "failed", note: "ffmpeg failed: Conversion failed! Page errors: Couldn't load https://fonts.example/a.woff2" },
    ]);
});

test("the sandbox cannot be reached: the first stage fails, with the reason", async () => {
    const { step, report } = shownStep();
    await withStages(report, () => makeVideo(stageRun(VIDEO_STAGES), { marks: [], recordingFails: "connect ETIMEDOUT 172.31.6.98:22" }));
    assert.deepEqual(step.stages, [{ key: "prepare", text: "Couldn't prepare the page", state: "failed", note: "connect ETIMEDOUT 172.31.6.98:22" }]);
});

test("the Library cannot take the video: that row fails, the video itself is made", async () => {
    const { step, report } = shownStep();
    let result;
    await withStages(report, async () => { result = await makeVideo(stageRun(VIDEO_STAGES), { marks: MARKS, libraryFails: true }); });
    assert.equal(result, "SUCCESS");
    assert.deepEqual(step.stages.at(-1), { key: "library", text: "Couldn't add the video to the Library", state: "failed", note: "the Library is not reachable" });
    assert.ok(step.stages.slice(0, -1).every((s) => s.state === "done"));
});

test("a recorder whose own marks never arrive still ends with every stage it really went through", async () => {
    const { step, report } = shownStep();
    await withStages(report, () => makeVideo(stageRun(VIDEO_STAGES), { marks: [], stills: [] }));
    assert.deepEqual(step.stages.map((s) => `${s.key} ${s.state}`), ["prepare done", "fetch done", "upload done", "library done"]);
});

test("every stage has its words for running, done and failed, in plain words with no trailing dots", () => {
    assert.deepEqual(Object.keys(VIDEO_STAGES), ["prepare", "open", "record", "join", "fetch", "upload", "still", "library"]);
    for (const [key, words] of Object.entries(VIDEO_STAGES)) {
        assert.deepEqual(Object.keys(words), ["running", "done", "failed"], key);
        for (const text of Object.values(words)) {
            assert.ok(text.length >= 8 && text.length <= 60, text);
            assert.ok(!/[.…]$/.test(text), text);
            assert.ok(/^[A-Z]/.test(text), text);
        }
    }
});

test("a stage with no words of its own is never reported with empty words", async () => {
    const { step, report } = shownStep();
    await withStages(report, async () => { stageRun(VIDEO_STAGES).start("something-else"); });
    assert.equal(step.stages, undefined);
});

// ── 5. renderVideo, with the sandbox stood in for ────────────────────────────────────────────────────────────

const collect = () => {
    const list = [], seen = [];
    const stages = stageRun(VIDEO_STAGES, (stage) => { putStage(list, stage); });
    return { list, seen, stages, look: () => seen.push(list.map((s) => `${s.key} ${s.state}${s.note ? ` (${s.note})` : ""}`).join(", ")) };
};
// (what the recorder prints, in the pieces the connection hands over: a line can be cut in the middle)
const OUTPUT = [
    '@cg-stage {"at":"open"}\n',
    '@cg-stage {"at":"record","frame":0,"total":300}\n@cg-stage {"at":"rec',
    'ord","frame":150,"total":300}\n',
    '@cg-stage {"at":"join","total":300}\n',
];

test("renderVideo: the recorder's output becomes stages while it still runs, then the video is brought over", async () => {
    const c = collect();
    sandbox = { output: OUTPUT, result: JSON.stringify({ ok: true, frames: 300, errors: [] }), seen: c.look };
    const video = await renderVideo({ html: "<!doctype html><html></html>", seconds: 10, fps: 30, width: 1280, height: 720 }, c.stages);
    // (what the chat's list said after each piece of output arrived: live, not at the end)
    assert.deepEqual(c.seen, [
        "prepare done, open running",
        "prepare done, open done, record running (frame 0 of 300)",
        "prepare done, open done, record running (frame 150 of 300)",
        "prepare done, open done, record done (300 frames), join running",
    ]);
    assert.deepEqual(c.list.map((s) => `${s.key} ${s.state}`), ["prepare done", "open done", "record done", "join done", "fetch done"]);
    assert.equal(c.list.at(-1).note, "3.2 MB");
    // (what make_video gets back is what it got before)
    assert.equal(video.mp4.length, 3 * 1048576 + 200000);
    assert.equal(video.frames, 300);
    assert.deepEqual(video.checks.map((k) => k.at), [2, 5, 8.5]);
    assert.deepEqual(video.cfg, { seconds: 10, fps: 30, width: 1280, height: 720, checks: [2, 5, 8.5] });
});

test("renderVideo with nobody showing stages works as before", async () => {
    sandbox = { output: OUTPUT, result: JSON.stringify({ ok: true, frames: 300, errors: ["Couldn't load https://x.example/a.png"] }) };
    const video = await renderVideo({ html: "<html></html>", seconds: 10 });
    assert.deepEqual(video.errors, ["Couldn't load https://x.example/a.png"]);
});

test("renderVideo: the recorder reports a failure: it throws the same words as before and leaves the stage for the caller to fail", async () => {
    const c = collect();
    sandbox = { output: OUTPUT.slice(0, 3), result: JSON.stringify({ ok: false, error: "Error: browser closed" }) };
    await assert.rejects(renderVideo({ html: "<html></html>", seconds: 10 }, c.stages), { message: "Error: browser closed" });
    assert.equal(c.stages.running, "record");
    c.stages.fail("Error: browser closed");
    assert.deepEqual(c.list.at(-1), { key: "record", text: "Couldn't record the frames", state: "failed", note: "Error: browser closed" });
});

test("renderVideo: the recorder stopped without a result: the reason is what it printed, never its marks", async () => {
    sandbox = { output: [...OUTPUT.slice(0, 2), "\nKilled\n"], result: "" };
    await assert.rejects(renderVideo({ html: "<html></html>", seconds: 10 }, collect().stages), { message: "The renderer stopped: Killed" });
    sandbox = { output: OUTPUT.slice(0, 1), stderr: "docker: Error response from daemon: no such image", result: "" };
    await assert.rejects(renderVideo({ html: "<html></html>", seconds: 10 }), { message: "The renderer stopped: docker: Error response from daemon: no such image" });
});

test("renderVideo: the sandbox cannot be reached: the first stage is the one left running", async () => {
    const c = collect();
    sandbox = { unreachable: "connect ETIMEDOUT" };
    await assert.rejects(renderVideo({ html: "<html></html>", seconds: 10 }, c.stages), { message: "connect ETIMEDOUT" });
    assert.equal(c.stages.running, "prepare");
});

test("renderVideo: an empty page is refused before any stage is shown", async () => {
    const c = collect();
    await assert.rejects(renderVideo({ html: "  ", seconds: 10 }, c.stages), /html is empty/);
    assert.deepEqual(c.list, []);
});
