// The voices a user can pick for answers read aloud (voice mode in the phone app; owner, 2026-11-14): Classgrid's own
// voice (ELEVENLABS_VOICE_ID) plus five Indian and five American voices from the ElevenLabs voice library, chosen by
// popularity for conversation, and Nikhil, the owner's own cloned voice in Classgrid's ElevenLabs workspace (owner,
// 2026-11-23: "this is my voice, add it to our mobile app"). Only these ids are accepted from the app; anything else
// reads in Classgrid's voice.
import { classgridVoiceId } from "./elevenlabs.service.js";

export const VOICE_CHOICES = [
    { key: "classgrid", name: "Classgrid", accent: "Classgrid", gender: "female", description: "Classgrid's own voice" },
    // India (English with an Indian accent)
    { key: "anika", id: "90ipbRoKi4CpHXvKVtl0", name: "Anika", accent: "Indian", gender: "female", description: "Friendly and helpful" },
    { key: "ranbir", id: "2iAXJEMO2o0PqUHzvZwQ", name: "Ranbir", accent: "Indian", gender: "male", description: "Neutral and clear" },
    { key: "alisha", id: "ftDdhfYtmfGP0tFlBYA1", name: "Alisha", accent: "Indian", gender: "female", description: "Soft and engaging" },
    { key: "raju", id: "pzxut4zZz4GImZNlqQ3H", name: "Raju", accent: "Indian", gender: "male", description: "Natural and conversational" },
    { key: "tara", id: "P7vsEyTOpZ6YUTulin8m", name: "Tara", accent: "Indian", gender: "female", description: "Conversational and expressive" },
    { key: "nikhil", id: "H9ipKj3VXe3Vi6aPCwm9", name: "Nikhil", accent: "Indian", gender: "male", description: "Classgrid's founder" },
    // (Pratik: a cloned voice in the same workspace, added at the owner's word the same evening)
    { key: "pratik", id: "82qFxihNEjOhstPIGYf1", name: "Pratik", accent: "Indian", gender: "male", description: "A young voice" },
    // America
    { key: "mark", id: "UgBBYS2sOqTuMpoF3BR0", name: "Mark", accent: "American", gender: "male", description: "Relaxed and natural" },
    { key: "hope", id: "tnSpp4vdxKPjI9w0GnoV", name: "Hope", accent: "American", gender: "female", description: "Upbeat and clear" },
    { key: "zara", id: "jqcCZkN6Knx8BJ5TBdYR", name: "Zara", accent: "American", gender: "female", description: "Warm and real" },
    { key: "jessica", id: "g6xIsTj2HwM6VR4iXFCw", name: "Jessica", accent: "American", gender: "female", description: "Chatty and friendly" },
    { key: "adam", id: "s3TPKV1kjDlVtZbl4Ksh", name: "Adam", accent: "American", gender: "male", description: "Bright and engaging" },
];

/** The ElevenLabs voice id for a choice key (Classgrid's voice for an unknown key) */
export const voiceIdFor = (key) => VOICE_CHOICES.find((v) => v.key === key)?.id || classgridVoiceId();

/**
 * For the AI's prompt in voice mode: whether the voice reading its words is a man's or a woman's, so it speaks of
 * itself in that gender (owner, 2026-11-23: in Marathi a male voice said "करते" where a man says "करतो"; the AI has
 * no gender, but Hindi, Marathi and other languages change the verb with the speaker's). An unknown key reads in
 * Classgrid's voice, so it gets that voice's note.
 */
export function speakerGenderNote(key) {
    const voice = VOICE_CHOICES.find((v) => v.key === key) || VOICE_CHOICES[0];
    const man = voice.gender === "male";
    return `The voice that reads your words out is a ${man ? "man's" : "woman's"} voice (${voice.name}). In a language whose words change with the speaker's gender (Hindi, Marathi, Gujarati, Punjabi, Urdu and others), always speak of yourself as a ${man ? "man" : "woman"}: `
        + (man
            ? "in Marathi \"मी करतो\", \"मी सांगतो\", never \"मी करते\"; in Hindi \"मैं करता हूँ\", \"मैं बताता हूँ\", never \"मैं करती हूँ\"."
            : "in Marathi \"मी करते\", \"मी सांगते\", never \"मी करतो\"; in Hindi \"मैं करती हूँ\", \"मैं बताती हूँ\", never \"मैं करता हूँ\".")
        + " This is only about how you speak of yourself: the user's own gender is not known from it.";
}

/** The list the app shows (no ElevenLabs ids) */
export const publicVoiceChoices = () => VOICE_CHOICES.map(({ key, name, accent, gender, description }) => ({ key, name, accent, gender, description }));
