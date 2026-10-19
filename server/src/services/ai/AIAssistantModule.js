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
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import Groq from 'groq-sdk';

// Ensure API key exists
const apiKey = process.env.GROQ_API_KEY;
const groq = apiKey ? new Groq({ apiKey }) : null;

class AIAssistantModule {
    
    /**
     * Given an array of chat messages, generate a short summary using Llama 3 on Groq
     */
    static async summarizeThread(messages, threadName = 'Chat') {
        if (!groq) throw new Error("Groq API key is missing or invalid");

        // Format history
        const chatHistory = messages
            .filter(m => m.message)
            .map(m => `${m.sender_name || 'User'}: ${m.message}`)
            .join('\n');

        if (!chatHistory) return "Not enough context to summarize.";

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are an AI assistant in an educational platform called Classgrid. Summarize the following discussion in ${threadName}. Keep the summary concise, ideally 2-3 bullet points. No conversational filler.`
                    },
                    {
                        role: "user",
                        content: Object.keys(messages).length > 20 
                            ? chatHistory.split('\n').slice(-20).join('\n') // Only summarize last 20 messages to keep context window tiny & lightning fast
                            : chatHistory
                    }
                ],
                model: '@cf/deepseek-ai/deepseek-v4-pro-0813', // Use the blazing fast 8B model
                temperature: 0.3,
            });

            return completion.choices[0]?.message?.content || "No summary available.";
        } catch (error) {
            console.error("Groq Summary Error:", error);
            throw new Error("Failed to generate summary");
        }
    }

    /**
     * Suggest exactly 3 short replies based on the last few messages
     */
    static async suggestReplies(messages) {
        if (!groq) throw new Error("Groq API key is missing or invalid");

        // Only need the very end of the chat to generate good reply context
        const recentMessages = messages.slice(-5).filter(m => m.message);
        if (recentMessages.length === 0) return [];

        const chatContext = recentMessages
            .map(m => `${m.sender_name || 'User'}: ${m.message}`)
            .join('\n');

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Based on the final messages of this chat context, suggest exactly three short, natural replies the user could tap to quickly respond. Return ONLY a valid JSON array of strings e.g. [\"Sounds good!\", \"I'll check on that\", \"Thanks!\"]."
                    },
                    {
                        role: "user",
                        content: chatContext
                    }
                ],
                model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
                temperature: 0.5,
            });

            const content = completion.choices[0]?.message?.content || "[]";
            
            // Clean up any potential markdown formatting the AI might inject on accident
            const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("Groq Smart Reply Error:", error);
            return []; // Fail gracefully, don't crash
        }
    }
    /**
     * Convert Thread into Structured Notes
     */
    static async convertToNotes(threadMessages) {
        if (!threadMessages || threadMessages.length === 0) return 'No content to analyze.';
        
        const chatScript = threadMessages.map(msg => `${msg.sender_name}: ${msg.message}`).join('\n');
        
        const systemPrompt = `You are an expert AI tutor. 
Convert the following chat transcript into clean, structured Markdown study notes.
Identify key concepts, dates, formulas, assignments, or instructions discussed.
Use headings (##), bullet points, and bold text for emphasis.
If the chat is casual, summarize any administrative takeaways concisely.
Keep it strictly under 500 words.`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `TRANSCRIPT:\n\n${chatScript}` }
                ],
                model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
                max_tokens: 1500,
                temperature: 0.3
            });

            return completion.choices[0]?.message?.content || 'Failed to generate notes.';
        } catch (error) {
            console.error('Groq Notes Conversion Error:', error);
            throw new Error('Notes conversion failed');
        }
    }
}

export default AIAssistantModule;
