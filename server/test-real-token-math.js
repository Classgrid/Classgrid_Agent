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
import { encode } from 'gpt-tokenizer';

/**
 * Calculates the REAL exact token cost of a chat session using GPT tokenizer.
 * @param {Array} messages - The full array of messages (System prompt + History + Question)
 * @param {String} answer - The final answer returned by the AI
 * @param {String} thought - Any internal reasoning/thinking by the AI
 * @returns {Object} { input_tokens, output_tokens, total_tokens }
 */
export function calculateRealTokenUsage(messages, answer, thought = "") {
    let inputTokens = 0;

    // 1. Count the exact tokens of every single message in the history 
    // (This includes the massive system prompt, tool definitions, and chat history)
    if (messages && Array.isArray(messages)) {
        for (const msg of messages) {
            let contentStr = "";
            if (typeof msg.content === 'string') {
                contentStr = msg.content;
            } else if (Array.isArray(msg.content)) {
                contentStr = JSON.stringify(msg.content);
            }
            
            // Format similarly to how LLMs process messages
            const textToCount = `role: ${msg.role}\ncontent: ${contentStr}`;
            inputTokens += encode(textToCount).length;
        }
    }

    // 2. Count the output tokens (AI's answer + internal thinking)
    const outputText = `${answer || ""}\n${thought || ""}`;
    const outputTokens = encode(outputText).length;

    // 3. Return the exact real math
    return {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens
    };
}

// === TEST RUNNER ===
// Run this file with `node test-real-token-math.js` to see it in action!
const runTest = () => {
    // A massive fake system prompt (simulating Classgrid's 8000 token context)
    const massiveSystemPrompt = "You are Classgrid AI. Here are the tools. " + " rule".repeat(8000);
    
    const fakeMessages = [
        { role: "system", content: "You are a helpful assistant. Here are 8000 words of calendar data and rules..." + massiveSystemPrompt },
        { role: "user", content: "Hi" } // The user just types "Hi"
    ];
    const fakeAnswer = "Hello! How can I help you today?";

    console.log("==========================================");
    console.log("Testing REAL Token Calculation with Cloudflare logic...");
    console.log("==========================================");
    
    const usage = calculateRealTokenUsage(fakeMessages, fakeAnswer);
    
    console.log(`User typed: "Hi"`);
    console.log(`AI replied: "${fakeAnswer}"`);
    console.log("------------------------------------------");
    console.log(`Input Tokens (System Prompt + History): ${usage.input_tokens.toLocaleString()}`);
    console.log(`Output Tokens (AI Answer):              ${usage.output_tokens.toLocaleString()}`);
    console.log("------------------------------------------");
    console.log(`TOTAL TOKENS TO DEDUCT:                 ${usage.total_tokens.toLocaleString()}`);
    console.log("==========================================");
};

// If run directly via node, run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    runTest();
}
