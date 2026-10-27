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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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
// How many pool tokens an AI request costs the user (owner decision, 2026-10-08):
//   - every model counts by its real price, relative to DeepSeek V4 Pro (the main model the pools were
//     designed around) = 1x per token;
//   - cached input counts at its real weight (a cache read costs a fraction of a normal input token, a
//     cache write a bit more).
// Raw token counts are still logged unchanged in AiUsageLog; only the amount taken from the pool changes.

// USD per million tokens: input, output, cacheRead, cacheWrite (cache prices only where the provider bills them).
const PRICES = {
    "@cf/deepseek-ai/deepseek-v4-pro-0813": { input: 1.32, output: 3.96, cacheRead: 0.044 },
    "@cf/deepseek-ai/deepseek-v4-flash-0731": { input: 0.44, output: 1.32, cacheRead: 0.014 },
    "@cf/openai/gpt-oss-120b": { input: 0.35, output: 0.75 },
    "@cf/openai/gpt-oss-20b": { input: 0.2, output: 0.3 },
    "@cf/moonshotai/kimi-k2.6": { input: 0.95, output: 4, cacheRead: 0.16 },
    "@cf/moonshotai/kimi-k2.7-code": { input: 0.95, output: 4, cacheRead: 0.19 },
    "@cf/zai-org/glm-5.3": { input: 1.4, output: 4.4, cacheRead: 0.26 },
    "@cf/zai-org/glm-5.3-flash": { input: 0.15, output: 0.5, cacheRead: 0.03 },
    "@cf/zai-org/glm-5.2": { input: 1.4, output: 4.4, cacheRead: 0.26 },
    "@cf/zai-org/glm-4.7-flash": { input: 0.0605, output: 0.4 },
    "@cf/qwen/qwen3.8-27b": { input: 0.45, output: 3.2, cacheRead: 0.05 },
    "@cf/google/gemma-4-26b-a4b-it": { input: 0.1, output: 0.3, cacheRead: 0.05 },
    "@cf/nvidia/nemotron-3-120b-a12b": { input: 0.5, output: 1.5 },
    "@cf/meta/llama-4-scout-17b-16e-instruct": { input: 0.27, output: 0.85 },
    "@cf/mistralai/mistral-small-3.1-24b-instruct": { input: 0.351, output: 0.555 },
    "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
    "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
    "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
    "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
    // Targets of Claude's server-side refusal fallback
    "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};
const BASELINE = PRICES["@cf/deepseek-ai/deepseek-v4-pro-0813"];

/** Prices for a logged model id: exact match, else the longest known id it starts with (dated snapshots). */
export function pricesFor(model) {
    const id = String(model || "");
    if (PRICES[id]) return PRICES[id];
    const key = Object.keys(PRICES).filter((k) => id.startsWith(k)).sort((a, b) => b.length - a.length)[0];
    return key ? PRICES[key] : BASELINE; // unknown models count like the main model
}

/**
 * Pool tokens for one request.
 * usage: { prompt_tokens, completion_tokens, cache_read_input_tokens?, cache_creation_input_tokens? }
 * (prompt_tokens includes any cached tokens, as both stream loops report it).
 */
export function chargeableTokens(usage, model) {
    if (!usage) return 0;
    const p = pricesFor(model);
    const cacheRead = usage.cache_read_input_tokens || 0;
    const cacheWrite = usage.cache_creation_input_tokens || 0;
    const uncachedInput = Math.max(0, (usage.prompt_tokens || 0) - cacheRead - cacheWrite);
    const output = usage.completion_tokens || 0;
    const inputWeight = p.input / BASELINE.input;
    const outputWeight = p.output / BASELINE.output;
    const cacheReadWeight = (p.cacheRead ?? p.input) / BASELINE.input;
    const cacheWriteWeight = (p.cacheWrite ?? p.input) / BASELINE.input;
    const total = uncachedInput * inputWeight + output * outputWeight + cacheRead * cacheReadWeight + cacheWrite * cacheWriteWeight;
    const raw = (usage.prompt_tokens || 0) + output;
    return raw > 0 ? Math.max(1, Math.round(total)) : 0;
}
