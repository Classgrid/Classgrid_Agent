// A picture the AI made is saved with every answer, a stopped or failed one too (owner, 2026-11-18: "AI-generated
// images get removed by themselves"). utils/made-pictures.js; ai-chat.controller.js streamAskAi uses it for the
// finished answer, keepUnfinishedAnswer (Stop, a failed answer, the busy answer, an error), and the final answer event.
// Run: node --test tests/made-pictures.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { withMadePictures } from "../src/utils/made-pictures.js";

const car = { prompt: "a red car", url: "https://cdn.classgrid.in/ai/a.png" };

test("a stopped or failed answer keeps its picture on top of what it said", () => {
    const saved = withMadePictures("Here is your car, and then the\n\n_(Stopped.)_", [car]);
    assert.equal(saved, "[IMAGE_GENERATION_COMPLETE: a red car | https://cdn.classgrid.in/ai/a.png]\n\nHere is your car, and then the\n\n_(Stopped.)_");
    assert.equal(withMadePictures("Failed to get an answer from the AI.", [car]).startsWith("[IMAGE_GENERATION_COMPLETE: a red car |"), true);
});

test("a link or marker the model wrote itself is taken out, so the picture shows once", () => {
    const out = withMadePictures(`Done! ![car](${car.url}) see ${car.url} [IMAGE_GENERATION_COMPLETE: x | ${car.url}]`, [car]);
    assert.equal(out.split(car.url).length - 1, 1);
});

test("no pictures: the text is left as it is", () => {
    assert.equal(withMadePictures("just words", []), "just words");
    assert.equal(withMadePictures(null, []), null);
    assert.equal(withMadePictures("", [car]), "[IMAGE_GENERATION_COMPLETE: a red car | https://cdn.classgrid.in/ai/a.png]");
});
