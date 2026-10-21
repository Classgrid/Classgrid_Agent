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

/**
 * Classgrid — FYJC Merit Email Proof Sender
 * Sends all 7 FYJC Jr. College merit-based emails to test inbox.
 * Run: node --env-file=.env server/src/scripts/send-fyjc-email-proof.js
 */
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT),
  secure: false,
  auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
});

const FROM = `"${process.env.BREVO_SENDER_NAME || "Classgrid"}" <${process.env.BREVO_SENDER_EMAIL || "support@classgrid.in"}>`;
const TO = "nikhilsubsun123@gmail.com";
const LOGO = "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png";

function base(title, content, ignore = null) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - Classgrid</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');body,html{margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background-color:#0f0f0f;-webkit-font-smoothing:antialiased}h1,h2,h3{color:#fff;margin-top:0;margin-bottom:16px}p{margin:0 0 20px;color:#ccc;font-size:14px;line-height:1.7}ul{margin:0 0 20px 20px;color:#ccc;font-size:14px;padding:0;line-height:1.7}li{margin-bottom:8px}strong{color:#fff}a{color:#fff;text-decoration:underline}.btn{display:inline-block;background-color:#fff;color:#000!important;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;margin:10px 0;text-align:center}.box{background-color:#161616;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px}.box p{margin-bottom:8px;color:#ccc}.box p:last-child{margin-bottom:0}.box .meta{font-size:12px;color:#9ca3af;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}.box .code{font-family:monospace;font-size:24px;color:#fff;letter-spacing:4px;font-weight:bold;display:block;margin-top:8px}</style></head>
<body style="margin:0;padding:0;background:#0f0f0f">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#0f0f0f;width:100%"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%">
<tr><td style="padding:30px;border-bottom:1px solid #2a2a2a;text-align:center"><img src="${LOGO}" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:6px"><h1 style="color:#fff;margin:0;font-size:20px">${title}</h1></td></tr>
<tr><td style="padding:30px;color:#ccc;font-size:14px;line-height:1.7">${content}</td></tr>
<tr><td style="padding:20px;text-align:center;border-top:1px solid #2a2a2a;color:#7a7a7a;font-size:12px">${ignore ? `<p style="margin-bottom:12px;color:#7a7a7a;font-size:12px">${ignore}</p>` : ""}© 2026 Classgrid. All rights reserved.</td></tr>
</table></td></tr></table></body></html>`;
}

const EMAILS = [
  // ═══ FYJC 1: MERIT LIST PUBLISHED ═══
  {
    subject: "[FYJC 1/7] Merit List Published - Science (PCM) | Classgrid",
    html: base("Merit List Published", `
      <h2 style="font-size:18px; color:#ffffff; margin-bottom:16px;">Merit List Published - Science (PCM)</h2>
      <p style="color:#cccccc;">Dear <strong>Priya Deshmukh</strong>,</p>
      <p style="color:#cccccc; margin-bottom:24px;">The official merit list for <strong>Elphinstone Jr. College, Mumbai</strong> has been published for the academic year <strong>2026-2027</strong>.</p>
      
      <h3 style="font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#9ca3af; margin-bottom:12px; border-bottom:1px solid #2a2a2a; padding-bottom:8px;">Merit Position Summary</h3>
      <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#1c1c1c; border:1px solid #2a2a2a; border-radius:8px; margin-bottom:24px;">
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;" width="40%">General Merit Rank</td><td style="color:#ffffff; font-family:monospace; font-size:16px; border-bottom:1px solid #2a2a2a;">#142</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Category Rank (OBC)</td><td style="color:#ffffff; font-family:monospace; font-size:16px; border-bottom:1px solid #2a2a2a;">#18</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Your Score</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">91.4%</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Category Cutoff</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">85.0%</td></tr>
        <tr><td style="color:#9ca3af;">Eligibility Status</td><td style="color:#34d399; font-weight:bold;">ELIGIBLE FOR ALLOTMENT</td></tr>
      </table>

      <p style="color:#cccccc;">You are eligible for seat allotment in <strong>Round 1</strong>. Official allotment results will be declared on <strong>18 June, 2026</strong>. Please monitor your Email and SMS for updates.</p>
    `),
  },

  // ═══ FYJC 2: SEAT ALLOTTED ═══
  {
    subject: "[FYJC 2/7] Seat Allotted - CAP Round 1 | Classgrid",
    html: base("Seat Allotted - Action Required", `
      <h2 style="font-size:18px; color:#ffffff; margin-bottom:16px;">CAP Round 1 Seat Allotment</h2>
      <p style="color:#cccccc;">Dear <strong>Priya Deshmukh</strong>,</p>
      <p style="color:#cccccc; margin-bottom:24px;">You have been officially allotted a seat at <strong>Elphinstone Jr. College, Mumbai</strong>. Please review your allotment details below.</p>
      
      <h3 style="font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#9ca3af; margin-bottom:12px; border-bottom:1px solid #2a2a2a; padding-bottom:8px;">Allotment Details</h3>
      <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#1c1c1c; border-left:3px solid #3b82f6; border-radius:4px; margin-bottom:24px;">
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;" width="35%">College</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">Elphinstone Jr. College, Mumbai</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Stream</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">Science (PCM)</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Category</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">OBC</td></tr>
        <tr><td style="color:#9ca3af;">Rank Executed</td><td style="color:#ffffff;">#142</td></tr>
      </table>

      <table width="100%" cellpadding="16" cellspacing="0" style="background-color:#1c1c1c; border:1px solid #ef4444; border-radius:8px; margin-bottom:24px;">
        <tr>
          <td align="center">
            <h3 style="color:#ef4444; margin:0 0 8px 0; font-size:16px;">CRITICAL MANDATE: Confirm Your Seat</h3>
            <p style="color:#cccccc; margin:0 0 16px 0; font-size:14px;">You must pay the admission fee and lock your seat before the deadline. Failure to pay will result in automatic cancellation.</p>
            <p style="color:#ffffff; margin:0 0 8px 0;"><strong>Admission Fee Amount:</strong> ₹12,500</p>
            <p style="color:#ffffff; margin:0 0 16px 0;"><strong>Strict Deadline:</strong> <span style="color:#ef4444; font-weight:bold;">20 June, 2026 - 17:00 IST</span></p>
            <a href="https://classgrid.in" style="background-color:#ffffff; color:#000000 !important; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block; font-size:14px;">Pay Fee & Confirm Seat</a>
          </td>
        </tr>
      </table>

      <h3 style="font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#9ca3af; margin-bottom:12px; border-bottom:1px solid #2a2a2a; padding-bottom:8px;">Portal Access Credentials</h3>
      <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#1c1c1c; border:1px solid #2a2a2a; border-radius:8px; margin-bottom:16px;">
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;" width="35%">Login Email</td><td style="color:#ffffff; font-weight:bold; border-bottom:1px solid #2a2a2a;">priya.deshmukh26@gmail.com</td></tr>
        <tr><td style="color:#9ca3af;">Temporary Password</td><td style="color:#ffffff; font-family:monospace; font-size:14px; letter-spacing:1px;">Elph@82910</td></tr>
      </table>
      
      <p style="color:#9ca3af; font-size:12px; border-left:3px solid #f59e0b; padding-left:12px; margin-bottom:24px; background-color:#1a1913; padding:12px;">
        <strong>SECURITY NOTICE:</strong> Please login using your registered Email Address shown above. Do not share your password with anyone. 
      </p>
    `),
  },

  // ═══ FYJC 3: NOT ALLOTTED ═══
  {
    subject: "[FYJC 3/7] Round Result - Not Allotted | Classgrid",
    html: base("Round 1 Status - Not Allotted", `
      <h2 style="font-size:18px; color:#ffffff; margin-bottom:16px;">CAP Round 1 Status</h2>
      <p style="color:#cccccc;">Dear <strong>Rahul Patil</strong>,</p>
      <p style="color:#cccccc; margin-bottom:24px;">We regret to inform you that you were <strong>not allotted</strong> a seat in CAP Round 1 at <strong>Elphinstone Jr. College, Mumbai</strong>.</p>
      
      <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#1c1c1c; border-left:3px solid #ef4444; border-radius:4px; margin-bottom:24px;">
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;" width="40%">Your Rank</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">#350</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Round 1 Cutoff Rank</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">#120</td></tr>
        <tr><td style="color:#9ca3af;">Stream Applied</td><td style="color:#ffffff;">Science (PCM)</td></tr>
      </table>

      <h3 style="font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#9ca3af; margin-bottom:12px; border-bottom:1px solid #2a2a2a; padding-bottom:8px;">Next Steps</h3>
      <p style="color:#cccccc;">Your application will be <strong>automatically carried forward</strong> to Round 2 without any further action required from your side. Cutoffs typically drop in subsequent rounds as allocated seats are vacated.</p>
      <p style="color:#cccccc;">Round 2 Results will be declared on <strong>25 June, 2026</strong>.</p>
    `),
  },

  // ═══ FYJC 4: WAITLIST / ROUND 2 UPDATE (ALLOTTED) ═══
  {
    subject: "[FYJC 4/7] Seat Allotted - CAP Round 2 | Classgrid",
    html: base("CAP Round 2 - Allotment Update", `
      <h2 style="font-size:18px; color:#ffffff; margin-bottom:16px;">Seat Allotted - CAP Round 2</h2>
      <p style="color:#cccccc;">Dear <strong>Rahul Patil</strong>,</p>
      <p style="color:#cccccc; margin-bottom:24px;">There is a status change for your admission application to <strong>Elphinstone Jr. College, Mumbai</strong>.</p>
      
      <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#1c1c1c; border-left:3px solid #34d399; border-radius:4px; margin-bottom:24px;">
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;" width="35%">Previous Status</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">Not Allotted (Round 1)</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">New Status</td><td style="color:#34d399; font-weight:bold; border-bottom:1px solid #2a2a2a;">ALLOTTED</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Round Executed</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">CAP Round 2</td></tr>
        <tr><td style="color:#9ca3af;">Stream</td><td style="color:#ffffff;">Science (PCM)</td></tr>
      </table>

      <table width="100%" cellpadding="16" cellspacing="0" style="background-color:#1c1c1c; border:1px solid #ef4444; border-radius:8px; margin-bottom:24px;">
        <tr>
          <td align="center">
            <h3 style="color:#ef4444; margin:0 0 8px 0; font-size:16px;">CRITICAL MANDATE: Confirm Your Seat</h3>
            <p style="color:#ffffff; margin:0 0 8px 0;"><strong>Admission Fee Amount:</strong> ₹12,500</p>
            <p style="color:#ffffff; margin:0 0 16px 0;"><strong>Strict Deadline:</strong> <span style="color:#ef4444; font-weight:bold;">28 June, 2026 - 17:00 IST</span></p>
            <a href="https://classgrid.in" style="background-color:#ffffff; color:#000000 !important; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block; font-size:14px;">Log in to Pay Fee</a>
          </td>
        </tr>
      </table>
    `),
  },

  // ═══ FYJC 5: DEADLINE REMINDER ═══
  {
    subject: "[FYJC 5/7] Action Required: Payment Deadline Tomorrow | Classgrid",
    html: base("Payment Deadline Reminder", `
      <h2 style="font-size:18px; color:#ffffff; margin-bottom:16px;">Payment Deadline Notification</h2>
      <p style="color:#cccccc;">Dear <strong>Priya Deshmukh</strong>,</p>
      <p style="color:#cccccc; margin-bottom:24px;">This is a critical reminder that your admission fee payment window at <strong>Elphinstone Jr. College, Mumbai</strong> closes tomorrow.</p>
      
      <table width="100%" cellpadding="16" cellspacing="0" style="background-color:#2a0f0f; border:1px solid #ef4444; border-radius:8px; margin-bottom:24px;">
        <tr>
          <td align="center">
            <h3 style="color:#ef4444; margin:0 0 8px 0; font-size:16px;">IMPENDING CANCELLATION</h3>
            <p style="color:#cccccc; margin:0 0 12px 0;">If you do not pay by the deadline, your allotted seat will be permanently forfeited to a waitlisted candidate.</p>
            <p style="color:#ffffff; margin:0 0 16px 0;"><strong>Deadline:</strong> <span style="color:#ef4444; font-weight:bold;">20 June, 2026 - 17:00 IST</span></p>
            <a href="https://classgrid.in" style="background-color:#ef4444; color:#ffffff !important; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block; font-size:14px;">Pay Outstanding Fee Now</a>
          </td>
        </tr>
      </table>
    `),
  },

  // ═══ FYJC 6: UPGRADE NOTIFICATION ═══
  {
    subject: "[FYJC 6/7] Allotment Upgraded - CAP Round 2 | Classgrid",
    html: base("Allotment Upgraded", `
      <h2 style="font-size:18px; color:#ffffff; margin-bottom:16px;">Seat Allotment Upgraded</h2>
      <p style="color:#cccccc;">Dear <strong>Priya Deshmukh</strong>,</p>
      <p style="color:#cccccc; margin-bottom:24px;">Based on the CAP Round 2 automated execution, your seat has been <strong>upgraded</strong> to a higher preference option.</p>
      
      <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#1c1c1c; border-left:3px solid #8b5cf6; border-radius:4px; margin-bottom:24px;">
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;" width="35%">Previous Allotment</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">Elphinstone Jr. College</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">New Allotment</td><td style="color:#8b5cf6; font-weight:bold; border-bottom:1px solid #2a2a2a;">Ruia Jr. College</td></tr>
        <tr><td style="color:#9ca3af;">Stream Executed</td><td style="color:#ffffff;">Science (PCM)</td></tr>
      </table>

      <p style="color:#cccccc;">Login to your portal immediately to review the upgrade parameters and confirm your acceptance before the Round 2 deadline on <strong>28 June, 2026 - 17:00 IST</strong>.</p>
    `),
  },

  // ═══ FYJC 7: SEAT CANCELLED ═══
  {
    subject: "[FYJC 7/7] Allotment Cancelled - Fee Deadline Missed | Classgrid",
    html: base("Seat Allotment Cancelled", `
      <h2 style="font-size:18px; color:#ffffff; margin-bottom:16px;">Seat Cancellation Notice</h2>
      <p style="color:#cccccc;">Dear <strong>Amit Kumar</strong>,</p>
      <p style="color:#cccccc; margin-bottom:24px;">Notice is hereby served that your allotted seat at <strong>Elphinstone Jr. College, Mumbai</strong> has been officially cancelled due to non-payment of the mandatory admission fee prior to the deadline.</p>
      
      <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#1c1c1c; border-left:3px solid #6b7280; border-radius:4px; margin-bottom:24px;">
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;" width="35%">Stream</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">Science (PCM)</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Round Executed</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">Round 1</td></tr>
        <tr><td style="color:#9ca3af; border-bottom:1px solid #2a2a2a;">Deadline Breached</td><td style="color:#ffffff; border-bottom:1px solid #2a2a2a;">20 June, 2026 - 17:00 IST</td></tr>
        <tr><td style="color:#9ca3af;">Current Status</td><td style="color:#6b7280; font-weight:bold;">CANCELLED - SEAT FORFEITED</td></tr>
      </table>

      <p style="color:#9ca3af; font-size:13px; line-height:1.6;">Your seat has been computationally released back to the waitlist pool. However, you may remain eligible for subsequent administrative rounds. Please contact the Admissions Office if you require assistance.</p>
    `),
  },
];

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  FYJC MERIT-BASED EMAIL PROOF SENDER             ║");
  console.log("║  Sending 7 Jr. College emails to:", TO, "║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  let sent = 0, failed = 0;
  for (let i = 0; i < EMAILS.length; i++) {
    const e = EMAILS[i];
    console.log(`📧 [${i+1}/7] ${e.subject}`);
    try {
      const info = await transporter.sendMail({ from: FROM, to: TO, subject: e.subject, html: e.html });
      console.log(`   ✅ SENT — ${info.messageId}`);
      sent++;
    } catch (err) {
      console.error(`   ❌ FAILED — ${err.message}`);
      failed++;
    }
    if (i < EMAILS.length - 1) { console.log("   ⏳ 3s..."); await new Promise(r => setTimeout(r, 3000)); }
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`✅ Sent: ${sent}/7 | ❌ Failed: ${failed}/7`);
  console.log(`Total System Emails: 9 (base) + 7 (FYJC) = 16`);
  console.log(`Check inbox: ${TO}`);
  console.log(`═══════════════════════════════════════════`);
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
