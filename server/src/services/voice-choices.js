// The voices a user can pick for answers read aloud (voice mode in the phone app; owner, 2026-11-14): Classgrid's own
// voice (ELEVENLABS_VOICE_ID) plus five Indian and five American voices from the ElevenLabs voice library, chosen by
// popularity for conversation. Only these ids are accepted from the app; anything else reads in Classgrid's voice.
import { classgridVoiceId } from "./elevenlabs.service.js";

export const VOICE_CHOICES = [
    { key: "classgrid", name: "Classgrid", accent: "Classgrid", gender: "female", description: "Classgrid's own voice" },
    // India (English with an Indian accent)
    { key: "anika", id: "90ipbRoKi4CpHXvKVtl0", name: "Anika", accent: "Indian", gender: "female", description: "Friendly and helpful" },
    { key: "ranbir", id: "2iAXJEMO2o0PqUHzvZwQ", name: "Ranbir", accent: "Indian", gender: "male", description: "Neutral and clear" },
    { key: "alisha", id: "ftDdhfYtmfGP0tFlBYA1", name: "Alisha", accent: "Indian", gender: "female", description: "Soft and engaging" },
    { key: "raju", id: "pzxut4zZz4GImZNlqQ3H", name: "Raju", accent: "Indian", gender: "male", description: "Natural and conversational" },
    { key: "tara", id: "P7vsEyTOpZ6YUTulin8m", name: "Tara", accent: "Indian", gender: "female", description: "Conversational and expressive" },
    // America
    { key: "mark", id: "UgBBYS2sOqTuMpoF3BR0", name: "Mark", accent: "American", gender: "male", description: "Relaxed and natural" },
    { key: "hope", id: "tnSpp4vdxKPjI9w0GnoV", name: "Hope", accent: "American", gender: "female", description: "Upbeat and clear" },
    { key: "zara", id: "jqcCZkN6Knx8BJ5TBdYR", name: "Zara", accent: "American", gender: "female", description: "Warm and real" },
    { key: "jessica", id: "g6xIsTj2HwM6VR4iXFCw", name: "Jessica", accent: "American", gender: "female", description: "Chatty and friendly" },
    { key: "adam", id: "s3TPKV1kjDlVtZbl4Ksh", name: "Adam", accent: "American", gender: "male", description: "Bright and engaging" },
];

/** The ElevenLabs voice id for a choice key (Classgrid's voice for an unknown key) */
export const voiceIdFor = (key) => VOICE_CHOICES.find((v) => v.key === key)?.id || classgridVoiceId();

/** The list the app shows (no ElevenLabs ids) */
export const publicVoiceChoices = () => VOICE_CHOICES.map(({ key, name, accent, gender, description }) => ({ key, name, accent, gender, description }));
