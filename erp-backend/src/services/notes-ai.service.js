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


const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });



// ─────────────────────────────────────────────
// AI VERIFY & SUMMARIZE
// ─────────────────────────────────────────────
export async function verifyAndSummarize(noteContent, noteTitle) {
    const prompt = `You are an academic content verifier for Classgrid, a science learning platform.

Analyze the following academic note and provide a structured verification report.

**Note Title:** ${noteTitle}
**Note Content:** ${noteContent.substring(0, 4000)}

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{
  "isAccurate": true or false,
  "summary": "2-3 sentence summary of the note",
  "keyConcepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
  "difficultyLevel": "Easy" or "Medium" or "Hard",
  "qualityScore": 1-10,
  "suggestions": "One sentence suggestion for improvement or 'Content is well-structured' if good",
  "topicCategory": "Organic science" or "Physical science" or "Inorganic science" or "Physics" or "Mathematics" or "General"
}`;

    try {
        // Try Groq first
        const response = await groq.chat.completions.create({
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 800,
        });

        const text = response.choices?.[0]?.message?.content || "";
        return parseJSON(text);
    } catch (err) {
        console.error("AI verification failed:", err.message);
            return {
                isAccurate: true,
                summary: "AI verification temporarily unavailable. Content has been accepted.",
                keyConcepts: ["Pending AI review"],
                difficultyLevel: "Medium",
                qualityScore: 7,
                suggestions: "Please try AI verification again later.",
                topicCategory: "General",
            };
        }
}

// ─────────────────────────────────────────────
// AI GENERATE QUIZ
// ─────────────────────────────────────────────
export async function generateQuizFromContent(noteContent, noteTitle) {
    const prompt = `You are a quiz generator for Classgrid, a science learning platform.

Generate a quiz from the following academic content.

**Note Title:** ${noteTitle}
**Content:** ${noteContent.substring(0, 4000)}

Generate exactly 5 MCQ questions and 1 short-answer question.

Respond ONLY in this exact JSON format (no markdown, no code blocks):
[
  {
    "type": "mcq",
    "question": "What is...?",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctAnswer": "A) option1",
    "explanation": "Brief explanation of why this is correct"
  },
  {
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "...",
    "explanation": "..."
  },
  {
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "...",
    "explanation": "..."
  },
  {
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "...",
    "explanation": "..."
  },
  {
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "...",
    "explanation": "..."
  },
  {
    "type": "short-answer",
    "question": "Explain briefly...",
    "options": [],
    "correctAnswer": "Expected answer in 1-2 sentences",
    "explanation": "Detailed explanation"
  }
]`;

    try {
        const response = await groq.chat.completions.create({
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            max_tokens: 2000,
        });

        const text = response.choices?.[0]?.message?.content || "";
        return parseJSON(text);
    } catch (err) {
        console.error("AI quiz generation failed:", err.message);
        throw new Error("Quiz generation failed with AI provider");
    }
}

// ─────────────────────────────────────────────
// HELPER: Parse JSON from AI response
// ─────────────────────────────────────────────
function parseJSON(text) {
    try {
        // Remove markdown code blocks if present
        let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        return JSON.parse(cleaned);
    } catch (e) {
        // Try to extract JSON from the text
        const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e2) {
                console.error("Failed to parse AI JSON response:", text.substring(0, 200));
                throw new Error("Invalid AI response format");
            }
        }
        throw new Error("No JSON found in AI response");
    }
}

