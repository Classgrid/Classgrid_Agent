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
import fs from 'fs';

const mdPath = 'c:\\classgrid_marketting\\Classgrid_marketting\\Diwali_2026_Marketing_Blast.md';
let mdContent = fs.readFileSync(mdPath, 'utf8');

const jsonContent = fs.readFileSync('parsed_students.json', 'utf8');

const newScriptSection = `## 2. The Execution Script (Node.js)

\`\`\`javascript
import dotenv from 'dotenv';
import { sendEmail } from './src/services/aws-ses.service.js';
import { baseTemplate } from './src/services/email-templates.service.js';

dotenv.config();

// The fully parsed JSON array of students
const students = ${jsonContent.replace(/\n/g, '\n')};

async function runDiwaliBlast() {
  console.log("🚀 Initializing Classgrid Diwali Marketing Blast...");
  console.log(\`✅ Loaded \${students.length} students from parsed JSON.\`);
  console.log(\`⏳ Commencing AWS SES Blast at 14 emails/second...\`);

  // Fire Emails
  const promises = [];
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    // Inject the name into the content string
    const content = \\\`
      <h2 style="color: #111111; margin-top: 0; margin-bottom: 16px;">Hi \${student.firstName},</h2>
      
      <p style="color: #374151; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">As the festive season brings light and new beginnings, we wanted to take a moment to wish you and your family a very Happy and Prosperous Diwali!</p>
      
      <p style="color: #374151; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">We know the semester is incredibly busy, so we hope you get a chance to take a break, enjoy the celebrations, and spend quality time with the people who matter most.</p>
      
      <div style="background-color: #f9f9f9; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #374151; font-size: 14px; line-height: 1.7; margin-bottom: 0;">At <strong style="color: #111111;">Classgrid</strong>, we are building the next generation of software to make college life and campus management easier for students and faculty alike. As an initiative born right here at PCCOE, your continued support means the world to us.</p>
      </div>
      
      <p style="color: #374151; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">May this festival of lights bring you success, joy, and a lot of great code! 🚀</p>
      
      <p style="color: #374151; font-size: 14px; line-height: 1.7; margin-bottom: 0;">Warm regards,<br>
      <strong style="color: #111111;">The Classgrid Team</strong><br>
      <a href="https://www.classgrid.in" style="color: #111111;">www.classgrid.in</a></p>
    \\\`;

    // Wrap it using the Classgrid Native Base Template
    const htmlTemplate = baseTemplate({
      content: content,
      title: \\\`Happy Diwali, \${student.firstName}!\\\`,
      ignoreText: "This is an automated email sent via the Classgrid Ecosystem infrastructure."
    });
    
    const p = sendEmail({
      to: student.email,
      subject: \\\`Wishing you a very Happy Diwali, \${student.firstName}! 🪔✨\\\`,
      html: htmlTemplate, 
      fromName: 'The Classgrid Team',
      fromEmail: 'diwali@classgrid.in',
      replyTo: 'support@classgrid.in'
    }).then(() => console.log(\\\`✅ Sent to \${student.firstName}\\\`))
      .catch((err) => console.error(\\\`❌ Failed for \${student.firstName}: \${err.message}\\\`));
      
    promises.push(p);
    
    // 71ms delay = roughly 14 emails per second
    await new Promise(res => setTimeout(res, 71)); 
  }
  
  await Promise.all(promises);
  console.log("🎆 MISSION ACCOMPLISHED. Happy Diwali!");
}

// runDiwaliBlast();
\`\`\`
`;

// Replace everything from "## 2. The Execution Script" to the end of the file
const parts = mdContent.split('## 2. The Execution Script (Node.js)');
mdContent = parts[0] + newScriptSection;

fs.writeFileSync(mdPath, mdContent);
console.log("Markdown updated successfully");
