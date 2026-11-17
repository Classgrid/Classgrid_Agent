// Pictures in every shape and size the image maker takes (owner, 2026-11-17: "it must support all sizes"; every
// picture used to be a 1K square). Checked here:
//   - the shape and size asked for are passed on only when they are ones the image API takes (read from the API
//     itself that day); anything else becomes the default (a square, 1K; "auto" for an edit)
//   - the two picture tools offer the model exactly those shapes and sizes
// Run: node --test tests/image-shapes.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { IMAGE_SHAPES, IMAGE_SIZES, imageShape, imageSize } from "../src/services/elevenlabs.service.js";

test("the shapes and sizes the image API takes", () => {
    assert.deepEqual([...IMAGE_SHAPES].sort(), ["1:1", "1:2", "1:3", "16:9", "2:1", "2:3", "21:9", "3:1", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "auto"].sort());
    assert.deepEqual(IMAGE_SIZES, ["1K", "2K", "4K"]);
});

test("a shape is passed on only when the image API takes it", () => {
    for (const s of IMAGE_SHAPES) assert.equal(imageShape(s), s);
    assert.equal(imageShape("16x9"), "16:9");
    assert.equal(imageShape(" 9 : 16 "), "9:16");
    assert.equal(imageShape("2/3"), "2:3");
    assert.equal(imageShape("AUTO"), "auto");
    assert.equal(imageShape("A4"), "1:1", "a paper size is not a shape the API knows: the model picks 2:3 for it");
    assert.equal(imageShape("7:5"), "1:1");
    assert.equal(imageShape(""), "1:1");
    assert.equal(imageShape(undefined), "1:1");
    assert.equal(imageShape(null, "auto"), "auto", "an edit with no shape named keeps the given picture's shape");
    assert.equal(imageShape("nonsense", "auto"), "auto");
    assert.equal(imageShape({}), "1:1");
});

test("a size is passed on only when the image API takes it", () => {
    assert.equal(imageSize("1K"), "1K");
    assert.equal(imageSize("2k"), "2K");
    assert.equal(imageSize(" 4K "), "4K");
    assert.equal(imageSize("8K"), "1K");
    assert.equal(imageSize(""), "1K");
    assert.equal(imageSize(undefined), "1K");
    assert.equal(imageSize(4096), "1K");
});

test("the two picture tools offer the model exactly those shapes and sizes", () => {
    const tools = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "mcp", "tools.js"), "utf8");
    const shapeLists = [...tools.matchAll(/aspect_ratio: \{ type: 'string', enum: \[([^\]]+)\]/g)].map((m) => m[1].split(",").map((v) => v.trim().replace(/'/g, "")));
    const sizeLists = [...tools.matchAll(/resolution: \{ type: 'string', enum: \[([^\]]+)\]/g)].map((m) => m[1].split(",").map((v) => v.trim().replace(/'/g, "")));
    assert.equal(shapeLists.length, 2, "generate_image and edit_image");
    assert.equal(sizeLists.length, 2);
    // ("auto" is not offered by name: leaving the shape out of an edit means it)
    for (const list of shapeLists) assert.deepEqual([...list].sort(), IMAGE_SHAPES.filter((s) => s !== "auto").sort());
    for (const list of sizeLists) assert.deepEqual(list, IMAGE_SIZES);
});
