// A message of a chat is answered by the copy of the server that holds the chat's helpers (utils/helpers-copy.js,
// used by ai-chat.controller.js askGoesToHelpersCopy). Owner, 2026-11-21: five helpers working in the main copy, his
// next message answered by the rescue copy, which said "No helpers are working in this chat" and started five more.
// Checked here:
//   - helpers in the other copy: the message is passed on (both ways round)
//   - helpers here: answered here
//   - no helpers started lately: answered here
//   - the note names this copy but the helpers are gone (this copy restarted): answered here, never passed back and forth
// Run: node --test tests/helpers-copy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { passOnToHelpersCopy } from "../src/utils/helpers-copy.js";

test("helpers in the other copy: the message is passed on", () => {
    assert.equal(passOnToHelpersCopy({ hasBoardHere: false, markedAt: "main", here: "rescue" }), true); // (what happened that day)
    assert.equal(passOnToHelpersCopy({ hasBoardHere: false, markedAt: "rescue", here: "main" }), true);
});

test("helpers here: answered here", () => {
    assert.equal(passOnToHelpersCopy({ hasBoardHere: true, markedAt: "main", here: "main" }), false);
    assert.equal(passOnToHelpersCopy({ hasBoardHere: true, markedAt: "rescue", here: "main" }), false);
});

test("no helpers started lately: answered here", () => {
    assert.equal(passOnToHelpersCopy({ hasBoardHere: false, markedAt: null, here: "main" }), false);
    assert.equal(passOnToHelpersCopy({ hasBoardHere: false, markedAt: "", here: "rescue" }), false);
});

test("the note names this copy but the helpers are gone: answered here", () => {
    assert.equal(passOnToHelpersCopy({ hasBoardHere: false, markedAt: "main", here: "main" }), false);
});
