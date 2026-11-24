// The app's side of "a message sent while the AI works" (client/src/lib/followUpParts.ts; owner, 2026-11-24): which
// typed messages can join a running answer, how the ones that waited go out as one message, and how an answer's work
// is cut where the person's messages came in, so the chat draws work, message, work in the order it happened.
// The file is plain TypeScript with nothing from the app in it, so Node reads it as it is.
// Run: node --test tests/follow-up-parts.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { plainFollowUp, waitedMessages, runningCommandFor, partsAtUserNotes, isUserNoteStep, USER_NOTE_TOOL } = await import("../../client/src/lib/followUpParts.ts");

const tool = (id, name, args = {}) => ({ id, type: "tool", tool: name, args, status: "success", result: "ok" });
const said = (id, message, thoughtAt) => ({ id: `said-${id}`, type: "tool", tool: USER_NOTE_TOOL, args: { message, thoughtAt }, status: "success", result: "Read." });

test("only plain words join a running answer; files, pasted text, code comments and commands take the queue", () => {
    assert.equal(plainFollowUp({ text: "use port 5000" }), true);
    assert.equal(plainFollowUp({ text: "  use port 5000  ", files: 0, pasted: 0, codeNotes: 0 }), true);
    assert.equal(plainFollowUp({ text: "see this", files: 1 }), false);
    assert.equal(plainFollowUp({ text: "see this", pasted: 2 }), false);
    assert.equal(plainFollowUp({ text: "fix this line", codeNotes: 1 }), false);
    assert.equal(plainFollowUp({ text: "/remote" }), false);
    assert.equal(plainFollowUp({ text: "   " }), false);
    assert.equal(plainFollowUp({ text: "" }), false);
});

test("the messages that waited go out together and stay separate messages (never joined into one)", () => {
    // what the owner typed while an answer worked, 2026-11-24: four messages, shown as one bubble "gg gg g g"
    const waited = waitedMessages([{ id: "a", text: "gg" }, { id: "b", text: "gg" }, { id: "c", text: " g " }, { id: "d", text: "g" }]);
    assert.deepEqual(waited, { earlier: ["gg", "gg", "g"], last: "g" });
    assert.equal(waited.earlier.length + 1, 4, "four messages stay four");
    assert.deepEqual(waitedMessages([{ id: "a", text: "one" }]), { earlier: [], last: "one" });
    assert.equal(waitedMessages([]), null);
    assert.equal(waitedMessages([{ id: "a", text: "   " }]), null);
});

test("a command's box finds its running command, also with the words the server puts in front of it", () => {
    const shown = "Start-Sleep -Seconds 40; Write-Host \"hello\"";
    // (what the computer really gets for a PowerShell command: server local-runner.service.js withQuietProgress)
    const sent = "$ProgressPreference='SilentlyContinue'; " + shown;
    assert.equal(runningCommandFor([{ id: "call-1", command: sent }], shown), "call-1", "the owner's test: the box showed 'Waiting for output...'");
    assert.equal(runningCommandFor([{ id: "call-1", command: shown }], `  ${shown}  `), "call-1");
    // the exact command wins over one that only ends with it
    assert.equal(runningCommandFor([{ id: "a", command: `echo first; ${shown}` }, { id: "b", command: shown }], shown), "b");
    // another command, nothing running, an empty box
    assert.equal(runningCommandFor([{ id: "a", command: "npm install" }], shown), null);
    assert.equal(runningCommandFor([], shown), null);
    assert.equal(runningCommandFor([{ id: "a", command: sent }], ""), null);
});

test("an answer with no such message is one part with everything, drawn as before", () => {
    const steps = [tool("1", "search_web"), tool("2", "open_url")];
    const parts = partsAtUserNotes(steps, "thinking about it");
    assert.equal(parts.length, 1);
    assert.equal(parts[0].steps, steps);
    assert.equal(parts[0].thought, "thinking about it");
    assert.equal(parts[0].said, undefined);
    assert.deepEqual(partsAtUserNotes(undefined, undefined), [{ steps: [], thought: "" }]);
});

test("the work is cut where the person's messages came in: work, message, work", () => {
    const thought = "First I read the files. Then, with the new port, I change the config.";
    const at = "First I read the files.".length;
    const steps = [tool("1", "view_project_file"), tool("2", "search_project"), said("m1", "use port 5000, not 3000", at), tool("3", "edit_project_file")];
    const parts = partsAtUserNotes(steps, thought);
    assert.equal(parts.length, 2);
    assert.deepEqual(parts[0].steps.map((s) => s.id), ["1", "2"]);
    assert.equal(parts[0].said, "use port 5000, not 3000");
    assert.equal(parts[0].saidId, "said-m1");
    assert.equal(parts[0].thought, "First I read the files.");
    assert.deepEqual(parts[1].steps.map((s) => s.id), ["3"]);
    assert.equal(parts[1].thought, " Then, with the new port, I change the config.");
    assert.equal(parts[1].said, undefined);
    assert.ok(isUserNoteStep(steps[2]) && !isUserNoteStep(steps[0]));
});

test("several messages, one right after another, and one at the very start or end", () => {
    const steps = [said("a", "first", 0), tool("1", "search_web"), said("b", "second", 5), said("c", "third", 5), tool("2", "open_url"), said("d", "last", 99)];
    const parts = partsAtUserNotes(steps, "0123456789");
    assert.deepEqual(parts.map((p) => p.said), ["first", "second", "third", "last", undefined]);
    assert.deepEqual(parts.map((p) => p.steps.map((s) => s.id)), [[], ["1"], [], ["2"], []]);
    assert.deepEqual(parts.map((p) => p.thought), ["", "01234", "", "56789", ""], "the thinking is cut once, never shown twice, and a place past its end is its end");
    assert.equal(parts.map((p) => p.thought).join(""), "0123456789");
});

test("a message saved without its place in the thinking keeps all the thinking in front of it", () => {
    const parts = partsAtUserNotes([tool("1", "search_web"), said("a", "hello", undefined), tool("2", "open_url")], "all of it");
    assert.equal(parts[0].thought, "all of it");
    assert.equal(parts[1].thought, "");
    // while the thinking is still arriving (shorter than the place the server gave): what there is stays in front
    const live = partsAtUserNotes([said("a", "hello", 50)], "so far");
    assert.deepEqual(live.map((p) => p.thought), ["so far", ""]);
});
