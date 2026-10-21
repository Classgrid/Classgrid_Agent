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
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ 
    apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, 
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` 
});

/**
 * Extracts questions from an image using Cloudflare Workers AI Vision Model
 * Supports Physics, Maths, Chemistry (LaTeX) and General subjects
 */
export async function extractQuestionsFromImage(imageBuffer, mimeType) {
    try {
        const prompt = `
        You are an expert OCR and Question Parser for Classgrid Platform.
        Your task is to extract educational questions from the provided image (which could be a photo of a textbook, a PDF screenshot, or a handwritten paper).

        RULES:
        1. Extract the question text, options, and identify the correct answer if possible.
        2. Format Maths/Physics equations using LaTeX (wrap in $ for inline).
        3. Since you are outputting JSON, double-escape all backslashes in LaTeX (e.g., \\\\frac instead of \\frac).
        4. If options are not clear, generate 4 plausible options based on the question.
        5. Return exactly a JSON object with a "questions" array.

        OUTPUT FORMAT:
        {
          "questions": [
            {
              "question": "The question text here...",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_answer": "Option A",
              "type": "mcq",
              "marks": 4
            }
          ]
        }
        `;

        const b64Data = imageBuffer.toString("base64");
        const dataUrl = `data:${mimeType || "image/jpeg"};base64,${b64Data}`;

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
            max_tokens: 1500,
            temperature: 0.1
        });
        
        const text = response.choices[0].message.content;
        
        // Clean markdown JSON blocks if present
        const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("Invalid format returned by AI");
        }

        return parsed.questions;
    } catch (error) {
        console.error("[AI OCR Service] Error:", error);
        throw new Error("AI failed to read questions from this image.");
    }
}

