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
// Trigger deploy verification - Oct 4 2026
import { AsyncLocalStorage } from 'node:async_hooks';

export const usageStorage = new AsyncLocalStorage();

const originalFetch = global.fetch;

global.fetch = async (...args) => {
    const res = await originalFetch(...args);
    const store = usageStorage.getStore();
    
    // If we are tracking usage in this async context
    if (store) {
        if (!store.promises) store.promises = [];
        
        // We MUST clone because reading the stream locks it for the original caller
        const clone = res.clone();
        const p = clone.json().then(data => {
            if (data && data.usage) {
                // OpenAI / Anthropic / Cloudflare all return standard usage objects
                // Accumulate across tool-call iterations (each re-sends the full context)
                if (!store.usage) {
                    store.usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
                }
                store.usage.prompt_tokens += data.usage.prompt_tokens || 0;
                store.usage.completion_tokens += data.usage.completion_tokens || 0;
                store.usage.total_tokens += data.usage.total_tokens || 0;
            }
        }).catch(() => {
            // Ignore parse errors (e.g. if response is plain text)
        });
        store.promises.push(p);
    }
    
    return res;
};
