// A password reset link's token as it is kept on the account: its sha256, never the token itself
// (controllers/auth.controller.js forgotPassword, verifyResetToken, resetPassword; routes/super-admin.routes.js
// "Send password reset email"). One rule, so a link made in one place is found by the other (2026-11-25: the super
// admin's link kept the raw token and the reset page never found it).
import crypto from "crypto";

export const hashResetToken = (raw) => crypto.createHash("sha256").update(String(raw)).digest("hex");
