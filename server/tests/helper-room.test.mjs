// When fewer helpers start than were asked for, the main AI is told which were left out and why (owner's test on a
// Free account, 2026-11-24: three asked, the plan allows one at a time, the tool said only "Started 1 helper(s)" and
// the AI wrote "Helpers 2 and 3 didn't launch, so I'll start them again in a moment"). utils/helper-room.js.
// Run: node --test tests/helper-room.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { notStartedNote } = await import("../src/utils/helper-room.js");

const ASKED = [{ task: "Map the pages and routes", title: "Map pages and routes" }, { task: "Map the AI and search code under lib\nwith every file", title: "" }, { task: "Map the scripts folder", title: "Map scripts and Sanity" }];

test("every helper started: nothing is added", () => {
    assert.equal(notStartedNote({ asked: ASKED, started: 3, maxHelpers: 5, planName: "Max" }), "");
    assert.equal(notStartedNote({ asked: [], started: 0 }), "");
});

test("the Free plan, 1 helper at a time: the two left out are named, with the reason and what to do", () => {
    const note = notStartedNote({ asked: ASKED, started: 1, maxHelpers: 1, planName: "Free" });
    assert.ok(note.startsWith("\n\nNOT started (2 of the 3 you asked for), because the Free plan allows 1 helper working at the same time in a chat:\n2. Map the AI and search code under lib with every file\n3. Map scripts and Sanity\n"));
    assert.match(note, /Do not call run_project_helpers for them again now: it is refused while the helper is working\./);
    assert.match(note, /Tell the user plainly that the Free plan allows 1 helper working at the same time in a chat, so these tasks have not started\./);
    assert.match(note, /Then either start them when a helper finishes \(its report reaches you by itself\), or do that work yourself\.$/);
});

test("the Pro plan, 3 at a time, one left out", () => {
    const note = notStartedNote({ asked: [...ASKED, { task: "Fourth job" }], started: 3, maxHelpers: 3, planName: "Pro" });
    assert.match(note, /^\n\nNOT started \(1 of the 4 you asked for\), because the Pro plan allows 3 helpers working at the same time in a chat:\n4\. Fourth job\n/);
    assert.match(note, /it is refused while these helpers are working\./);
    assert.match(note, /so this task has not started\. Then either start it when a helper finishes/);
});

test("the most any chat has (5), or plans off: the reason is the chat's own limit, no plan is named", () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => ({ task: `Job ${n}` }));
    assert.match(notStartedNote({ asked: six, started: 5, maxHelpers: 5, planName: "Max" }), /because at most 5 helpers can work at the same time in a chat:\n6\. Job 6\n/);
    assert.match(notStartedNote({ asked: ASKED, started: 2, maxHelpers: 5, planName: "" }), /because at most 5 helpers can work at the same time in a chat:\n3\. Map scripts and Sanity\n/);
});
