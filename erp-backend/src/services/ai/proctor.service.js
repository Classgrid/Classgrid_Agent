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

import OpenAI from "openai";

const openai = new OpenAI({ 
    apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, 
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` 
});

/**
 * analyzeProctorSnapshot
 * Analyzes an image snapshot for potential cheating violations.
 * @param {string} base64Image - The image in base64 format.
 * @returns {Promise<Object>} { violationDetected: boolean, reason: string }
 */
export const analyzeProctorSnapshot = async (base64Image) => {
    try {
        if (!base64Image) throw new Error("No image provided");

        const b64Data = base64Image.split(",")[1] || base64Image;
        const dataUrl = `data:image/jpeg;base64,${b64Data}`;

        const prompt = `
            You are an AI Exam Proctor. Analyze this webcam snapshot of a student taking a high-stakes exam.
            Check for the following violations:
            1. More than one person in frame.
            2. No person in frame (empty seat).
            3. Use of mobile phone or electronic devices.
            4. Student talking or wearing headphones (if visible).
            5. Student looking away from the screen persistently.

            Response MUST be a JSON object:
            {
                "violationDetected": boolean,
                "reason": "string describing the violation or 'None'",
                "confidence": number (0-1)
            }
        `;

        const response = await openai.chat.completions.create({
            model: "@cf/meta/llama-3.2-11b-vision-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ],
            max_tokens: 500,
            temperature: 0.2
        });
        
        const text = response.choices[0].message.content;
        
        // Clean and parse JSON
        const jsonMatch = text.match(/\{.*\}/s);
        if (!jsonMatch) throw new Error("Invalid AI response format");
        
        return JSON.parse(jsonMatch[0]);
    } catch (err) {
        console.error("[Proctor Service] Analysis Error:", err);
        return { violationDetected: false, reason: "Analysis failed", error: err.message };
    }
};

