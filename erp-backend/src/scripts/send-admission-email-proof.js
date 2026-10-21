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
 * Classgrid — Admission Email Proof Sender
 * Sends ALL 9 admission pipeline emails to a test inbox.
 * Run: node --env-file=.env src/scripts/send-admission-email-proof.js
 */

import nodemailer from "nodemailer";

// ─── SMTP Config (from .env) ──────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

const FROM = `"${process.env.BREVO_SENDER_NAME || "Classgrid"}" <${process.env.BREVO_SENDER_EMAIL || "support@classgrid.in"}>`;
const TO = "nikhilsubsun123@gmail.com";

const PLATFORM_LOGO_URL = "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png";

// ─── Base Template (exact copy from email-templates.service.js) ────
function baseTemplate({ content, title = "Notification", ignoreText = null }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Classgrid</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body, html {
      margin: 0; padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f0f0f;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3 { color: #ffffff; margin-top: 0; margin-bottom: 16px; }
    p { margin: 0 0 20px; color: #cccccc; font-size: 14px; line-height: 1.7; }
    ul { margin: 0 0 20px 20px; color: #cccccc; font-size: 14px; padding: 0; line-height: 1.7; }
    li { margin-bottom: 8px; }
    strong { color: #ffffff; }
    a { color: #ffffff; text-decoration: underline; }
    .btn {
      display: inline-block; background-color: #ffffff; color: #000000 !important;
      text-decoration: none; padding: 12px 28px; border-radius: 6px;
      font-size: 14px; font-weight: bold; margin: 10px 0; text-align: center;
    }
    .btn-danger { background-color: #dc2626; color: #ffffff !important; }
    .box {
      background-color: #161616; border: 1px solid #2a2a2a; border-radius: 8px;
      padding: 20px; margin-bottom: 24px;
    }
    .box p { margin-bottom: 8px; color: #cccccc; }
    .box p:last-child { margin-bottom: 0; }
    .box .meta {
      font-size: 12px; color: #9ca3af; margin-bottom: 8px;
      text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
    }
    .box .code {
      font-family: monospace; font-size: 24px; color: #ffffff;
      letter-spacing: 4px; font-weight: bold; display: block; margin-top: 8px;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#0f0f0f;width:100%;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%;">

<tr>
<td style="padding:30px;border-bottom:1px solid #2a2a2a;text-align:center;">
<img src="${PLATFORM_LOGO_URL}" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:6px;">
<h1 style="color:#ffffff;margin:0;font-size:20px;">${title}</h1>
</td>
</tr>

<tr>
<td style="padding:30px;color:#cccccc;font-size:14px;line-height:1.7;">

${content}

<div style="margin-top:30px;">
<p style="color:#9ca3af;font-size:13px;margin:0;">

</p>
</div>

</td>
</tr>

<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #2a2a2a;color:#7a7a7a;font-size:12px;">
${ignoreText ? `<p style="margin-bottom:12px;color:#7a7a7a;font-size:12px;">${ignoreText}</p>` : ""}
© 2026 Classgrid. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
}

// ──────────────────────────────────────────────────────
// ALL 9 EMAILS
// ──────────────────────────────────────────────────────

const EMAILS = [
  // ═══ EMAIL 1: OTP VERIFICATION (Stage 1 — ALL) ═══
  {
    subject: "[1/9] Admission Email Verification | Classgrid",
    html: baseTemplate({
      title: "Admission Email Verification",
      content: `
        <h1>Verify your Email Address</h1>
        <p>Hi <strong>Shivam Kotwal</strong>,</p>
        <p>We received a request to verify your email for your admission application to <strong>Pune Institute of Computer Technology</strong>.</p>
        <div class="box" style="text-align:center; margin: 24px 0;">
          <div class="meta">Your Verification Code</div>
          <span class="code" style="font-size:32px; letter-spacing:8px; color:#ffffff;">847291</span>
          <p style="margin-top:12px; font-size:13px; color:#9ca3af;">This code expires in <strong style="color:#ffffff;">5 minutes</strong>.</p>
        </div>
        <p style="color:#9ca3af; font-size:13px;">If you did not initiate this application, you can safely ignore this email.</p>
      `,
      ignoreText: "If you did not initiate this, safely ignore this email."
    }),
  },

  // ═══ EMAIL 2: APPLICATION RECEIVED (Stage 2 — ALL) ═══
  {
    subject: "[2/9] Application Received — PICT | Classgrid",
    html: baseTemplate({
      title: "Application Received — Pune Institute of Computer Technology",
      content: `
        <h1>Application Submitted Successfully 📩</h1>
        <p>Dear <strong>Shivam Kotwal</strong>,</p>
        <p>Your admission application form for <strong>Pune Institute of Computer Technology</strong> has been successfully submitted and is now under review by the administration.</p>
        <div class="box">
          <div class="meta">Application Summary</div>
          <p><strong>Application No:</strong> <span style="font-family: monospace; font-size: 16px; color: #3b82f6;">APP-PICT-2026-00421</span></p>
          <p><strong>Course/Branch Applied:</strong> Computer Engineering</p>
          <p><strong>Submission Date:</strong> 14 April, 2026 11:45 PM IST</p>
        </div>
        <div class="box" style="border-left: 3px solid #6366f1;">
          <p style="margin-bottom: 8px;"><strong>🔍 What happens next?</strong></p>
          <p style="margin-bottom: 8px;">1. The administration desk will verify your uploaded documents.</p>
          <p style="margin-bottom: 8px;">2. You will receive an email update regarding document approval or rejection.</p>
          <p style="margin-bottom: 0;">3. If approved, you will be requested to pay the official admission fee to secure your seat.</p>
        </div>
      `,
    }),
  },

  // ═══ EMAIL 3: DOCS APPROVED → PAY FEE (Stage 4 — School/Jr.College/Coaching) ═══
  {
    subject: "[3/9] Documents Approved — Pay Fee Now | Classgrid",
    html: baseTemplate({
      title: "Application Approved — Action Required",
      content: `
        <h1>🟢 Documents Verified & Approved</h1>
        <p>Dear <strong>Arjun Mehta</strong>,</p>
        <p>Great news! The administration desk at <strong>Sunrise Public School</strong> has successfully reviewed and verified your admission application and documents.</p>
        <div class="box" style="border-left: 3px solid #f59e0b;">
          <p style="margin-bottom: 8px;"><strong>⚠️ Action Required: Fee Payment</strong></p>
          <p>To officially confirm your seat for <strong>Class 11 (Science)</strong>, you must complete your fee payment within the stipulated deadline.</p>
          <p>Total Fee Payable: <strong>₹45,000</strong></p>
        </div>
        <div style="text-align:center; margin: 30px 0;">
          <a href="https://classgrid.in" style="background-color: #ffffff; color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Proceed to Payment
          </a>
        </div>
        <p style="margin-top:20px; font-size:14px; color:#ef4444;">
          Note: Failure to pay the fees before the deadline will result in automatic cancellation of your verified seat.
        </p>
      `,
    }),
  },

  // ═══ EMAIL 4: DOCS REJECTED → RECTIFY (Stage 4 — ALL) ═══
  {
    subject: "[4/9] Application Correction Required | Classgrid",
    html: baseTemplate({
      title: "Application Update — Correction Required",
      content: `
        <h1>🔴 Application Requires Correction</h1>
        <p>Dear <strong>Shivam Kotwal</strong>,</p>
        <p>The administration desk at <strong>Pune Institute of Computer Technology</strong> has reviewed your application but found discrepancies or invalid documents.</p>
        <div class="box" style="border-left: 3px solid #ef4444;">
          <div class="meta">Rejection Reason</div>
          <p style="color:#ffffff; font-weight: 500;">Uploaded Aadhar Card image is blurry and unreadable. Please re-upload a clear scan or photo of both sides of your Aadhar Card.</p>
        </div>
        <p style="margin-bottom: 24px;">Please login to your admission portal immediately to rectify the errors and re-submit your application before the deadline.</p>
        <div style="text-align:center; margin: 30px 0;">
          <a href="https://classgrid.in" style="background-color: #ffffff; color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Login & Rectify
          </a>
        </div>
      `,
    }),
  },

  // ═══ EMAIL 5: PRN + DIVISION (Stage 4 Auto — Engineering) ═══
  {
    subject: "[5/9] Official PRN & Division Allotment — Engineering | Classgrid",
    html: baseTemplate({
      title: "Official PRN & Division Allotment",
      content: `
        <h1>Welcome to Computer Engineering</h1>
        <p>Dear <strong>Shivam Kotwal</strong>,</p>
        <p>Your application and documents have been successfully processed. Your official academic provisions and credentials for <strong>Pune Institute of Computer Technology</strong> are now ready.</p>
        <div class="box">
          <div class="meta">Official Academic Allotment</div>
          <p><strong>Permanent Registration No (PRN):</strong> <span style="font-family: monospace; font-size: 16px; color: #3b82f6;">2026CE-SC-420</span></p>
          <p><strong>Admitted Category:</strong> SC (Seat: CAP)</p>
          <p><strong>Division:</strong> J</p>
          <p><strong>Lab Batch:</strong> J-2</p>
        </div>
        <div class="box" style="border-left: 3px solid #f59e0b;">
          <p style="margin-bottom: 8px;"><strong>⚠️ Action Required: Fee Payment</strong></p>
          <p>To officially confirm this seat, you must complete your category-adjusted fee payment within the stipulated deadline.</p>
          <p>Login to the admission portal using your PRN to complete the checkout.</p>
        </div>
      `,
    }),
  },

  // ═══ EMAIL 6: FEE RECEIPT (Stage 5 — ALL) ═══
  {
    subject: "[6/9] Admission Fee Receipt — ₹1,18,500 | Classgrid",
    html: baseTemplate({
      title: "Admission Fee Receipt",
      content: `
        <h1>Fee Payment Receipt</h1>
        <p>Dear <strong>Shivam Kotwal</strong>,</p>
        <p>We are pleased to confirm that your admission fee for <strong>Pune Institute of Computer Technology</strong> has been successfully received.</p>
        <div class="box">
          <div class="meta">Receipt Details</div>
          <p><strong>Receipt No:</strong> RCPT-PICT-2026-0421</p>
          <p><strong>Amount Paid:</strong> ₹1,18,500</p>
          <p><strong>Payment Date:</strong> 14 April, 2026 11:50 PM IST</p>
          <p><strong>Transaction ID:</strong> pay_OxR4kJ8mQ2pN5v</p>
        </div>
        <div class="box" style="border-left: 3px solid #34d399;">
          <p><strong>Enrollment Status:</strong> Confirmed 🎉</p>
          <p>Your admission is now finalized. You can access your student dashboard using your registered phone/email.</p>
        </div>
        <p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">This is a computer-generated receipt and does not require a physical signature.</p>
      `,
    }),
  },

  // ═══ EMAIL 7: FINAL — ENGINEERING (Stage 6) ═══
  {
    subject: "[7/9] 🟢 OFFICIAL ADMISSION CONFIRMED — Engineering | Classgrid",
    html: baseTemplate({
      title: "Final Admission Confirmation",
      content: `
        <h1>🟢 OFFICIAL ADMISSION CONFIRMED</h1>
        <p>Dear <strong>Shivam Kotwal</strong>,</p>
        <p>Congratulations! Your fee payment has been successfully received, and your admission to <strong>Pune Institute of Computer Technology</strong> is now <strong>100% CONFIRMED</strong>.</p>

        <h3 style="color:#ffffff; margin-top:24px;">🏛️ Academic Allotment Details</h3>
        <ul style="padding-left:20px;">
          <li><strong>Branch Allotted:</strong> Computer Engineering (Choice Code: CE6205)</li>
          <li><strong>Admitted Category:</strong> SC</li>
          <li><strong>Academic Year:</strong> 2026-2027</li>
          <li><strong>Division:</strong> J</li>
          <li><strong>Lab Batch:</strong> J-2</li>
          <li><strong>PRN:</strong> <span style="color:#34d399;">2026CE-SC-420</span></li>
        </ul>

        <h3 style="color:#ffffff; margin-top:24px;">💳 Transaction Receipt</h3>
        <ul style="padding-left:20px;">
          <li><strong>Razorpay ID:</strong> pay_OxR4kJ8mQ2pN5v</li>
          <li><strong>Total Fee Paid:</strong> ₹1,18,500 (SC Category Tuition Waiver Applied)</li>
          <li><strong>Payment Date:</strong> 14 April, 2026 11:50 PM IST</li>
        </ul>

        <div class="box" style="margin-top:24px; border-left: 3px solid #3b82f6;">
          <p style="margin-bottom: 8px;"><strong>📱 Next Steps: Download Classgrid</strong></p>
          <p>Your ERP account is active. Download the Classgrid App on your phone.</p>
          <p><strong>Login ID:</strong> 2026CE-SC-420</p>
          <p style="margin-bottom: 0;"><strong>Password:</strong> Shivam@2026 (Set by you during registration)</p>
        </div>

        <p style="margin-top:24px; font-size:14px; color:#9ca3af;">
          <strong>📄 Final Document Submission:</strong> Attached to this email is your Official Admission Confirmation PDF. Please print it and submit it along with your physical original documents to the Admin Desk before the reporting deadline.
        </p>
      `,
    }),
  },

  // ═══ EMAIL 8: FINAL — SCHOOL / JR. COLLEGE (Stage 6) ═══
  {
    subject: "[8/9] Registration Confirmed — School/Jr.College | Classgrid",
    html: baseTemplate({
      title: "Registration Confirmed",
      content: `
        <h1>Welcome to Sunrise Public School</h1>
        <p>Dear Parent/Guardian of <strong>Arjun Mehta</strong>,</p>
        <p>We are delighted to confirm that your ward's admission for the academic year <strong>2026-2027</strong> has been successfully completed.</p>
        <div class="box">
          <div class="meta">Enrollment Details</div>
          <p><strong>Student Name:</strong> Arjun Mehta</p>
          <p><strong>Grade/Standard:</strong> Class 5</p>
          <p><strong>Division:</strong> Div A</p>
          <p><strong>Roll/Registration No:</strong> <span style="font-family: monospace; font-size: 16px; color: #3b82f6;">SPS-2026-0089</span></p>
        </div>
        <div class="box" style="border-left: 3px solid #34d399;">
          <p style="margin-bottom: 8px;"><strong>📱 Parent Portal Access</strong></p>
          <p>Please download the Classgrid App to track attendance, timetable, and fees.</p>
          <p><strong>Login Phone:</strong> +91 98765 43210</p>
          <p style="margin-bottom: 0;">Use the 'Login with OTP' feature on your phone to instantly access the dashboard.</p>
        </div>
      `,
    }),
  },

  // ═══ EMAIL 9: FINAL — COACHING (Stage 6) ═══
  {
    subject: "[9/9] Batch Enrollment Complete — Coaching | Classgrid",
    html: baseTemplate({
      title: "Batch Enrollment Complete",
      content: `
        <h1>You are Enrolled: JEE Advanced Target 2027</h1>
        <p>Hi <strong>Riya Sharma</strong>,</p>
        <p>Your enrollment at <strong>Resonance Coaching</strong> is confirmed. Let's get to work.</p>
        <div class="box" style="border-left: 3px solid #a855f7;">
          <div class="meta">Course Details</div>
          <p><strong>Course/Batch:</strong> JEE Advanced Target 2027</p>
          <p><strong>Target Exam:</strong> JEE Advanced</p>
          <p><strong>Student ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #3b82f6;">RES-JEE-2026-0842</span></p>
        </div>
        <p style="margin-top:20px; font-size:14px; color:#9ca3af;">
          Download the Classgrid App to access your upcoming tests, video lectures, and live schedule.
        </p>
      `,
    }),
  },
];

// ──────────────────────────────────────────────────────
// SEND ALL 9 EMAILS — with 3 second delay between each
// ──────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  CLASSGRID ADMISSION EMAIL PROOF SENDER      ║");
  console.log("║  Sending all 9 emails to:", TO, "  ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < EMAILS.length; i++) {
    const email = EMAILS[i];
    console.log(`📧 [${i + 1}/9] Sending: ${email.subject}`);

    try {
      const info = await transporter.sendMail({
        from: FROM,
        to: TO,
        subject: email.subject,
        html: email.html,
      });
      console.log(`   ✅ SENT — MessageId: ${info.messageId}`);
      sent++;
    } catch (err) {
      console.error(`   ❌ FAILED — ${err.message}`);
      failed++;
    }

    // 3 second gap between emails to avoid rate limiting
    if (i < EMAILS.length - 1) {
      console.log("   ⏳ Waiting 3 seconds...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log(`✅ Sent: ${sent}/9 | ❌ Failed: ${failed}/9`);
  console.log("Check your inbox: nikhilsubsun123@gmail.com");
  console.log("═══════════════════════════════════════════════");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
