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
 * Classgrid — Online vs Physical Mode Email Proof
 * Sends 2 emails: one ONLINE mode, one PHYSICAL mode
 */
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST, port: Number(process.env.BREVO_SMTP_PORT), secure: false,
  auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
});
const FROM = `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`;
const TO = "sunitasubhashsun123@gmail.com";
const LOGO = "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png";
const PLAY = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/270px-Google_Play_Store_badge_EN.svg.png";

function base(title, content) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - Classgrid</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');body,html{margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#0f0f0f;-webkit-font-smoothing:antialiased}h1,h2,h3{color:#fff;margin-top:0;margin-bottom:16px}p{margin:0 0 20px;color:#ccc;font-size:14px;line-height:1.7}strong{color:#fff}a{color:#fff;text-decoration:underline}.box{background:#161616;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px}.box p{margin-bottom:8px;color:#ccc}.box p:last-child{margin-bottom:0}.box .meta{font-size:12px;color:#9ca3af;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}.box .code{font-family:monospace;font-size:24px;color:#fff;letter-spacing:4px;font-weight:bold;display:block;margin-top:8px}</style></head>
<body style="margin:0;padding:0;background:#0f0f0f">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#0f0f0f"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="padding:30px;border-bottom:1px solid #2a2a2a;text-align:center"><img src="${LOGO}" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:6px"><h1 style="color:#fff;margin:0;font-size:20px">${title}</h1></td></tr>
<tr><td style="padding:30px;color:#ccc;font-size:14px;line-height:1.7">${content}</td></tr>
<tr><td style="padding:20px;text-align:center;border-top:1px solid #2a2a2a;color:#7a7a7a;font-size:12px">&copy; 2026 Classgrid. All rights reserved.</td></tr>
</table></td></tr></table></body></html>`;
}

// ═══ SHARED TOP SECTION (identical for both) ═══
const SHARED_TOP = `
  <h1>Welcome to Pune Institute of Computer Technology</h1>
  <p>Dear <strong>Shivam Kotwal</strong>,</p>
  <p>We are pleased to inform you that your admission has been successfully completed. Your fee payment has been received, and your academic credentials have been issued. You are now officially a student of <strong>Computer Engineering</strong> at <strong>Pune Institute of Computer Technology</strong>.</p>

  <h3 style="color:#ffffff; margin-top:28px;">Academic Allotment</h3>
  <div class="box">
    <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
      <tr><td style="color:#9ca3af; width:40%;">Admission Type</td><td style="color:#ffffff; font-weight:600;">CAP Round 1 Allotment</td></tr>
      <tr><td style="color:#9ca3af;">Branch</td><td style="color:#ffffff; font-weight:600;">Computer Engineering (CE6205)</td></tr>
      <tr><td style="color:#9ca3af;">Category</td><td style="color:#ffffff;">SC</td></tr>
      <tr><td style="color:#9ca3af;">Academic Year</td><td style="color:#ffffff;">2026-2027</td></tr>
      <tr><td style="color:#9ca3af;">Division</td><td style="color:#ffffff; font-weight:600;">J</td></tr>
      <tr><td style="color:#9ca3af;">Lab Batch</td><td style="color:#ffffff; font-weight:600;">J-2</td></tr>
    </table>
  </div>

  <div class="box" style="text-align:center; padding:24px; background:#0f0f0f; border:2px solid #34d399;">
    <div class="meta">Your Permanent Registration Number (PRN)</div>
    <span class="code" style="font-size:28px; letter-spacing:8px; color:#34d399;">2026CE-SC-420</span>
    <p style="margin-top:12px; font-size:13px; color:#9ca3af; margin-bottom:0;">This is your official identity across all academic and administrative systems.</p>
  </div>

  <h3 style="color:#ffffff; margin-top:28px;">Payment Receipt</h3>
  <div class="box">
    <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
      <tr><td style="color:#9ca3af; width:40%;">Transaction ID</td><td style="color:#ffffff; font-family:monospace;">pay_OxR4kJ8mQ2pN5v</td></tr>
      <tr><td style="color:#9ca3af;">Amount Paid</td><td style="color:#ffffff; font-weight:600;">₹1,18,500</td></tr>
      <tr><td style="color:#9ca3af;">Fee Category</td><td style="color:#ffffff;">SC Category (Tuition Waiver Applied)</td></tr>
      <tr><td style="color:#9ca3af;">Payment Date</td><td style="color:#ffffff;">14 April, 2026 11:50 PM IST</td></tr>
    </table>
  </div>

  <h3 style="color:#ffffff; margin-top:28px;">Your Official College Email</h3>
  <div class="box" style="text-align:center; padding:24px; background:#0f0f0f; border:2px solid #60a5fa;">
    <div class="meta">Institutional Email Address</div>
    <a href="mailto:shivam.kotwal@pict.edu" style="font-family:monospace; font-size:20px; letter-spacing:2px; color:#60a5fa; text-decoration:none; font-weight:bold;">shivam.kotwal@pict.edu</a>
    <p style="margin-top:12px; font-size:13px; color:#9ca3af; margin-bottom:0;">This email has been provisioned for your academic use. Use it for all official correspondence.</p>
  </div>

  <h3 style="color:#ffffff; margin-top:28px;">Your Login Credentials</h3>
  <div class="box">
    <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
      <tr><td style="color:#9ca3af; width:40%;">Login Email</td><td style="color:#ffffff; font-weight:600;">shivam.kotwal@pict.edu</td></tr>
      <tr><td style="color:#9ca3af;">Password</td><td style="color:#ffffff; font-family:monospace; font-weight:600;">Shivam@2026</td></tr>
    </table>
    <p style="margin-top:16px; margin-bottom:0; font-size:13px; color:#cccccc;">
      Your initial password is the same for the <strong>Classgrid Mobile App</strong>, <strong>Desktop Portal</strong>, and your <strong>Official College Email</strong>. Please note: the Classgrid password and College Email password are managed independently. Changing one will <strong>not</strong> change the other.
    </p>
  </div>

  <div class="box" style="border-left: 3px solid #dc2626;">
    <p style="margin-bottom: 8px; font-weight:600; color:#ffffff;">Security Notice</p>
    <p style="margin-bottom: 0; color:#cccccc;">For the security of your account, you are strongly advised to <strong>change your password immediately</strong> after your first login. Do not share your credentials with anyone. If you suspect unauthorized access, contact the administration desk immediately.</p>
  </div>

  <h3 style="color:#ffffff; margin-top:28px;">Access Your Dashboard</h3>

  <div class="box" style="border-left: 3px solid #3b82f6;">
    <p style="margin-bottom: 8px; font-weight:600; color:#ffffff;">Mobile App</p>
    <p style="margin-bottom:16px; color:#cccccc;">Download the Classgrid App to access your timetable, attendance, results, and all academic services on your phone.</p>
    <div style="text-align:center;">
      <a href="https://play.google.com/store/apps/details?id=com.classgrid.app" style="display:inline-block; text-decoration:none;">
        <table cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
          <tr><td style="padding:10px 20px; text-align:center;">
            <img src="${PLAY}" alt="Get it on Google Play" height="40" style="display:block;">
          </td></tr>
        </table>
      </a>
    </div>
  </div>

  <div class="box" style="border-left: 3px solid #6366f1;">
    <p style="margin-bottom: 8px; font-weight:600; color:#ffffff;">Desktop Portal</p>
    <p style="margin-bottom:16px; color:#cccccc;">For full-screen access to your dashboard, reports, and downloads, log in from your computer.</p>
    <div style="text-align:center;">
      <a href="https://org.classgrid.in" style="background-color: #ffffff; color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size:14px;">Login at org.classgrid.in</a>
    </div>
  </div>
`;

// ═══ ONLINE MODE (digital docs, instant verify) ═══
const ONLINE_FOOTER = `
  <div class="box" style="border-left: 3px solid #34d399; margin-top:28px;">
    <p style="margin-bottom: 8px; font-weight:600; color:#ffffff;">Document Verification Complete</p>
    <p style="margin-bottom: 0; color:#cccccc;">Your documents have been submitted and verified digitally by the administration. No physical document submission is required unless explicitly communicated by the institution.</p>
  </div>
  <p style="margin-top:24px; color:#9ca3af; font-size:13px;">This is a system-generated confirmation and does not require a physical signature.</p>
`;

// ═══ PHYSICAL MODE (must report with originals) ═══
const PHYSICAL_FOOTER = `
  <h3 style="color:#ffffff; margin-top:28px;">Reporting and Document Submission</h3>
  <div class="box">
    <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
      <tr><td style="color:#9ca3af; width:40%;">Reporting Deadline</td><td style="color:#ffffff; font-weight:700;">20 July, 2026</td></tr>
      <tr><td style="color:#9ca3af;">Report To</td><td style="color:#ffffff;">Administration Desk, Pune Institute of Computer Technology</td></tr>
      <tr><td style="color:#9ca3af;">Documents Required</td><td style="color:#ffffff;">All original documents + printed copy of this confirmation</td></tr>
    </table>
  </div>
  <p>Please print this confirmation and carry it with you when you report to the institution along with all your original documents.</p>
  <div class="box" style="border-left: 3px solid #ef4444;">
    <p style="margin-bottom: 8px; font-weight:600; color:#ffffff;">Important Notice</p>
    <p style="margin-bottom: 0; color:#cccccc;">Failure to report to the institution before the specified reporting deadline will result in <strong>automatic cancellation of your admission</strong>. The vacated seat will be offered to the next candidate on the waitlist. No extensions will be granted unless explicitly communicated by the administration.</p>
  </div>
  <p style="margin-top:24px; color:#9ca3af; font-size:13px;">This is a system-generated confirmation and does not require a physical signature.</p>
`;

const EMAILS = [
  {
    subject: "[ONLINE MODE] Admission Confirmation — PICT | Classgrid",
    html: base("Admission Confirmation", SHARED_TOP + ONLINE_FOOTER),
  },
  {
    subject: "[PHYSICAL MODE] Admission Confirmation — PICT | Classgrid",
    html: base("Admission Confirmation", SHARED_TOP + PHYSICAL_FOOTER),
  },
];

async function main() {
  console.log("Sending ONLINE + PHYSICAL mode confirmations to:", TO, "\n");
  for (let i = 0; i < EMAILS.length; i++) {
    const e = EMAILS[i];
    console.log(`[${i+1}/2] ${e.subject}`);
    try {
      const info = await transporter.sendMail({ from: FROM, to: TO, subject: e.subject, html: e.html });
      console.log(`   SENT — ${info.messageId}`);
    } catch (err) { console.error(`   FAILED — ${err.message}`); }
    if (i < EMAILS.length - 1) await new Promise(r => setTimeout(r, 3000));
  }
  console.log("\nDone. Check inbox:", TO);
  process.exit(0);
}
main();
