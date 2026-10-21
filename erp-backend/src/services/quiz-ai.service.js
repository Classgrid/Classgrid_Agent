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

import Groq from "groq-sdk";
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` }) : null;

export async function generateAiQuestions(topic, difficulty, count) {
    if (!groq) throw new Error("Groq API key not configured");
    if (count > 20) throw new Error("Cannot generate more than 20 questions at once");

    const prompt = `You are an expert quiz question generator capable of creating questions for ANY subject — from school-level to JEE Advanced, GATE, PhD entrance, medical (NEET), coding (DSA, system design), and beyond.

Generate exactly ${count} multiple-choice questions on the topic "${topic}" with a difficulty level of "${difficulty}".

IMPORTANT GUIDELINES:
- For MATH topics: Use LaTeX notation wrapped in dollar signs for inline math. Include equations, integrals, derivatives, matrices, limits, etc. as needed.
- For CHEMISTRY topics: Use proper chemical formulas and reaction notation. Include organic structures, equilibrium expressions, etc.
- For PHYSICS topics: Use proper physics notation with units, vectors, equations.
- For CODING topics: Include code snippets in backticks, algorithm analysis, time complexity, data structures, etc.
- For BIOLOGY/MEDICAL topics: Use proper scientific nomenclature, anatomical terms, biochemical pathways.
- Make questions genuinely challenging at the "${difficulty}" level — not surface-level recall but deep conceptual understanding, application, and analysis.
- Each question MUST have exactly 4 strings in the "options" array. All options should be plausible.
- The "correct_answer" string MUST EXACTLY match one of the items in the "options" array. No duplicates in options.

CRITICAL JSON + LaTeX RULE:
Since you are outputting JSON, all backslashes inside strings MUST be doubled.
For LaTeX commands like \\frac, \\int, \\nabla, \\Delta, \\vec, \\times, \\rightarrow, \\log, \\sqrt, you MUST write them as \\\\frac, \\\\int, \\\\nabla, \\\\Delta, \\\\vec, \\\\times, \\\\rightarrow, \\\\log, \\\\sqrt in the JSON string values.
Example: to render $\\frac{1}{2}$ write "$\\\\frac{1}{2}$" in JSON.

You must output a single JSON object with a key "questions" containing an array.

Example JSON:
{
  "questions": [
    {
      "question": "What is $\\\\int_0^1 x^2 \\\\, dx$?",
      "options": ["$\\\\frac{1}{2}$", "$\\\\frac{1}{3}$", "$\\\\frac{1}{4}$", "$1$"],
      "correct_answer": "$\\\\frac{1}{3}$"
    }
  ]
}`;

    let parsedQuestions = [];

    for (let attempts = 0; attempts < 2; attempts++) {
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
                temperature: 0.7,
                response_format: { type: "json_object" }
            });

            let content = completion.choices[0].message.content;

            // Fix common LLM mistake: single-escaped LaTeX in JSON.
            content = content.replace(/(?<!\\)\\(?=[a-zA-Z])/g, '\\\\');

            const rawJson = JSON.parse(content);

            if (rawJson.questions && validateAiQuestions(rawJson.questions)) {
                parsedQuestions = rawJson.questions;
                break;
            } else {
                console.error("AI Generated JSON failed validation rules. Retrying...");
            }
        } catch (error) {
            console.error("Groq API error on attempt", attempts + 1, error.message);
            if (attempts === 1) throw new Error("Failed to generate valid AI questions from Groq");
        }
    }

    if (parsedQuestions.length === 0) {
        throw new Error("AI failed to output the required format after retries.");
    }

    return parsedQuestions;
}

const TIER_DESCRIPTIONS = {
    'Foundation': 'School board level. Focus on basic definitions and simple recall calculations.',
    'Mastery': 'Undergraduate/Competitive level. Focus on application of concepts in new scenarios.',
    'Elite': 'Advanced undergraduate/Gate level. Requires multiple steps of derivation and logic.',
    'Insane': 'JEE Advanced/GATE/PhD entrance level. Extremely high difficulty, multi-concept integration.',
    'Fire': 'The ultimate challenge. PhD/Research level complexity. Hardest possible questions with zero margin for error.',
    'Dynamic': 'A balanced mix of Foundation, Mastery, and Elite questions.'
};

/**
 * Specialized generator for high-stakes Online Exams
 */
export async function generateExamQuestions({ subject, topic, tier, count }) {
    if (!groq) throw new Error("Groq API key not configured");
    const safeCount = Math.min(count || 5, 20);

    const tierInstructions = TIER_DESCRIPTIONS[tier] || TIER_DESCRIPTIONS['Mastery'];

    const prompt = `You are the Classgrid AI Exam Engine, an expert at creating world-class examination questions for high-stakes testing.
Subject: ${subject}
Topic: ${topic}
Target Difficulty Tier: ${tier}

Tier Specifics: ${tierInstructions}

Generate exactly ${safeCount} questions for this exam.

REQUIRED JSON FORMAT:
- "question": string (include LaTeX if Math/Science)
- "options": array of 4 strings
- "correct_answer": string (exactly matches one option)
- "explanation": string (A detailed one-paragraph explanation of why the answer is correct)
- "difficulty": string (one of: easy, medium, hard)

RULES:
1. Use LaTeX for ALL math/science notation. Wrap in single $ for inline.
2. Ensure options are realistic and challenging. No "None of these" or "All of these" unless necessary.
3. CRITICAL: In JSON, all backslashes MUST be escaped. Write \\\\frac, \\\\int, etc.
4. Output ONLY a valid JSON object starting with {"questions": [...]}.

${subject.toLowerCase().includes('coding') ? 'Include code snippets in markdown backticks within the question string.' : ''}`;

    let parsedQuestions = [];

    for (let attempts = 0; attempts < 2; attempts++) {
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a professional exam paper setter for national-level competitive exams." },
                    { role: "user", content: prompt }
                ],
                model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
                temperature: 0.6,
                response_format: { type: "json_object" }
            });

            let content = completion.choices[0].message.content;
            content = content.replace(/(?<!\\)\\(?=[a-zA-Z])/g, '\\\\');

            const rawJson = JSON.parse(content);

            if (rawJson.questions) {
                parsedQuestions = rawJson.questions;
                // Add UUIDs
                parsedQuestions.forEach(q => {
                    q.question_id = crypto.randomUUID();
                });
                break;
            }
        } catch (error) {
            console.error("Exam AI Error:", error);
            if (attempts === 1) throw error;
        }
    }

    return parsedQuestions;
}

function validateAiQuestions(questions) {
    if (!Array.isArray(questions)) return false;

    for (const q of questions) {
        if (!q.question || !Array.isArray(q.options) || !q.correct_answer) return false;
        if (q.options.length !== 4) return false;
        const uniqueOptions = new Set(q.options);
        if (uniqueOptions.size !== 4) return false;
        if (!q.options.includes(q.correct_answer)) return false;
        q.question_id = crypto.randomUUID();
    }
    return true;
}
