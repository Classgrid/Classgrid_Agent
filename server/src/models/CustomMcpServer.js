// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// A remote MCP server a user added as a custom plugin (AI Hub > Plugins > Add connector, or by asking the AI).
// Secrets (API key, OAuth tokens, client secret) are stored encrypted with utils/encryption.js.
import mongoose from "mongoose";

const toolSchema = new mongoose.Schema({
    name: String,
    title: String,
    description: String,
    inputSchema: mongoose.Schema.Types.Mixed,
    annotations: mongoose.Schema.Types.Mixed,
}, { _id: false });

const customMcpServerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    url: { type: String, required: true, trim: true },
    catalogId: { type: String, default: null }, // set when added from the list of known apps
    iconUrl: { type: String, default: "" }, // the user's PNG (data URL, max 10 KB) or the app's own logo
    authType: { type: String, enum: ["oauth", "api_key", "none"], default: "oauth" },
    // api_key: sent as "Authorization: Bearer <key>" or in a header the user names
    apiKeyHeader: { type: String, default: "Authorization" },
    apiKeyEnc: { type: String, default: null },
    // oauth: client (from dynamic registration or typed by the user), tokens and the PKCE verifier of the open login
    oauthClientEnc: { type: String, default: null },
    oauthTokensEnc: { type: String, default: null },
    oauthCodeVerifier: { type: String, default: null },
    oauthState: { type: String, default: null, index: true },
    oauthScope: { type: String, default: "" },
    transport: { type: String, enum: ["http", "sse", null], default: null }, // which one worked last time
    status: { type: String, enum: ["needs_login", "connected", "error"], default: "needs_login" },
    lastError: { type: String, default: "" },
    tools: { type: [toolSchema], default: [] },
    toolsFetchedAt: { type: Date, default: null },
    enabled: { type: Boolean, default: true },
}, { timestamps: true });

customMcpServerSchema.index({ userId: 1, name: 1 });

// The system-prompt line listing a user's connectors is kept in memory (services/custom-mcp-ai.js sets onChanged);
// any change to a server forgets it, so the next answer sees the change
customMcpServerSchema.post("save", function (doc) { this.constructor.onChanged?.(doc?.userId); });
customMcpServerSchema.post("deleteOne", { document: true, query: false }, function (doc) { this.constructor.onChanged?.(doc?.userId); });
customMcpServerSchema.post(["deleteMany", "updateOne", "updateMany", "findOneAndUpdate", "findOneAndDelete"], function () { this.model.onChanged?.(null); });

export default mongoose.models.CustomMcpServer || mongoose.model("CustomMcpServer", customMcpServerSchema);
