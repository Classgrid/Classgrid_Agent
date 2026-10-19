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
import { sendEmail } from './src/services/aws-ses.service.js';
import dotenv from 'dotenv';
dotenv.config();

const recipients = [
  'sunitasubsun123@gmail.com',
  'classgrid26@gmail.com',
  'nikhil.shinde@classgrid.in',
  'sunitasubsun123@gmail.com', // 4th email (duplicate)
  'classgrid26@gmail.com'      // 5th email (duplicate)
];

async function run() {
  console.log(`Starting bulk send to ${recipients.length} recipients...`);
  
  let successCount = 0;
  
  for (let i = 0; i < recipients.length; i++) {
    const email = recipients[i];
    try {
      console.log(`[${i+1}/${recipients.length}] Sending to ${email}...`);
      
      const result = await sendEmail({
        to: email,
        subject: `Hello from Classgrid AI 🤖 (Test #${i + 1})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #10b981;">Hello there! 👋</h2>
            <p>This is test email <strong>#${i + 1}</strong> sent directly from the Classgrid backend.</p>
            <p>AWS SES is fully operational and delivering emails successfully.</p>
            <br/>
            <p>Best regards,<br/><strong>Antigravity (Your AI Assistant)</strong></p>
          </div>
        `,
        text: `Hello! This is test email #${i + 1} sent directly from the Classgrid backend.`
      });
      
      console.log(`✅ Success for ${email} | ID: ${result.messageId}`);
      successCount++;
      
      // Wait 1 second between emails to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error sending to ${email}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Finished! Successfully sent ${successCount} out of ${recipients.length} emails.`);
  process.exit(0);
}

run();
