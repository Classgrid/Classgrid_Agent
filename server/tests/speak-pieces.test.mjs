// Read aloud sentence by sentence (services/speak-pieces.service.js). Run: node --test tests/speak-pieces.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { speakPieces, streamAudioFor } from "../src/services/speak-pieces.service.js";

test("a phone that asks for mp3 gets compressed pieces, every other phone the raw sound it already plays", () => {
    assert.deepEqual(streamAudioFor("mp3"), { format: "mp3_24000_48", sampleRate: 24000, encoding: "mp3" });
    assert.deepEqual(streamAudioFor(" MP3 "), { format: "mp3_24000_48", sampleRate: 24000, encoding: "mp3" });
    for (const asked of [undefined, null, "", "pcm", "opus", 7, {}]) {
        assert.deepEqual(streamAudioFor(asked), { format: "pcm_24000", sampleRate: 24000, encoding: "pcm" });
    }
});

test("nothing to read gives no pieces", () => {
    assert.deepEqual(speakPieces(""), []);
    assert.deepEqual(speakPieces("   \n  "), []);
    assert.deepEqual(speakPieces(null), []);
});

test("a short answer is one piece", () => {
    assert.deepEqual(speakPieces("Hello, Nikhil!"), ["Hello, Nikhil!"]);
});

test("the first piece is the first sentence, so the voice starts soon", () => {
    const pieces = speakPieces("Both pictures look lovely. The first is a photorealistic grey kitten batting a blue ball of yarn. Would you like another style?");
    assert.equal(pieces[0], "Both pictures look lovely.");
    assert.equal(pieces.join(" "), "Both pictures look lovely. The first is a photorealistic grey kitten batting a blue ball of yarn. Would you like another style?");
});

test("a long first sentence is cut at a comma, never past 140 characters", () => {
    const long = "Photosynthesis is the process by which green plants, algae and some bacteria turn light energy, usually from the sun, into chemical energy stored in glucose, using water and carbon dioxide and giving off oxygen as a by-product.";
    const pieces = speakPieces(long);
    assert.ok(pieces.length >= 2);
    assert.ok(pieces[0].length <= 140, `first piece is ${pieces[0].length} long`);
    assert.ok(/[,;:]$/.test(pieces[0]), `first piece ends "${pieces[0].slice(-12)}"`);
    assert.equal(pieces.join(" "), long);
});

test("no words are lost or reordered, and no piece is longer than 320 characters", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i + 1} has a few words in it, and a comma too.`).join(" ") +
        "\n\nA new paragraph\nA line with no full stop\nक्या हाल है। सब ठीक है।";
    const pieces = speakPieces(text);
    assert.equal(pieces.join(" ").replace(/\s+/g, " "), text.replace(/\s+/g, " "));
    for (const p of pieces) assert.ok(p.length <= 320, `a piece is ${p.length} long`);
});

test("short lines after the start are joined, so a list is not one request a line", () => {
    const pieces = speakPieces("Here is the list. First item. Red. Green. Blue. Yellow. Pink. Black. White.");
    assert.equal(pieces[0], "Here is the list.");
    assert.ok(pieces.length <= 3, `${pieces.length} pieces`);
});

test("one very long word-run with no commas is still cut", () => {
    const pieces = speakPieces("word ".repeat(200).trim() + ".");
    assert.ok(pieces.length >= 3);
    for (const p of pieces) assert.ok(p.length <= 320);
});
