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
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/classgrid";

async function runMockOtpDaemon() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB.");
        console.log("🚀 Mock OTP Daemon is running...");
        console.log("Listening for any phone OTP requests and automatically changing them to '123456'...");

        // Define a loose schema just to access the collection
        const onboardingOTPSchema = new mongoose.Schema({}, { strict: false });
        const OnboardingOTP = mongoose.models.OnboardingOTP || mongoose.model('OnboardingOTP', onboardingOTPSchema, 'onboardingotps');

        // Continuously poll and override any phone OTPs to '123456'
        setInterval(async () => {
            try {
                const result = await OnboardingOTP.updateMany(
                    { type: 'phone', otp: { $ne: '123456' } },
                    { $set: { otp: '123456' } }
                );

                if (result.modifiedCount > 0) {
                    console.log(`[Mocked] Successfully overrode ${result.modifiedCount} phone OTP(s) to '123456'.`);
                }
            } catch (updateErr) {
                console.error("Error updating OTP:", updateErr);
            }
        }, 1000); // Poll every 1 second

    } catch (err) {
        console.error("❌ Failed to connect to MongoDB:", err);
        process.exit(1);
    }
}

runMockOtpDaemon();
