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
import nodemailer from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const TOTAL_ROUNDS = 1000;
const DELAY_MS = 1500;
const RECIPIENT = "sweetboysweet26@gmail.com";

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendFromBrevo(round) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.BREVO_SMTP_HOST,
            port: Number(process.env.BREVO_SMTP_PORT),
            secure: false,
            auth: {
                user: process.env.BREVO_SMTP_USER,
                pass: process.env.BREVO_SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
            to: RECIPIENT,
            subject: `Brevo Test ${round}/${TOTAL_ROUNDS} 🟢`,
            html: `
                <h3>Hello from Brevo!</h3>
                <p>This is test email ${round} of ${TOTAL_ROUNDS}.</p>
            `,
        });

        console.log(`✅ Brevo ${round}: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Brevo ${round} failed:`, error.message);
    }
}

async function sendFromResend(round) {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const result = await resend.emails.send({
            from: "Classgrid Notifications <notification@updates.classgrid.in>",
            to: RECIPIENT,
            subject: `Resend Test ${round}/${TOTAL_ROUNDS} 🟣`,
            html: `
                <h3>Hello from Resend!</h3>
                <p>This is test email ${round} of ${TOTAL_ROUNDS}.</p>
            `,
        });

        const resendId = result.id || result.data?.id;

        if (result.error) {
            throw new Error(result.error.message);
        }

        console.log(`✅ Resend ${round}: ${resendId}`);
    } catch (error) {
        console.error(`❌ Resend ${round} failed:`, error.message);
    }
}

async function runBoth() {
    console.log(`🚀 Sending ${TOTAL_ROUNDS} rounds...`);
    console.log(`This will send ${TOTAL_ROUNDS} Brevo emails and ${TOTAL_ROUNDS} Resend emails.`);

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
        console.log(`\n📨 Round ${round}/${TOTAL_ROUNDS}`);

        await sendFromBrevo(round);
        await wait(DELAY_MS);

        await sendFromResend(round);
        await wait(DELAY_MS);
    }

    console.log("\n🏁 All email tests completed!");
}

runBoth().catch(error => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
});
