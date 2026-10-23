/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import mongoose from "mongoose";

// Secrets, auth codes and tokens are stored only as sha256 hex hashes (see oauth.provider.routes.js).
// The old plain-text fields are kept in the schemas so old rows still load, but they are never written
// or read any more: old plain rows simply stop working.

const OAuthClientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  clientSecret: { type: String }, // legacy plain text, no longer written or read
  clientSecretHash: { type: String }, // sha256 hex of the secret
  name: { type: String, required: true }, // e.g., "Notion AI" or "Cursor MCP"
  redirectUris: { type: [String], required: true },
  grants: { type: [String], default: ["authorization_code", "refresh_token"] },
  // RFC 7591 metadata. "none" = public client (Claude Code, Cursor): no secret, PKCE is the proof.
  // Clients saved before this field existed have none set and are treated as secret-based.
  tokenEndpointAuthMethod: { type: String, enum: ["none", "client_secret_post", "client_secret_basic"] },
  responseTypes: { type: [String], default: undefined },
  scope: { type: String, default: null }, // space separated scopes the client registered for (null = any)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastUsedAt: { type: Date },
  // Set only for dynamically registered (DCR) clients, cleared when they first get a token.
  // Claude registers a new client on every fresh connection, so unused ones are deleted after 7 days.
  unusedExpiresAt: { type: Date, default: null }
}, { timestamps: true });

// TTL index: deletes DCR clients that never got a token (documents without the date are never touched)
OAuthClientSchema.index({ unusedExpiresAt: 1 }, { expireAfterSeconds: 0 });

// A sign-in started at GET /oauth/authorize, waiting for the user on the consent page. Everything the app
// sent (PKCE challenge, scopes, resource, state) is kept here, so the browser only carries a random
// request_id and cannot change any of it. Only the request_id's hash is stored.
const OAuthAuthRequestSchema = new mongoose.Schema({
  requestIdHash: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  state: { type: String, default: null },
  codeChallenge: { type: String, required: true },
  codeChallengeMethod: { type: String, required: true, enum: ["S256"] },
  requestedScopes: { type: [String], default: [] },
  resource: { type: String, required: true },
  consumedAt: { type: Date, default: null }, // set atomically when the user allows or denies
  expiresAt: { type: Date, required: true }
});

OAuthAuthRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OAuthAuthCodeSchema = new mongoose.Schema({
  authorizationCode: { type: String }, // legacy plain text, no longer written or read
  codeHash: { type: String, required: true, unique: true }, // sha256 hex of the code
  expiresAt: { type: Date, required: true },
  redirectUri: { type: String, required: true },
  clientId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  codeChallenge: { type: String }, // PKCE (S256); codes without one are refused at /token
  codeChallengeMethod: { type: String },
  requestedScopes: { type: [String], default: [] },
  scopes: { type: [String], default: [] }, // granted = what the user ticked, within the supported scopes
  audience: { type: String } // RFC 8707 resource the token will be bound to
});

// TTL index to automatically delete expired auth codes
OAuthAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// A code that was already exchanged. Kept briefly so a second use can be spotted and the tokens
// issued from that code revoked (RFC 6749 §4.1.2).
const OAuthUsedCodeSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true },
  clientId: { type: String },
  reusedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true }
});

OAuthUsedCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OAuthTokenSchema = new mongoose.Schema({
  accessToken: { type: String }, // legacy plain text, no longer written or read
  accessTokenHash: { type: String, required: true, unique: true }, // sha256 hex
  accessTokenExpiresAt: { type: Date, required: true },
  refreshToken: { type: String }, // legacy plain text, no longer written or read
  refreshTokenHash: { type: String, unique: true, sparse: true }, // sha256 hex
  refreshTokenExpiresAt: { type: Date, required: true },
  authCodeHash: { type: String, index: true }, // the code these tokens came from (for reuse revocation)
  familyId: { type: String, index: true }, // all tokens from one sign-in; refresh rotation keeps it
  rotatedAt: { type: Date, default: null }, // refresh token already exchanged; showing it again revokes the family
  scopes: { type: [String], default: [] },
  audience: { type: String },
  authTime: { type: Date }, // when the user approved; kept across refreshes so a password change still ends the family
  clientId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true });

// TTL index on the REFRESH expiry: the document must outlive the 24h access token, otherwise the
// 30-day refresh token was deleted together with it.
OAuthTokenSchema.index({ refreshTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Codes and tokens live in new collections. The old ones carry indexes that no longer fit
// (a non-sparse unique index on the plain value, and a TTL on accessTokenExpiresAt that deleted
// refresh tokens after 24h); Mongoose never drops old indexes, so reusing them would keep both bugs.
// The old collections empty themselves through their own TTL indexes within 24 hours.
export const OAuthClient = mongoose.models.OAuthClient || mongoose.model("OAuthClient", OAuthClientSchema);
export const OAuthAuthRequest = mongoose.models.OAuthAuthRequest || mongoose.model("OAuthAuthRequest", OAuthAuthRequestSchema, "oauth_auth_requests");
export const OAuthAuthCode = mongoose.models.OAuthAuthCode || mongoose.model("OAuthAuthCode", OAuthAuthCodeSchema, "oauth_auth_codes_v2");
export const OAuthUsedCode = mongoose.models.OAuthUsedCode || mongoose.model("OAuthUsedCode", OAuthUsedCodeSchema, "oauth_used_codes");
export const OAuthToken = mongoose.models.OAuthToken || mongoose.model("OAuthToken", OAuthTokenSchema, "oauth_tokens_v2");
