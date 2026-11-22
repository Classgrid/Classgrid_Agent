// A background job belongs to the app that started it (utils/runner-job-reply.js). Found 2026-11-22: a job started
// from the editor extension finished, the woken chat's check went to the desktop app, and the AI was told
// "Error: no background command job2-w45u (the desktop app may have been restarted)." though the job was there.
import test from "node:test";
import assert from "node:assert/strict";
import { noSuchJobHere, betterJobReply, JOB_TOOLS } from "../src/utils/runner-job-reply.js";

const NOT_MINE_CHECK = { text: "Error: no background command job2-w45u (the desktop app may have been restarted)." };
const NOT_MINE = { text: "Error: no background command job2-w45u." };
const FOUND = { text: "gh run watch 1 --exit-status\nFinished with exit code 0, started 81s ago. Last output:\nok" };

test("an app that doesn't have the job says so for the three job steps", () => {
    for (const tool of JOB_TOOLS) {
        assert.equal(noSuchJobHere(tool, NOT_MINE_CHECK), true, tool);
        assert.equal(noSuchJobHere(tool, NOT_MINE), true, tool);
    }
});

test("an answer about a job the app does have is not 'not mine'", () => {
    assert.equal(noSuchJobHere("check_background_command", FOUND), false);
    assert.equal(noSuchJobHere("stop_background_command", { text: "Stopped job2-w45u." }), false);
    assert.equal(noSuchJobHere("send_background_input", { text: "Error: job2-w45u has already finished (exit code 0)." }), false);
});

test("other steps are never treated as a job step, whatever their text", () => {
    assert.equal(noSuchJobHere("execute_terminal_command", NOT_MINE), false);
    assert.equal(noSuchJobHere("view_project_file", NOT_MINE_CHECK), false);
});

test("no answer, or an answer with no text, is not 'not mine'", () => {
    assert.equal(noSuchJobHere("check_background_command", null), false);
    assert.equal(noSuchJobHere("check_background_command", {}), false);
});

test("the other app's answer is used when it has the job", () => {
    assert.equal(betterJobReply("check_background_command", NOT_MINE_CHECK, FOUND), FOUND);
    const finished = { text: "Error: job2-w45u has already finished (exit code 0)." };
    assert.equal(betterJobReply("send_background_input", NOT_MINE, finished), finished);
});

test("the first answer stands when no other app has the job, answers, or is there", () => {
    assert.equal(betterJobReply("check_background_command", NOT_MINE_CHECK, NOT_MINE_CHECK), NOT_MINE_CHECK);
    assert.equal(betterJobReply("check_background_command", NOT_MINE_CHECK, null), NOT_MINE_CHECK);
    const late = { text: "Error: the Classgrid desktop app didn't answer in time (operation has timed out). Ask the user to check the app is open." };
    assert.equal(betterJobReply("check_background_command", NOT_MINE_CHECK, late), NOT_MINE_CHECK);
});
