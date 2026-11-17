/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// One sign-in of a person on one device (owner, 2026-11-17: "build it for all three devices, show the device name and
// type, logout, and logout from all"). Every sign-in token a person's browser, desktop app, phone app or code editor
// gets carries this row's sid (services/user-session.service.js); the auth middleware refuses a token whose row is
// revoked or gone. Settings > Devices lists the rows and ends them. The plan's devices_max is counted on these rows,
// by user_id: one account is one count, whichever of its emails was used to sign in (owner, 2026-11-17).
import mongoose from "mongoose";

export const SESSION_KINDS = ["website", "desktop", "phone", "editor"];

const userSessionSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        // Random and unguessable (24 random bytes); the token's "sid" claim
        sid: { type: String, required: true, unique: true },
        kind: { type: String, enum: SESSION_KINDS, required: true },
        // Plain words: "Chrome on Windows", "Classgrid desktop app on Windows", "Classgrid phone app on Android (Pixel 8)"
        device_name: { type: String, default: "" },
        user_agent: { type: String, default: "" },
        // The device's own id when it sent one (the phone app's deviceId, the website's and desktop app's id kept in
        // the browser): the same device signing in again replaces its own row instead of counting twice
        device_id: { type: String, default: "" },
        device_model: { type: String, default: "" }, // the phone's model, when the phone app sends one
        // The push device the phone app registered while signed in with this sign-in (POST /api/user/fcm-token): logging
        // this sign-in out stops that phone's notifications even when the app sent no device id at sign-in
        push_token: { type: String, default: "" },
        push_device_id: { type: String, default: "" },
        // A token from before sign-in rows existed, given a row by /api/auth/me (sha-256 of that token): the same old
        // token asking again gets the same row instead of a new one
        legacy_key: { type: String, default: "" },
        created_at: { type: Date, default: Date.now },
        last_seen_at: { type: Date, default: Date.now },
        expires_at: { type: Date, required: true }, // the token's expiry (moved on when /api/auth/me renews the token)
        revoked_at: { type: Date, default: null },
        // logout (this device), logout_all, replaced (the same device signed in again), unused (30 days without use
        // while a device limit applies), limit (two sign-ins at once and only one fitted)
        revoke_reason: { type: String, default: "" },
    },
    { collection: "user_sessions", versionKey: false }
);

userSessionSchema.index({ user_id: 1, revoked_at: 1, expires_at: 1 });
// One row per old token: two requests adopting the same old token at once make one row (the second gets a duplicate-key
// error and uses the first one's row: user-session.service.js adoptLegacyToken)
userSessionSchema.index({ legacy_key: 1 }, { unique: true, partialFilterExpression: { legacy_key: { $type: "string", $gt: "" } } });
// Rows leave the database 30 days after their token ran out (a missing row is refused, so this never signs anyone in)
userSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.UserSession || mongoose.model("UserSession", userSessionSchema);
