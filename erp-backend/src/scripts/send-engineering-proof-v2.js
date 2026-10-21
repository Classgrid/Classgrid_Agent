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
 * Classgrid — Engineering College Email Proof (Professional V2)
 * Sends all 6 engineering admission emails to test inbox.
 * Run: node --env-file=.env server/src/scripts/send-engineering-proof-v2.js
 */
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT),
  secure: false,
  auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
});

const FROM = `"${process.env.BREVO_SENDER_NAME || "Classgrid"}" <${process.env.BREVO_SENDER_EMAIL || "support@classgrid.in"}>`;
const TO = "nikhilsubsun321@gmail.com";
const LOGO = "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png";
const PLAY_BADGE = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/270px-Google_Play_Store_badge_EN.svg.png";

function base(title, content) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - Classgrid</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');body,html{margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background-color:#0f0f0f;-webkit-font-smoothing:antialiased}h1,h2,h3{color:#fff;margin-top:0;margin-bottom:16px}p{margin:0 0 20px;color:#ccc;font-size:14px;line-height:1.7}ul{margin:0 0 20px 20px;color:#ccc;font-size:14px;padding:0;line-height:1.7}li{margin-bottom:8px}strong{color:#fff}a{color:#fff;text-decoration:underline}.box{background-color:#161616;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px}.box p{margin-bottom:8px;color:#ccc}.box p:last-child{margin-bottom:0}.box .meta{font-size:12px;color:#9ca3af;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}.box .code{font-family:monospace;font-size:24px;color:#fff;letter-spacing:4px;font-weight:bold;display:block;margin-top:8px}</style></head>
<body style="margin:0;padding:0;background:#0f0f0f">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#0f0f0f;width:100%"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%">
<tr><td style="padding:30px;border-bottom:1px solid #2a2a2a;text-align:center"><img src="${LOGO}" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:6px"><h1 style="color:#fff;margin:0;font-size:20px">${title}</h1></td></tr>
<tr><td style="padding:30px;color:#ccc;font-size:14px;line-height:1.7">${content}</td></tr>
<tr><td style="padding:20px;text-align:center;border-top:1px solid #2a2a2a;color:#7a7a7a;font-size:12px">&copy; 2026 Classgrid. All rights reserved.</td></tr>
</table></td></tr></table></body></html>`;
}

const EMAILS = [
  // ═══ 1/6: OTP VERIFICATION ═══
  {
    subject: "[ENG 1/6] Email Verification — PICT Admission | Classgrid",
    html: base("Email Verification", `
      <h1>Email Verification</h1>
      <p>Dear <strong>Shivam Kotwal</strong>,</p>
      <p>A verification code has been generated for your admission application to <strong>Pune Institute of Computer Technology</strong>. Please enter this code on the application portal to proceed.</p>
      <div class="box" style="text-align:center; padding:24px;">
        <div class="meta">Verification Code</div>
        <span class="code" style="font-size:32px; letter-spacing:8px; color:#ffffff;">847291</span>
        <p style="margin-top:12px; font-size:13px; color:#9ca3af; margin-bottom:0;">This code is valid for <strong style="color:#ffffff;">5 minutes</strong> from the time of this email.</p>
      </div>
      <div class="box" style="border-left: 3px solid #dc2626;">
        <p style="font-weight:600; color:#ffffff; margin-bottom:8px;">Security Notice</p>
        <p style="margin-bottom:0; color:#cccccc;">Do not share this code with anyone. The administration will never ask you for this code via phone or message. If you did not initiate this request, please disregard this email.</p>
      </div>
    `),
  },

  // ═══ 2/6: APPLICATION RECEIVED ═══
  {
    subject: "[ENG 2/6] Application Received — PICT | Classgrid",
    html: base("Application Received — Pune Institute of Computer Technology", `
      <h1>Application Received</h1>
      <p>Dear <strong>Shivam Kotwal</strong>,</p>
      <p>Your admission application for <strong>Pune Institute of Computer Technology</strong> has been successfully submitted and is now under review by the administration desk.</p>
      <div class="box">
        <div class="meta">Application Summary</div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
          <tr><td style="color:#9ca3af; width:40%;">Application No</td><td style="color:#ffffff; font-family:monospace;">APP-PICT-2026-00421</td></tr>
          <tr><td style="color:#9ca3af;">Course / Branch</td><td style="color:#ffffff;">Computer Engineering</td></tr>
          <tr><td style="color:#9ca3af;">Submission Date</td><td style="color:#ffffff;">14 April, 2026 11:45 PM IST</td></tr>
        </table>
      </div>
      <div class="box" style="border-left: 3px solid #6366f1;">
        <p style="font-weight:600; color:#ffffff; margin-bottom:12px;">What happens next</p>
        <p style="margin-bottom: 8px; color:#cccccc;">1. The administration desk will review and verify your uploaded documents.</p>
        <p style="margin-bottom: 8px; color:#cccccc;">2. You will receive an email notification once your documents are approved or if corrections are required.</p>
        <p style="margin-bottom: 0; color:#cccccc;">3. Upon approval, you will be required to complete the admission fee payment within the stipulated deadline to secure your seat.</p>
      </div>
      <p style="font-size:13px; color:#9ca3af; margin-top:24px;">You can track the status of your application by logging in to the admission portal at any time.</p>
    `),
  },

  // ═══ 3/6: PRN & DIVISION ALLOTMENT (CET Auto-Bypass) ═══
  {
    subject: "[ENG 3/6] Official PRN and Division Allotment — PICT | Classgrid",
    html: base("Official PRN and Division Allotment", `
      <h1>Academic Allotment — Computer Engineering</h1>
      <p>Dear <strong>Shivam Kotwal</strong>,</p>
      <p>Your application and documents have been successfully processed by <strong>Pune Institute of Computer Technology</strong>. Your official academic provisions are now ready.</p>
      <div class="box" style="text-align:center; padding:24px;">
        <div class="meta">Your Permanent Registration Number (PRN)</div>
        <span class="code" style="font-size:26px; letter-spacing:6px; color:#34d399;">2026CE-SC-420</span>
      </div>
      <div class="box">
        <div class="meta">Allotment Details</div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
          <tr><td style="color:#9ca3af; width:40%;">Branch</td><td style="color:#ffffff; font-weight:600;">Computer Engineering</td></tr>
          <tr><td style="color:#9ca3af;">Admitted Category</td><td style="color:#ffffff;">SC (Seat: CAP)</td></tr>
          <tr><td style="color:#9ca3af;">Division</td><td style="color:#ffffff; font-weight:600;">J</td></tr>
          <tr><td style="color:#9ca3af;">Lab Batch</td><td style="color:#ffffff; font-weight:600;">J-2</td></tr>
        </table>
      </div>
      <div class="box" style="border-left: 3px solid #f59e0b;">
        <p style="margin-bottom: 8px; font-weight:600; color:#ffffff;">Action Required: Fee Payment</p>
        <p>To officially confirm this seat, you must complete your category-adjusted fee payment within the stipulated deadline. Failure to pay before the deadline will result in automatic forfeiture of this allotment.</p>
        <p style="margin-bottom:0;">Login to the admission portal using your PRN as your Login ID to complete the payment.</p>
      </div>
      <div style="text-align:center; margin: 30px 0;">
        <a href="https://org.classgrid.in" style="background-color: #ffffff; color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size:14px;">Login to Admission Portal</a>
      </div>
    `),
  },

  // ═══ 4/6: DOCUMENT REJECTED ═══
  {
    subject: "[ENG 4/6] Application — Correction Required | Classgrid",
    html: base("Application — Correction Required", `
      <h1>Application — Correction Required</h1>
      <p>Dear <strong>Shivam Kotwal</strong>,</p>
      <p>The administration desk at <strong>Pune Institute of Computer Technology</strong> has reviewed your application and found discrepancies or issues with the submitted documents. Your application cannot proceed until these are resolved.</p>
      <div class="box" style="border-left: 3px solid #ef4444;">
        <div class="meta">Reason for Return</div>
        <p style="color:#ffffff; font-weight: 500;">Uploaded Aadhar Card image is blurry and unreadable. Please re-upload a clear scan or photograph of both sides of your Aadhar Card.</p>
      </div>
      <div class="box" style="border-left: 3px solid #6366f1;">
        <p style="font-weight:600; color:#ffffff; margin-bottom:8px;">Required Action</p>
        <p style="margin-bottom:8px; color:#cccccc;">1. Login to the admission portal using your registered credentials.</p>
        <p style="margin-bottom:8px; color:#cccccc;">2. Navigate to the flagged section and upload the corrected documents.</p>
        <p style="margin-bottom:0; color:#cccccc;">3. Re-submit your application before the deadline to retain your eligibility.</p>
      </div>
      <div style="text-align:center; margin: 30px 0;">
        <a href="https://org.classgrid.in" style="background-color: #ffffff; color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size:14px;">Login to Admission Portal</a>
      </div>
      <p style="font-size:14px; color:#ef4444;">Note: Failure to rectify and re-submit before the deadline may result in the cancellation of your application.</p>
    `),
  },

  // ═══ 5/6: FEE RECEIPT ═══
  {
    subject: "[ENG 5/6] Admission Fee Receipt — ₹1,18,500 | Classgrid",
    html: base("Admission Fee Receipt", `
      <h1>Fee Payment Receipt</h1>
      <p>Dear <strong>Shivam Kotwal</strong>,</p>
      <p>We are pleased to confirm that your admission fee for <strong>Pune Institute of Computer Technology</strong> has been successfully received and processed.</p>
      <div class="box">
        <div class="meta">Transaction Summary</div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
          <tr><td style="color:#9ca3af; width:40%;">Receipt No</td><td style="color:#ffffff; font-family:monospace;">RCPT-PICT-2026-0421</td></tr>
          <tr><td style="color:#9ca3af;">Amount Paid</td><td style="color:#ffffff; font-weight:600;">₹1,18,500</td></tr>
          <tr><td style="color:#9ca3af;">Payment Date</td><td style="color:#ffffff;">14 April, 2026 11:50 PM IST</td></tr>
          <tr><td style="color:#9ca3af;">Transaction ID</td><td style="color:#ffffff; font-family:monospace;">pay_OxR4kJ8mQ2pN5v</td></tr>
        </table>
      </div>
      <div class="box" style="border-left: 3px solid #34d399;">
        <p style="font-weight:600; color:#ffffff; margin-bottom:8px;">Enrollment Status: Confirmed</p>
        <p style="margin-bottom:0;">Your admission fee has been recorded. You will receive a separate confirmation email with your login credentials and academic details once the final allotment process is complete.</p>
      </div>
      <p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">This is a system-generated receipt and does not require a physical signature. Please retain this email for your records.</p>
    `),
  },

  // ═══ 6/6: FINAL ADMISSION CONFIRMATION (THE BIG ONE) ═══
  {
    subject: "[ENG 6/6] Admission Confirmation — PICT | Classgrid",
    html: base("Admission Confirmation", `
      <h1>Welcome to Pune Institute of Computer Technology</h1>
      <p>Dear <strong>Shivam Kotwal</strong>,</p>
      <p>We are pleased to inform you that your admission has been successfully completed. Your fee payment has been received, and your academic credentials have been issued. You are now officially a student of <strong>Computer Engineering</strong> at <strong>Pune Institute of Computer Technology</strong>.</p>

      <h3 style="color:#ffffff; margin-top:28px;">Academic Allotment</h3>
      <div class="box">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
          <tr><td style="color:#9ca3af; width:40%;">Branch</td><td style="color:#ffffff; font-weight:600;">Computer Engineering (CE6205)</td></tr>
          <tr><td style="color:#9ca3af;">Category</td><td style="color:#ffffff;">SC</td></tr>
          <tr><td style="color:#9ca3af;">Academic Year</td><td style="color:#ffffff;">2026-2027</td></tr>
          <tr><td style="color:#9ca3af;">Division</td><td style="color:#ffffff; font-weight:600;">J</td></tr>
          <tr><td style="color:#9ca3af;">Lab Batch</td><td style="color:#ffffff; font-weight:600;">J-2</td></tr>
        </table>
      </div>

      <div class="box" style="text-align:center; padding:24px;">
        <div class="meta">Your Permanent Registration Number (PRN)</div>
        <span class="code" style="font-size:26px; letter-spacing:6px; color:#34d399;">2026CE-SC-420</span>
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
      <div class="box" style="text-align:center; padding:24px;">
        <div class="meta">Institutional Email Address</div>
        <span class="code" style="font-size:18px; letter-spacing:2px; color:#60a5fa;">shivam.kotwal@pict.edu</span>
        <p style="margin-top:12px; font-size:13px; color:#9ca3af; margin-bottom:0;">This email has been provisioned for your academic use. Use it for all official correspondence.</p>
      </div>

      <h3 style="color:#ffffff; margin-top:28px;">Your Login Credentials</h3>
      <div class="box">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#cccccc;">
          <tr><td style="color:#9ca3af; width:40%;">Login ID (PRN)</td><td style="color:#ffffff; font-weight:600; font-family:monospace;">2026CE-SC-420</td></tr>
          <tr><td style="color:#9ca3af;">Password</td><td style="color:#ffffff;">Shivam@2026 (Set by you during registration)</td></tr>
        </table>
        <p style="margin-top:16px; margin-bottom:0; font-size:13px; color:#cccccc;">
          These credentials are shared across both the <strong>Classgrid Mobile App</strong> and the <strong>Desktop Portal</strong>, as well as your <strong>Official College Email</strong>.
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
                <img src="${PLAY_BADGE}" alt="Get it on Google Play" height="40" style="display:block;">
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

      <h3 style="color:#ffffff; margin-top:28px;">Document Submission</h3>
      <p>Attached to this email is your Official Admission Confirmation document. Please print it and submit a physical copy along with your original documents to the Administration Desk before the reporting deadline specified by your institution.</p>
      <p style="margin-top:24px; color:#9ca3af; font-size:13px;">This is a system-generated confirmation and does not require a physical signature.</p>
    `),
  },
];

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║  ENGINEERING COLLEGE — PROFESSIONAL EMAIL PROOF    ║");
  console.log("║  Sending 6 emails to:", TO, "    ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  let sent = 0, failed = 0;
  for (let i = 0; i < EMAILS.length; i++) {
    const e = EMAILS[i];
    console.log(`[${i+1}/6] ${e.subject}`);
    try {
      const info = await transporter.sendMail({ from: FROM, to: TO, subject: e.subject, html: e.html });
      console.log(`   SENT — ${info.messageId}`);
      sent++;
    } catch (err) {
      console.error(`   FAILED — ${err.message}`);
      failed++;
    }
    if (i < EMAILS.length - 1) { await new Promise(r => setTimeout(r, 3000)); }
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`Sent: ${sent}/6 | Failed: ${failed}/6`);
  console.log(`Check inbox: ${TO}`);
  console.log(`═══════════════════════════════════════════`);
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
