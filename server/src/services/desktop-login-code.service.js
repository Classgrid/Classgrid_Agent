// The one-time sign-in codes that hand a login to the Classgrid desktop app or to an editor (Classgrid Code, the
// extension), swapped through POST /api/auth/desktop-exchange (routes/auth.routes.js):
//   - the desktop app's Google / GitHub sign-in (controllers/auth.controller.js: the browser's "You're signed in"
//     page, whose button the person presses)
//   - the editor's sign-in code (POST /api/auth/editor-code): the Classgrid app's own hand-off, and the editor's
//     browser sign-in with PKCE, whose code the person copies from the page and pastes into the editor
// Each lasts 10 minutes (utils/code-lifetime.js; 60 seconds, and 5 minutes with PKCE, before 2026-11-25) and works
// once. Before, the exchange read the code and deleted it afterwards in a second step, so two requests at the same
// moment could both use it; and the PKCE challenge was saved after the code, so for a moment the code worked without
// the editor's verifier. Now the code and its challenge are saved in one step and taken (read and deleted) in one
// step, and PKCE is checked on what was taken.
import crypto from "crypto";
import { CODE_TTL_SECONDS } from "../utils/code-lifetime.js";

export const loginKey = (code) => `desktoplogin:${code}`;
export const pkceKey = (code) => `desktoplogin-pkce:${code}`;

/** Saves a code: the in-app page it opens and, for an editor's browser sign-in, its PKCE challenge, in one step. */
export async function saveLoginCode(redis, code, path, challenge = "") {
    const step = redis.multi();
    step.set(loginKey(code), path, "EX", CODE_TTL_SECONDS);
    if (challenge) step.set(pkceKey(code), challenge, "EX", CODE_TTL_SECONDS);
    const results = await step.exec();
    const failed = (results || []).find(([err]) => err);
    if (failed) throw failed[0];
}

/**
 * Takes a code (read and deleted in one step, so it works once). Resolves { path } or { error } with the words the
 * person is shown. A code whose PKCE verifier does not fit is used up too, as before.
 */
export async function takeLoginCode(redis, code, verifier = "") {
    let results;
    try {
        results = await redis.multi().get(loginKey(code)).get(pkceKey(code)).del(loginKey(code), pkceKey(code)).exec();
    } catch {
        results = null;
    }
    const path = results?.[0]?.[0] ? null : results?.[0]?.[1];
    const challenge = results?.[1]?.[0] ? null : results?.[1]?.[1];
    if (!path) return { error: "This sign-in link has expired. Please try again." };
    if (challenge) {
        const got = Buffer.from(crypto.createHash("sha256").update(String(verifier || "")).digest("base64url"));
        const want = Buffer.from(String(challenge));
        if (!verifier || got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
            return { error: "This sign-in code doesn't belong to this editor. Please sign in again." };
        }
    }
    return { path };
}
