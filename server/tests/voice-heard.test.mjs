// What a voice turn takes as spoken words (services/voice-heard.js): the results the speech-to-text services gave for
// real test sound on 2026-11-16 (speech, bus noise, a crowd, silence)
import { test } from "node:test";
import assert from "node:assert/strict";
import { spokenWords, withoutSoundTags } from "../src/services/voice-heard.js";

test("speech stays as it was heard", () => {
    assert.equal(spokenWords("Hello. Hello. Can you hear me?", "elevenlabs"), "Hello. Hello. Can you hear me?");
    assert.equal(spokenWords("Yes.", "elevenlabs"), "Yes.");
    assert.equal(spokenWords("मुझे मौसम बताओ", "elevenlabs"), "मुझे मौसम बताओ");
});

test("sound with no words is nothing said: tags in any language, punctuation, empty", () => {
    for (const heard of ["[static noise]", "[laughs]", "[लगातार शोर की आवाज़]", "(music)", "[noise] [laughs]", "...", "", null, " . "]) {
        assert.equal(spokenWords(heard, "elevenlabs"), "", String(heard));
    }
});

test("a tag inside speech is taken out, the words stay", () => {
    assert.equal(spokenWords("Hello [background noise] can you hear me (laughs)", "elevenlabs"), "Hello can you hear me");
    assert.equal(withoutSoundTags("[music] What is the capital of France?"), "What is the capital of France?");
});

test("what Whisper invents for silence is nothing said, but only when Whisper heard it", () => {
    assert.equal(spokenWords("Thank you.", "cloudflare"), "");
    assert.equal(spokenWords("Thanks for watching!", "cloudflare"), "");
    assert.equal(spokenWords("Thank you.", "elevenlabs"), "Thank you.");
    assert.equal(spokenWords("Thank you for the answer.", "cloudflare"), "Thank you for the answer.");
});
