// Voice mode: the AI speaks of itself in the gender of the voice that reads its words (owner, 2026-11-23: in Marathi a
// male voice said "करते" where a man says "करतो"). services/voice-choices.js speakerGenderNote writes the line for
// the AI's prompt from the picked voice.
// Run: node --experimental-test-module-mocks --test tests/voice-gender.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../src/services/elevenlabs.service.js", { namedExports: { classgridVoiceId: () => "classgrid-voice-id" } });
const { VOICE_CHOICES, speakerGenderNote, voiceIdFor, publicVoiceChoices } = await import("../src/services/voice-choices.js");

test("a man's voice: the AI speaks of itself as a man", () => {
    for (const key of ["ranbir", "raju", "mark", "adam"]) {
        const note = speakerGenderNote(key);
        assert.match(note, /a man's voice/, key);
        assert.match(note, /speak of yourself as a man: in Marathi "मी करतो", "मी सांगतो", never "मी करते"/, key);
        assert.match(note, /in Hindi "मैं करता हूँ", "मैं बताता हूँ", never "मैं करती हूँ"/, key);
    }
    assert.match(speakerGenderNote("ranbir"), /\(Ranbir\)/);
});

test("a woman's voice: the AI speaks of itself as a woman", () => {
    for (const key of ["classgrid", "anika", "alisha", "tara", "hope", "zara", "jessica"]) {
        const note = speakerGenderNote(key);
        assert.match(note, /a woman's voice/, key);
        assert.match(note, /speak of yourself as a woman: in Marathi "मी करते", "मी सांगते", never "मी करतो"/, key);
        assert.match(note, /in Hindi "मैं करती हूँ", "मैं बताती हूँ", never "मैं करता हूँ"/, key);
    }
});

test("an unknown or missing voice reads in Classgrid's voice, so it gets that voice's note", () => {
    assert.equal(speakerGenderNote("no-such-voice"), speakerGenderNote("classgrid"));
    assert.equal(speakerGenderNote(""), speakerGenderNote("classgrid"));
    assert.equal(voiceIdFor("no-such-voice"), "classgrid-voice-id");
});

test("every voice says whether it is a man's or a woman's, and the two cloned voices are no longer in the list", () => {
    for (const v of VOICE_CHOICES) assert.ok(["male", "female"].includes(v.gender), v.key);
    // (owner, 2026-11-24: "remove Pratik and my voice". A phone that still has one picked reads in Classgrid's voice)
    const shown = publicVoiceChoices();
    for (const gone of ["nikhil", "pratik"]) {
        assert.equal(shown.some((v) => v.key === gone), false, gone);
        assert.equal(voiceIdFor(gone), "classgrid-voice-id");
        assert.equal(speakerGenderNote(gone), speakerGenderNote("classgrid"));
    }
    assert.deepEqual(shown.map((v) => v.key), ["classgrid", "anika", "ranbir", "alisha", "raju", "tara", "mark", "hope", "zara", "jessica", "adam"]);
    // (the app is never sent an ElevenLabs id)
    for (const v of shown) assert.equal("id" in v, false);
});
