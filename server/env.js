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
import dotenv from "dotenv";

// Only load .env file in local development
// On Vercel, env vars are set via the dashboard — don't override them
if (!process.env.VERCEL) {
    dotenv.config();
}

if (process.env.NODE_ENV === "production") {
    const requiredEnv = ["MONGO_URI", "JWT_SECRET", "COOKIE_SECRET"];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);
    if (missingEnv.length > 0) {
        throw new Error(`Missing required production environment variables: ${missingEnv.join(", ")}`);
    }
}

console.log("✅ ENV loaded");
console.log("=================================");
console.log("MONGO_URI:", process.env.MONGO_URI ? "SET" : "MISSING");
console.log("BREVO HOST:", process.env.BREVO_SMTP_HOST || "MISSING");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "SET (first 10 chars)" : "MISSING");
console.log("GOOGLE_CALLBACK_URL_PROD:", process.env.GOOGLE_CALLBACK_URL_PROD || "MISSING");
console.log("GITHUB_CLIENT_ID:", process.env.GITHUB_CLIENT_ID ? "SET" : "MISSING");
console.log("GITHUB_CLIENT_SECRET:", process.env.GITHUB_CLIENT_SECRET ? "SET" : "MISSING");
console.log("FACEBOOK_CLIENT_ID:", process.env.FACEBOOK_CLIENT_ID ? "SET" : "MISSING");
console.log("FACEBOOK_CLIENT_SECRET:", process.env.FACEBOOK_CLIENT_SECRET ? "SET" : "MISSING");
console.log("LINKEDIN_CLIENT_ID:", process.env.LINKEDIN_CLIENT_ID ? "SET" : "MISSING");
console.log("LINKEDIN_CLIENT_SECRET:", process.env.LINKEDIN_CLIENT_SECRET ? "SET" : "MISSING");
console.log("NODE_ENV:", process.env.NODE_ENV || "MISSING");
console.log("VERCEL:", process.env.VERCEL || "FALSE");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "MISSING");
console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? "SET" : "MISSING");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "SET" : "MISSING");
console.log("HUGGINGFACE_API_KEY:", process.env.HUGGINGFACE_API_KEY ? "SET" : "MISSING");
console.log("AWS_SNS_ACCESS_KEY_ID:", process.env.AWS_SNS_ACCESS_KEY_ID ? "SET" : "MISSING");
console.log("=================================");
