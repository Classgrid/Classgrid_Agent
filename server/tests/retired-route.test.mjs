// The old product's addresses that reached an AI model with no plan check, no limit and no charge are closed
// (utils/retired-route.js; owner, 2026-11-21: "fix it right now"). Checked here:
//   - the stand-in handler answers 410 Gone and never passes the request on to the old handler
//   - each of the four addresses has it in front of its old handler, right after the sign-in check
// Run: node --test tests/retired-route.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { retiredAiRoute } from "../src/utils/retired-route.js";

test("a retired address answers 410 and goes no further", () => {
    let status = 0, body = null, passedOn = false;
    const res = { status(code) { status = code; return this; }, json(b) { body = b; return this; } };
    retiredAiRoute({}, res, () => { passedOn = true; });
    assert.equal(status, 410);
    assert.equal(body.code, "gone");
    assert.equal(passedOn, false);
});

test("the four old addresses are closed, behind the sign-in check", () => {
    const read = (f) => fs.readFileSync(new URL(`../src/routes/${f}`, import.meta.url), "utf8");
    const chat = read("chat.routes.js"), classroom = read("classroom.routes.js"), ai = read("ai.routes.js");
    assert.match(chat, /router\.post\('\/stream', isAuthenticated, retiredAiRoute,/);
    assert.match(chat, /router\.post\('\/', isAuthenticated, retiredAiRoute,/);
    assert.match(classroom, /router\.post\("\/hf-summarize", isAuthenticated, retiredAiRoute,/);
    assert.match(ai, /router\.post\("\/syllabus-chat", isAuthenticated, retiredAiRoute,/);
});
