// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * ðŸš¨ CRITICAL AI & SYSTEM RULE ðŸš¨
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
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ CRITICAL AI AND SYSTEM RULES ðŸš¨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

/*
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ NAMING CONVENTION RULE ðŸš¨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

/*
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ HOSTING & ARCHITECTURE RULE ðŸš¨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

/**
 * Classgrid - Minimalist Transactional Email Templates
 *
 * CRITICAL RULE: DO NOT ADD <h1> OR ANY LARGE HEADINGS TO EMAIL TEMPLATES.
 * The Classgrid design system requires all emails to rely solely on the Classgrid Logo at the top.
 * Adding huge static or dynamic headings (e.g. <h1>Re: Subject</h1> or <h1>Welcome</h1>) is COMPLETELY BANNED.
 * This applies to all human developers and AI agents.
 */

const getFrontendUrl = () => {
  return process.env.FRONTEND_URL?.trim() || (process.env.NODE_ENV === "production" ? "https://app.classgrid.in" : "https://app.classgrid.in");
};

const PLATFORM_LOGO_URL = "https://cdn.classgrid.in/Classgrid.png";

const providerConfig = {
  manual: { name: "Email & Password" },
  google: { name: "Google" },
  github: { name: "GitHub" },
  facebook: { name: "Facebook" }
};

const formatDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Kolkata", timeZoneName: "short",
  });
};

export const baseTemplate = ({ content, title = "Notification", ignoreText = null }) => {
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
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3 { 
      color: #111111; 
      margin-top: 0; 
      margin-bottom: 16px;
    }
    p { 
      margin: 0 0 20px; 
      color: #374151; 
      font-size: 14px; 
      line-height: 1.7; 
    }
    ul { 
      margin: 0 0 20px 20px; 
      color: #374151; 
      font-size: 14px; 
      padding: 0; 
      line-height: 1.7; 
    }
    li { margin-bottom: 8px; }
    strong { color: #111111; }
    a { color: #111111; text-decoration: underline; }
    
    .btn {
      display: inline-block;
      background-color: #111111;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      margin: 10px 0;
      text-align: center;
    }
    .btn-danger {
      background-color: #dc2626;
      color: #ffffff !important;
    }
    .box {
      background-color: #f9f9f9;
      border: 1px solid #eaeaea;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .box p { margin-bottom: 8px; color: #374151; }
    .box p:last-child { margin-bottom: 0; }
    .box .meta {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .box .code {
      font-family: monospace;
      font-size: 24px;
      color: #111111;
      letter-spacing: 4px;
      font-weight: bold;
      display: block;
      margin-top: 8px;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;" class="wrapper">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;width:100%;" class="wrapper">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%;" class="container">

<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;" class="header">
<img src="${PLATFORM_LOGO_URL}" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
</td>
</tr>

<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;" class="content">

${content}

<div style="margin-top:30px;">

</div>

</td>
</tr>

<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;color:#9ca3af;font-size:12px;" class="footer footer-text">
${ignoreText ? `<p style="margin-bottom:12px;color:#9ca3af;font-size:12px;" class="footer-text">${ignoreText}</p>` : ''}
&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
};

// ------------- FACULTY WELCOME EMAIL -------------
export const getFacultyWelcomeEmailHtml = (userName, orgName, dashboardUrl) => {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;">

<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
<img src="${PLATFORM_LOGO_URL}" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">>
<p style="color:#6b7280;margin-top:8px;font-size:13px;">
Organization: <strong style="color:#111111;">${orgName}</strong>
</p>
</td>
</tr>

<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;">

<p>Hi <strong>${userName}</strong>,</p>

<p>Your faculty account has been successfully created. You're now ready to manage classrooms, deliver structured academic content, and engage students professionally.</p>

<h3 style="color:#111111;">Structured Content Delivery</h3>
<ul style="padding-left:20px;">
<li style="margin-bottom:6px;">Upload PDFs, documents, and study material to specific classrooms</li>
<li style="margin-bottom:6px;">Control student contributions through approval workflows</li>
<li style="margin-bottom:6px;">Notes remain isolated within your organization</li>
<li style="margin-bottom:6px;">Files securely stored via Supabase with signed URLs</li>
</ul>

<h3 style="color:#111111;margin-top:25px;">Smart Attendance (Pro Plan)</h3>
<ul style="padding-left:20px;">
<li style="margin-bottom:6px;">Start/stop attendance sessions inside classroom</li>
<li style="margin-bottom:6px;">Daily, weekly, and monthly attendance reports</li>
<li style="margin-bottom:6px;">Students track their attendance history</li>
</ul>

<h3 style="color:#111111;margin-top:25px;">Real-Time Classroom Chat</h3>
<ul style="padding-left:20px;">
<li style="margin-bottom:6px;">Live academic discussions</li>
<li style="margin-bottom:6px;">Faculty moderation tools</li>
<li style="margin-bottom:6px;">Online activity visibility</li>
</ul>

<div style="text-align:center;margin:30px 0;">
<a href="${dashboardUrl}" style="background:#000000;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
Go to Dashboard
</a>
</div>



</td>
</tr>

<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;color:#9ca3af;font-size:12px;">
&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
};

// ------------- STUDENT WELCOME EMAIL -------------
export const getStudentWelcomeEmailHtml = (userName, dashboardUrl) => {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;">

<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
<img src="${PLATFORM_LOGO_URL}" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">>
<p style="color:#6b7280;margin-top:8px;font-size:13px;">
Ready to start your academic journey
</p>
</td>
</tr>

<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;">

<p>Hi <strong>${userName}</strong>,</p>

<p>Your account has been successfully created. You're now ready to begin your academic journey with Classgrid.</p>

<h3 style="color:#111111;">How to Join Your Organization</h3>
<ul style="padding-left:20px;">
<li style="margin-bottom:6px;">Enter your <strong>Honor Code</strong> to join your institution directly.</li>
<li style="margin-bottom:6px;">Or enter a <strong>Classroom Code</strong> provided by your subject faculty. Joining just one classroom automatically links you to the entire organization.</li>
<li style="margin-bottom:6px;">Once linked, you can browse and request to join other classrooms within your organization, or join them instantly using a code (no request needed).</li>
<li style="margin-bottom:6px;">You are managed by your organization. You cannot leave, browse, or request to join other organizations.</li>
</ul>

<h3 style="color:#111111;margin-top:25px;">What You Can Do</h3>
<ul style="padding-left:20px;">
<li style="margin-bottom:6px;">Access faculty-uploaded notes, classroom announcements, and quizzes (including Google Form links) instantly</li>
<li style="margin-bottom:6px;">Upload your notes to the dedicated student section and share knowledge across your organization</li>
<li style="margin-bottom:6px;">Notes require organization admin approval before visibility</li>
<li style="margin-bottom:6px;">All content is isolated within your organization</li>
<li style="margin-bottom:6px;">View your attendance history and participation (pro plan feature)</li>
<li style="margin-bottom:6px;">Participate in real-time classroom chat</li>
</ul>

<div style="text-align:center;margin:30px 0;">
<a href="${dashboardUrl}" style="background:#000000;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
Join Classroom
</a>
</div>



</td>
</tr>

<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;color:#9ca3af;font-size:12px;">
&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
};

// ------------- LOGIN NOTIFICATION -------------
export const getLoginNotificationHtml = (user, provider = "manual") => {
  const config = providerConfig[provider] || providerConfig.manual;
  const content = `
    <p>Hi ${user.name},</p>
    <p>We noticed a new sign-in to your Classgrid account (${user.email}) on ${formatDate()} using ${config.name}.</p>
    <a href="${getFrontendUrl()}/reset-password" class="btn btn-danger">Secure My Account</a>
  `;
  return baseTemplate({
    content,
    title: "New Login Detected",
    ignoreText: "If this was you, you can safely ignore this email."
  });
};

// ------------- VERIFICATION EMAIL -------------
export const getVerificationEmailHtml = (name, verifyLink) => {
  const content = `
    <p>Hi ${name},</p>
    <p>Please verify your email address to complete your setup. This link expires in 24 hours.</p>
    <a href="${verifyLink}" class="btn">Verify Email</a>
  `;
  return baseTemplate({
    content,
    title: "Verify your email",
    ignoreText: "If you did not sign up for Classgrid, please ignore this email."
  });
};

// ------------- PASSWORD RESET -------------
export const getPasswordResetEmailHtml = (resetLink) => {
  const content = `
    <p>We received a request to reset the password for your Classgrid account. This link expires in <strong>5 minutes</strong>.</p>
    <a href="${resetLink}" class="btn">Reset Password</a>
    <p style="margin-top:20px;font-size:13px;color:#6b7280;">If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `;
  return baseTemplate({
    content,
    title: "Password Reset",
    ignoreText: "If you did not request this, please ignore this email. Your password will remain unchanged."
  });
};

// ------------- FACULTY INVITE -------------
export const getFacultyInviteEmailHtml = (facultyName, orgName, verifyLink, orgCode = null, adminName = "Admin", adminEmail = "") => {
  const codeHtml = orgCode ? `
    <div style="background: #ffffff; color: #111111; margin-bottom: 24px; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
      <div style="color: #111111; font-weight: 600; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Faculty Organization Code</div>
      <div style="color: #111111; font-size: 24px; font-weight: 700; background: #f9f9f9; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #eaeaea; font-family: monospace; letter-spacing: 4px;">${orgCode}</div>
      <p style="margin: 12px 0 0; font-size: 13px; color: #111111;"><strong style="color: #111111;">MANDATORY:</strong> You will be required to enter this code after verifying your email and setting your password to officially join the organization.</p>
    </div>
  ` : '';

  const content = `
    <p>Hi ${facultyName},</p>
    <p>You have been invited by <strong>${adminName}</strong> (${adminEmail}) to join <strong>${orgName}</strong> as a faculty member on Classgrid.</p>
    
    <div style="background: #ffffff; color: #111111; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">Getting Started â€” Next Steps</p>
      <p style="margin-bottom: 8px; font-size: 14px; color: #111111;">1. Click the button below to activate your Faculty account.</p>
      <p style="margin-bottom: 8px; font-size: 14px; color: #111111;">2. Set your secure password.</p>
      <p style="margin-bottom: 0; font-size: 14px; color: #111111;">3. Enter your <strong style="color: #111111;">Faculty Organization Code</strong> (shown below) on the same page to finalize linking.</p>
    </div>

    ${codeHtml}

    <a href="${verifyLink}" class="btn">Activate your Faculty account</a>
  `;
  return baseTemplate({
    content,
    title: "Faculty Invitation"
  });
};

// ------------- ORG APPROVAL (New format requested by User) -------------
export const getOrgApprovalEmailHtml = (orgName, ownerName, organizationCode, honorCode, frontendUrl) => {
  const content = `
    
    <p>Hi ${ownerName || "Admin"},</p>
    
    <p>Congratulations â€” your organization has been successfully reviewed and approved. You can now begin onboarding your faculty and students to your official Classgrid workspace.</p>

    <div class="box" style="margin-bottom: 24px;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">?? Admin Account Activation</p>
      <p style="margin-bottom: 12px;">You will receive a separate email containing your secure Admin Account activation link.</p>
      <p style="margin-bottom: 8px;">This activation email will:</p>
      <ul style="margin-top: 0; margin-bottom: 16px;">
        <li>Contain a unique, single-use activation link</li>
        <li>Be valid for 5 minutes</li>
        <li>Allow you to securely set your password</li>
        <li>Automatically log you into your Admin Dashboard after activation</li>
      </ul>
      <p style="margin-bottom: 8px; font-weight: 600; color: #111111;">For security reasons:</p>
      <ul style="margin-top: 0; margin-bottom: 16px;">
        <li>The activation link can only be used once</li>
        <li>It will expire after the validity period</li>
        <li>It must not be shared with anyone</li>
      </ul>
      <p style="margin-bottom: 0; font-size: 13px; color: #6b7280;">If your activation link expires, you can request a new one from the Admin Login page.</p>
    </div>

    <h3 style="color:#111111; margin-top:32px;">?? Your Organization Codes</h3>

    <div class="box" style="margin-bottom: 16px;">
      <div class="meta">Faculty Organization Code</div>
      <div class="code" style="color: #60a5fa;">${organizationCode}</div>
      <p style="margin: 12px 0 4px; font-weight: 500; font-size: 14px; color: #111111;">Share this only with faculty members.</p>
      <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">This code is required when a faculty member joins your organization.</p>
      <p style="margin: 0; font-size: 14px; color: #ef4444;">Do not share this with students.</p>
    </div>

    <div class="box" style="margin-bottom: 24px;">
      <div class="meta">Student Honor Code</div>
      <div class="code" style="color: #34d399;">${honorCode}</div>
      <p style="margin: 12px 0 4px; font-weight: 500; font-size: 14px; color: #111111;">Share this with students.</p>
      <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">This allows students to connect directly to your organization without a classroom code.</p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">This is not a classroom code.</p>
    </div>

    <h3 style="color:#111111; margin-top:32px;">?? Getting Started â€” Next Steps</h3>
    
    <p style="font-weight: 600; color: #111111; margin-bottom: 8px;">1?? For Faculty</p>
    <p style="margin-bottom: 12px;">Send faculty invitations from your Admin Dashboard.</p>
    <p style="margin-bottom: 8px;">Each faculty member will:</p>
    <ul style="margin-bottom: 8px;">
      <li>Receive an invitation email</li>
      <li>Verify their account</li>
      <li>Set their password</li>
      <li>Enter the Faculty Organization Code</li>
    </ul>
    <p style="margin-bottom: 24px; font-size: 13px; color: #6b7280;">After completion ? redirected to Faculty Dashboard.</p>

    <p style="font-weight: 600; color: #111111; margin-bottom: 8px;">2?? For Students</p>
    <p style="margin-bottom: 8px;">Students can join your organization in two ways:</p>
    <ul style="margin-bottom: 24px;">
      <li style="margin-bottom: 12px;"><strong>Enter the Student Honor Code</strong><br><span style="color: #6b7280;">? Directly connect to your organization</span></li>
      <li><strong>Enter a Classroom Code (created by faculty)</strong><br><span style="color: #6b7280;">? Join a specific classroom<br>? Automatically linked to your organization</span></li>
    </ul>

    <p style="font-weight: 600; color: #111111; margin-bottom: 8px;">3?? After Joining</p>
    <ul style="margin-bottom: 32px;">
      <li><strong>Faculty</strong> ? Redirected to Faculty Dashboard</li>
      <li><strong>Students</strong> ? Redirected to Student Dashboard</li>
    </ul>

    <div class="box" style="margin-bottom: 24px; border-left: 3px solid #3b82f6;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">?? Quick Access Tip</p>
      <p style="margin-bottom: 16px;">Once your admin account is activated and you log in successfully, we recommend bookmarking your Admin Dashboard link in your browser for faster access.</p>
      <p style="margin-bottom: 12px;">Your Admin Dashboard allows you to manage:</p>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">
        <tr>
          <td valign="top" width="40%">
            <strong style="color: #111111; display: block; margin-bottom: 6px;">Management</strong>
            01 â€” Overview<br>02 â€” Faculty<br>03 â€” Students<br>04 â€” Classrooms<br>05 â€” Notes<br>06 â€” Announcements
          </td>
          <td valign="top" width="30%">
            <strong style="color: #111111; display: block; margin-bottom: 6px;">Insights</strong>
            07 â€” Analytics<br>08 â€” Attendance<br>09 â€” Billing
          </td>
          <td valign="top" width="30%">
            <strong style="color: #111111; display: block; margin-bottom: 6px;">Settings</strong>
            10 â€” Organization<br>11 â€” Security<br>12 â€” Role Sandbox
          </td>
        </tr>
      </table>
      
      <p style="margin-bottom: 0; font-size: 13px; color: #6b7280; font-style: italic;">Bookmarking ensures you can return directly without navigating through the main portal.</p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">If you need assistance during setup, our support team is always available at:<br><a href="https://app.classgrid.in/support" style="color:#111111;">https://app.classgrid.in/support</a></p>
  `;
  return baseTemplate({
    content,
    title: "Organization Approved",
    ignoreText: ""
  });
};

// ------------- ORG ADMIN INVITE (activation token email) -------------
export const getOrgAdminInviteHtml = (adminName, orgName, activationLink) => {
  const content = `
    <p>Hi ${adminName},</p>
    <p>Your organization <strong>${orgName}</strong> has been approved on Classgrid.</p>

    <div class="box" style="margin-bottom: 24px;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">&#x1F511; Set Up Your Account</p>
      <p style="margin-bottom: 8px;">Click the button below to securely activate your admin account and set your password.</p>
      <p style="margin-bottom: 0; font-size: 13px; color: #6b7280;">&#x26A0;&#xFE0F; This link is <strong>single-use</strong> and expires in <strong>5 minutes</strong>. Do not share it.</p>
    </div>

    <a href="${activationLink}" class="btn">Activate Admin Account</a>

    <p style="margin-top: 28px; font-size: 13px; color: #6b7280;">After activation, you can sign in anytime at <a href="${getFrontendUrl()}/admin/login" style="color:#111111;">/admin/login</a>.</p>
    <p style="font-size: 13px; color: #6b7280;">If you did not apply for a Classgrid organization, please contact us at <a href="https://app.classgrid.in/support" style="color:#111111;">https://app.classgrid.in/support</a>.</p>
  `;
  return baseTemplate({
    content,
    title: "Activate Your Admin Account",
    ignoreText: "This link expires in 5 minutes and can only be used once."
  });
};

// ------------- DEPT ADMIN INVITE (Members page) -------------
export const getDeptAdminInviteEmailHtml = (recipientName, orgName, role, invitedByName, activationLink) => {
  const roleLabels = {
    admission_head: "Admissions Department Head",
    fee_manager: "Fees & Accounts Manager",
    exam_controller: "Examination Controller",
    library_manager: "Library Manager",
    hod: "Head of Department (HOD)",
    tpo_officer: "Training & Placement Officer",
    transport_manager: "Transport Manager",
    coordinator: "Academic Coordinator",
    counselor: "Student Counselor",
    faculty: "Faculty Member",
    principal: "Principal",
    vice_principal: "Vice Principal",
  };
  const roleLabel = roleLabels[role] || role;
  const content = `
    <p>Hi ${recipientName || "there"},</p>
    <p>You have been invited by <strong>${invitedByName}</strong> to join <strong>${orgName}</strong> on Classgrid as a <strong>${roleLabel}</strong>.</p>

    <div class="box" style="margin-bottom: 24px;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">&#x1F511; Activate Your Account</p>
      <p style="margin-bottom: 8px;">Click the button below to set your password and access your dashboard.</p>
      <p style="margin-bottom: 0; font-size: 13px; color: #6b7280;">&#x26A0;&#xFE0F; This link is <strong>single-use</strong> and expires in <strong>24 hours</strong>. Do not share it.</p>
    </div>

    <a href="${activationLink}" class="btn">Activate Account &amp; Set Password</a>

    <div class="box" style="margin-top: 28px; margin-bottom: 24px; border-left: 3px solid #3b82f6;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">&#x1F4CB; Your Role: ${roleLabel}</p>
      <p style="margin-bottom: 8px;">After activating your account, you will have access to your dedicated department dashboard where you can manage your responsibilities within ${orgName}.</p>
      <p style="margin-bottom: 0; font-size: 13px; color: #6b7280;">You are being managed by the Organization Admin. Contact your admin if you have any questions about your access level.</p>
    </div>

    
  `;
  return baseTemplate({
    content,
    title: `Invitation to join ${orgName}`,
    ignoreText: "If you did not expect this invitation, please ignore this email."
  });
};

// ------------- ADMIN: NEW ORG APPLICATION -------------
export const getAdminOrgApplicationNotificationHtml = (data) => {
  const content = `
    <p>A new institution has applied and is pending review.</p>
    <ul>
      <li><strong>Owner:</strong> ${data.owner_name}</li>
      <li><strong>Email:</strong> ${data.owner_email}</li>
      <li><strong>Phone:</strong> ${data.phone}</li>
    </ul>
    <a href="${getFrontendUrl()}/superadmin/login" class="btn">Review Application</a>
  `;
  return baseTemplate({
    content,
    title: "New Organization Application"
  });
};

// ------------- ADMIN: ORG APPROVED (INTERNAL) -------------
export const getAdminOrgApprovalNotificationHtml = (orgName, ownerEmail, organizationCode, honorCode, dashboardUrl) => {
  const content = `
    <p>The organization (${ownerEmail}) has been approved.</p>
    <ul>
      <li><strong>Faculty Code:</strong> ${organizationCode}</li>
      <li><strong>Student Code:</strong> ${honorCode}</li>
    </ul>
    <a href="${dashboardUrl}" class="btn">View in Admin Panel</a>
  `;
  return baseTemplate({
    content,
    title: "Approval Confirmed"
  });
};

// ------------- APPLICANT: APP RECEIVED -------------
export const getOrgApplicationConfirmationHtml = (ownerName, instituteName, plan = "FREE") => {
  const proPaymentBlock = plan === "PRO" ? `
    <div class="box" style="margin-bottom: 16px; border-left: 3px solid #a855f7;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #171717;">&#128179; Pro Plan â€” Payment via Razorpay</p>
      <p style="margin-bottom: 8px;">&#x2022; Complete your payment securely via <strong>Razorpay</strong> (UPI, cards, net banking, or wallets).</p>
      <p style="margin-bottom: 8px;">&#x2022; Once payment is confirmed, your <strong>Pro plan will be activated automatically</strong>.</p>
      <p style="margin-bottom: 0;">&#x2022; You will receive a confirmation email with your Pro plan details and dashboard access instructions.</p>
    </div>
  ` : '';

  const content = `
    <p>Hello ${ownerName},</p>
    <p>Thank you for registering <strong>${instituteName}</strong> on Classgrid${plan === "PRO" ? ' with the <strong>Pro Plan</strong>' : ''}.</p>
    <p>We have successfully received your application. ${plan === "PRO" ? 'Complete your payment to instantly activate your organization.' : 'It is now under review by our platform administration team.'}</p>

    ${proPaymentBlock}

    ${plan === "FREE" ? `
    <div class="box" style="margin-bottom: 16px;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #171717;">&#128270; What happens next?</p>
      <p style="margin-bottom: 8px;">&#x2022; Our team will verify your institution details.</p>
      <p style="margin-bottom: 8px;">&#x2022; We perform a security and compliance check.</p>
      <p style="margin-bottom: 0;">&#x2022; Review typically takes <strong>24&#x2013;48 hours</strong>.</p>
    </div>
    ` : ''}

    <p>You will receive another email once your organization is:</p>
    <p style="margin-bottom: 20px;">&#x2705; <strong>Approved and activated</strong></p>

    <div class="box" style="margin-bottom: 24px;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #171717;">&#x1F9ED; After Approval</p>
      <p style="margin-bottom: 8px;">Once approved, you will receive:</p>
      <p style="margin-bottom: 6px;">&#x2022; Your <strong>Faculty Organization Code</strong></p>
      <p style="margin-bottom: 6px;">&#x2022; Your <strong>Student Honor Code</strong></p>
      <p style="margin-bottom: 0;">&#x2022; A link to access your <strong>Admin Dashboard</strong></p>
    </div>

    <p>We appreciate your interest in building a structured digital environment with Classgrid.</p>
    <p style="margin-bottom: 0;">Warm regards,<br><strong>The Classgrid Team</strong></p>
  `;
  return baseTemplate({
    content,
    title: `Application Received \u2014 ${instituteName}`
  });
};

// ------------- APPLICANT: APP REJECTED -------------
export const getOrgRejectionEmailHtml = (ownerName, instituteName, reason = null) => {
  const content = `
    <p>Hi ${ownerName},</p>
    <p>We have reviewed your application for <strong>${instituteName}</strong>. Unfortunately, we are unable to approve it at this time.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
  `;
  return baseTemplate({
    content,
    title: "Application Status"
  });
};

// ------------- ADMIN: ACCOUNT ACTIVATED -------------
export const getOrgAdminActivatedHtml = (userName, dashboardLink, adminLoginLink) => {
  const content = `
    <p>Hi ${userName},</p>
    <p>Your Organization Admin account on Classgrid is now active. You have full control over your organization.</p>

    <div class="box" style="margin-bottom: 24px;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #171717;">What you can do now:</p>
      <p style="margin-bottom: 8px;">&#x2022; <strong>Create Classrooms</strong> â€” Set up classrooms and generate classroom codes for students.</p>
      <p style="margin-bottom: 8px;">&#x2022; <strong>Invite Faculty</strong> â€” Send invitations to faculty members who will teach in your organization.</p>
      <p style="margin-bottom: 8px;">&#x2022; <strong>Monitor Students</strong> â€” Track student enrollment and activity across classrooms.</p>
      <p style="margin-bottom: 0;">&#x2022; <strong>Manage Organization Settings</strong> â€” Configure your organization details, codes, and preferences.</p>
    </div>

    <a href="${dashboardLink}" class="btn">Go to Admin Dashboard</a>
  `;
  return baseTemplate({
    content,
    title: "Account Activated"
  });
};

// ------------- ADMIN: SUPER ADMIN CREATED -------------
export const getSuperAdminCredentialsHtml = (name, email, password, loginLink) => {
  const content = `
    <p>Hi ${name},</p>
    <p>You have been granted elevated, platform-wide privileges on Classgrid. You are responsible for reviewing and approving organization applications, managing platform settings, and overseeing all activity across the system.</p>

    <div class="box" style="margin-bottom: 12px;">
      <div class="meta">Email</div>
      <p style="font-weight: 600; color: #171717; margin-bottom: 0;">${email}</p>
    </div>
    <div class="box" style="margin-bottom: 24px;">
      <div class="meta">Temporary Password</div>
      <p class="code" style="margin-bottom: 4px;">${password}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #dc2626; font-weight: 500;">&#x26A0;&#xFE0F; Change this password immediately after logging in. Do not share it.</p>
    </div>

    <div class="box" style="margin-bottom: 24px;">
      <p style="margin-bottom: 12px; font-weight: 600; color: #171717;">Your platform-level controls include:</p>
      <p style="margin-bottom: 8px;">&#x2022; Review and approve or reject organization applications.</p>
      <p style="margin-bottom: 8px;">&#x2022; Manage all registered organizations and their admin accounts.</p>
      <p style="margin-bottom: 0;">&#x2022; Monitor platform-wide activity and system health.</p>
    </div>

    <a href="${loginLink}" class="btn">Login to Super Admin Dashboard</a>
  `;
  return baseTemplate({
    content,
    title: "Super Admin Access"
  });
};

// ------------- ORG DELETE VERIFICATION -------------
export const getOrgDeleteVerificationEmailHtml = (orgName, ownerName, verifyLink) => {
  const content = `
    <p>Hi ${ownerName},</p>
    <p>We received a request to permanently delete <strong>${orgName}</strong>.</p>
    
    <div class="box">
      <p style="margin-bottom: 8px;"><strong>This will permanently delete:</strong></p>
      <ul style="margin-bottom: 0;">
        <li>All classrooms and student data</li>
        <li>All faculty accounts</li>
        <li>Stored materials and organization settings</li>
      </ul>
    </div>
    
    <p>This action is irreversible. This link expires in 30 minutes.</p>
    <a href="${verifyLink}" class="btn btn-danger">Permanently Delete</a>
  `;
  return baseTemplate({
    content,
    title: "Confirm Deletion",
    ignoreText: "If you did not request this, please secure your account immediately."
  });
};

// ------------- PLAN ACTIVATION -------------
export const getPlanActivationHtml = (planName, activationDate, expiryDate, userName = 'User', planDuration = 31) => {
  const dashboardUrl = `${getFrontendUrl()}/admin/login`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Classgrid PRO Activated</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr>
<td align="center">

<!-- Main Container -->
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #eaeaea;overflow:hidden;">

<!-- Header -->
<tr>
<td style="padding:30px;text-align:center;border-bottom:1px solid #eaeaea;">
<img src="${PLATFORM_LOGO_URL}" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">>

<p style="margin:10px 0 0;font-size:13px;color:#6b7280;">
Payment confirmed â€” premium features unlocked
</p>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:30px;">

<p style="font-size:15px;color:#374151;margin:0 0 18px;">
Dear <strong>${userName}</strong>,
</p>

<p style="font-size:14px;color:#bdbdbd;line-height:1.7;margin:0 0 25px;">
Great news! Your payment has been <strong style="color:#34d399;">successfully verified</strong> and your 
<strong style="color:#111111;">Classgrid ${planName} Plan</strong> is now active.
All premium features have been unlocked for your organization.
</p>

<!-- Subscription Details -->
<table width="100%" cellpadding="0" cellspacing="0" 
style="background:#f9f9f9;border:1px solid #eaeaea;border-radius:10px;padding:20px;">
<tr>
<td>

<h3 style="margin:0 0 15px;font-size:15px;color:#111111;">
?? Subscription Details
</h3>

<table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;color:#374151;">
<tr>
<td><strong style="color:#6b7280;">Plan Name</strong></td>
<td align="right" style="color:#a855f7;font-weight:600;">${planName}</td>
</tr>
<tr>
<td><strong style="color:#6b7280;">Activation Date</strong></td>
<td align="right">${formatDate(activationDate)}</td>
</tr>
<tr>
<td><strong style="color:#6b7280;">Expiry Date</strong></td>
<td align="right">${formatDate(expiryDate)}</td>
</tr>
<tr>
<td><strong style="color:#6b7280;">Plan Duration</strong></td>
<td align="right">${planDuration} Days</td>
</tr>

</table>

</td>
</tr>
</table>

<!-- PRO Features Unlocked -->
<table width="100%" cellpadding="0" cellspacing="0" 
style="background:#f9f9f9;border:1px solid #eaeaea;border-radius:10px;padding:20px;margin-top:20px;">
<tr>
<td>

<h3 style="margin:0 0 15px;font-size:15px;color:#111111;">
? PRO Features Now Unlocked
</h3>

<table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;color:#374151;">
<tr>
<td style="padding:4px 0;">? <strong style="color:#111111;">Smart Attendance</strong> â€” Live sessions, daily/weekly/monthly reports</td>
</tr>
<tr>
<td style="padding:4px 0;">? <strong style="color:#111111;">Advanced Analytics</strong> â€” Student performance, engagement trends</td>
</tr>
<tr>
<td style="padding:4px 0;">? <strong style="color:#111111;">Priority Support</strong> â€” Faster response times</td>
</tr>
</table>

</td>
</tr>
</table>

<!-- Getting Started -->
<table width="100%" cellpadding="0" cellspacing="0" 
style="background:#0d1117;border:1px solid #1a3a5c;border-left:3px solid #3b82f6;border-radius:10px;padding:20px;margin-top:20px;">
<tr>
<td>

<h3 style="margin:0 0 15px;font-size:15px;color:#111111;">
?? How to Get Started
</h3>

<table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;color:#374151;">
<tr>
<td style="padding:6px 0;"><strong style="color:#60a5fa;">Step 1:</strong> Log in to your <strong style="color:#111111;">Organization Admin Dashboard</strong></td>
</tr>
<tr>
<td style="padding:6px 0;"><strong style="color:#60a5fa;">Step 2:</strong> Go to <strong style="color:#111111;">02 â€” Faculty</strong> section to invite your faculty members</td>
</tr>
<tr>
<td style="padding:6px 0;"><strong style="color:#60a5fa;">Step 3:</strong> Share your <strong style="color:#111111;">Student Honor Code</strong> with students (found in Overview)</td>
</tr>
<tr>
<td style="padding:6px 0;"><strong style="color:#60a5fa;">Step 4:</strong> Faculty creates classrooms ? students join using classroom codes</td>
</tr>
<tr>
<td style="padding:6px 0;"><strong style="color:#60a5fa;">Step 5:</strong> Access <strong style="color:#111111;">07 â€” Analytics</strong> and <strong style="color:#111111;">08 â€” Attendance</strong> (PRO features!)</td>
</tr>
</table>

</td>
</tr>
</table>

<p style="font-size:13px;color:#6b7280;margin-top:20px;">
Your PRO plan remains active for ${planDuration} days from the activation date.  
Please renew before expiry to maintain uninterrupted access.
</p>

<!-- CTA Buttons -->
<div style="text-align:center;margin:30px 0;">
<a href="${dashboardUrl}"
style="background:#ffffff;color:#000000;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;display:inline-block;">
Open Admin Dashboard
</a>
</div>

<div style="text-align:center;margin-bottom:20px;">
<a href="${getFrontendUrl()}"
style="background:transparent;color:#111111;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:500;display:inline-block;border:1px solid #eaeaea;">
Visit Classgrid
</a>
</div>

<p style="font-size:14px;color:#bdbdbd;margin:0;">
Need assistance?  
</p>

<p style="font-size:14px;margin:5px 0 0;">
<a href="https://app.classgrid.in/support" style="color:#111111;text-decoration:none;">
support@classgrid.in
</a>
</p>

<p style="font-size:14px;color:#374151;margin-top:30px;">
Best regards,<br>
<strong>The Classgrid Team</strong>
</p>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;font-size:12px;color:#9ca3af;">
&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.<br>
support@classgrid.in
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
};

export const getPlanActivationPlainText = (planName, activationDate, expiryDate, userName = 'User', planDuration = 31) => {
  return `?? Your Classgrid PRO Plan is Now Active

Payment confirmed â€” premium features unlocked

Dear ${userName},

Great news! Your payment has been successfully verified and your Classgrid ${planName} Plan is now active. All premium features have been unlocked for your organization.

--- SUBSCRIPTION DETAILS ---
Plan Name: ${planName}
Activation Date: ${formatDate(activationDate)}
Expiry Date: ${formatDate(expiryDate)}
Plan Duration: ${planDuration} Days

--- PRO FEATURES NOW UNLOCKED ---
? Smart Attendance â€” Live sessions, daily/weekly/monthly reports
? Advanced Analytics â€” Student performance, engagement trends
? Priority Support â€” Faster response times

--- HOW TO GET STARTED ---
Step 1: Log in to your Organization Admin Dashboard
Step 2: Go to "02 â€” Faculty" section to invite your faculty members
Step 3: Share your Student Honor Code with students (found in Overview)
Step 4: Faculty creates classrooms ? students join using classroom codes
Step 5: Access "07 â€” Analytics" and "08 â€” Attendance" (PRO features!)

Your PRO plan remains active for ${planDuration} days from the activation date. Please renew before expiry to maintain uninterrupted access.

Open Admin Dashboard: ${getFrontendUrl()}/admin/login
Visit Classgrid: ${getFrontendUrl()}

Need assistance?
support@classgrid.in

Best regards,
The Classgrid Team

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};


// ------------- PLAIN TEXT FALLBACKS -------------

export const getFacultyWelcomePlainText = (userName, orgName, dashboardUrl) => {
  return `Welcome to Classgrid

Organization: ${orgName}

Hi ${userName},

Your faculty account has been successfully created. You're now ready to manage classrooms, deliver structured academic content, and engage students professionally.

--- Structured Content Delivery ---
- Upload PDFs, documents, and study material to specific classrooms
- Control student contributions through approval workflows
- Notes remain isolated within your organization
- Files securely stored via Supabase with signed URLs

--- Smart Attendance (Pro Plan) ---
- Start/stop attendance sessions inside classroom
- Daily, weekly, and monthly attendance reports
- Students track their attendance history

--- Real-Time Classroom Chat ---
- Live academic discussions
- Faculty moderation tools
- Online activity visibility

Go to Dashboard: ${dashboardUrl}



&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getStudentWelcomePlainText = (userName, dashboardUrl) => {
  return `Welcome to Classgrid

Ready to start your academic journey

Hi ${userName},

Your account has been successfully created. You're now ready to begin your academic journey with Classgrid.

--- How to Join Your Organization ---
- Enter your Honor Code to join your institution directly.
- Or enter a Classroom Code provided by your subject faculty. Joining just one classroom automatically links you to the entire organization.
- Once linked, you can browse and request to join other classrooms within your organization, or join them instantly using a code (no request needed).
- You are managed by your organization. You cannot leave, browse, or request to join other organizations.

--- What You Can Do ---
- Access faculty-uploaded notes instantly
- Upload peer notes to a dedicated student section
- Notes require faculty approval before visibility
- All content is isolated within your organization
- View your attendance history and participation
- Participate in real-time classroom chat

Join Classroom: ${dashboardUrl}



&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getLoginNotificationPlainText = (user, provider = "manual") => {
  const config = providerConfig[provider] || providerConfig.manual;
  return `New login to your account

Hi ${user.name},
We noticed a new sign-in to your Classgrid account (${user.email}) on ${formatDate()} using ${config.name}.

Secure My Account: ${getFrontendUrl()}/reset-password

If this was you, you can safely ignore this email.

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getVerificationEmailPlainText = (name, verifyLink) => {
  return `Verify your email

Hi ${name},
Please verify your email address to complete your setup. This link expires in 24 hours.

Verify Email: ${verifyLink}

If you did not sign up for Classgrid, please ignore this email.

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getPasswordResetEmailPlainText = (resetLink) => {
  return `Reset your password

We received a request to reset the password for your Classgrid account. This link expires in 5 minutes.

Reset Password: ${resetLink}

If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getFacultyInviteEmailPlainText = (facultyName, orgName, verifyLink, orgCode = null, adminName = "Admin", adminEmail = "") => {
  return `You've been invited to join ${orgName}

Hi ${facultyName},
You have been invited by ${adminName} (${adminEmail}) to join ${orgName} as a faculty member on Classgrid.

--- GETTING STARTED â€” NEXT STEPS ---

1. Click the link below to activate your Faculty account.
2. Set your secure password and enter your Faculty Organization Code on the same page.
3. Once activated, you will be redirected to your Faculty Dashboard.

${orgCode ? `--- YOUR ORGANIZATION CODE ---\n\nFaculty Organization Code: ${orgCode}\n(MANDATORY: You will be required to enter this code after setting your password. Do not share with students.)\n\n` : ''}--- VERIFY YOUR ACCOUNT ---

Activate your Faculty account: ${verifyLink}
(This link expires in 5 minutes.)

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getOrgApprovalEmailPlainText = (orgName, ownerName, organizationCode, honorCode, facultyLimit, frontendUrl) => {
  return `?? ${orgName} is now live on Classgrid

Hi ${ownerName || "Admin"},

Congratulations â€” your organization has been successfully reviewed and approved. You can now begin onboarding your faculty and students to your official Classgrid workspace.

?? Admin Account Activation

You will receive a separate email containing your secure Admin Account activation link.

This activation email will:
â€¢ Contain a unique, single-use activation link
â€¢ Be valid for 5 minutes
â€¢ Allow you to securely set your password
â€¢ Automatically log you into your Admin Dashboard after activation

For security reasons:
â€¢ The activation link can only be used once
â€¢ It will expire after the validity period
â€¢ It must not be shared with anyone

If your activation link expires, you can request a new one from the Admin Login page.

?? Your Organization Codes

Faculty Organization Code: ${organizationCode}
Share this only with faculty members.
This code is required when a faculty member joins your organization.
Do not share this with students.

Student Honor Code: ${honorCode}
Share this with students.
This allows students to connect directly to your organization without a classroom code.
This is not a classroom code.

?? Getting Started â€” Next Steps

1?? For Faculty
Send faculty invitations from your Admin Dashboard.
Each faculty member will:
â€¢ Receive an invitation email
â€¢ Verify their account
â€¢ Set their password
â€¢ Enter the Faculty Organization Code
After completion ? redirected to Faculty Dashboard.

2?? For Students
Students can join your organization in two ways:
â€¢ Enter the Student Honor Code
  ? Directly connect to your organization
â€¢ Enter a Classroom Code (created by faculty)
  ? Join a specific classroom
  ? Automatically linked to your organization

3?? After Joining
â€¢ Faculty ? Redirected to Faculty Dashboard
â€¢ Students ? Redirected to Student Dashboard

?? Quick Access Tip
Once your admin account is activated and you log in successfully, we recommend bookmarking your Admin Dashboard link in your browser for faster access.

Your Admin Dashboard allows you to manage:

Management
01 â€” Overview
02 â€” Faculty
03 â€” Students
04 â€” Classrooms
05 â€” Notes
06 â€” Announcements

Insights
07 â€” Analytics
08 â€” Attendance
09 â€” Billing

Settings
10 â€” Organization
11 â€” Security
12 â€” Role Sandbox

Bookmarking ensures you can return directly without navigating through the main portal.

If you need assistance during setup, our support team is always available at:
support@classgrid.in

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getOrgAdminInvitePlainText = (adminName, orgName, activationLink) => {
  return `Activate Your Admin Account

Hi ${adminName},

Your organization "${orgName}" has been approved on Classgrid.

To activate your account and set your password, visit the link below:

Activation Link: ${activationLink}

IMPORTANT:
- This link is single-use and expires in 5 minutes.
- Do not share this link with anyone.
- After activation, you can sign in anytime at: ${getFrontendUrl()}/admin/login

If you did not apply for a Classgrid organization, please raise a ticket at https://app.classgrid.in/support.

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getAdminOrgApplicationNotificationPlainText = (data) => {
  return `New Application: ${data.institute_name}

Owner: ${data.owner_name}
Email: ${data.owner_email}
Phone: ${data.phone}

Review Application: ${getFrontendUrl()}/superadmin/login

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getAdminOrgApprovalNotificationPlainText = (orgName, ownerEmail, organizationCode, honorCode, dashboardUrl) => {
  return `Organization Approved: ${orgName}

Faculty Code: ${organizationCode}
Student Code: ${honorCode}

View in Admin Panel: ${dashboardUrl}

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getOrgApplicationConfirmationPlainText = (ownerName, instituteName, plan = "FREE") => {
  const proBlock = plan === "PRO" ? `\nPro Plan â€” Payment via Razorpay:\n  - Complete your payment securely via Razorpay (UPI, cards, net banking, or wallets).\n  - Once payment is confirmed, your Pro plan will be activated automatically.\n  - You will receive a confirmation email with your Pro plan details and dashboard access instructions.\n` : '';

  return `Application Received â€” ${instituteName}

Hello ${ownerName},

Thank you for registering ${instituteName} on Classgrid${plan === "PRO" ? ' with the Pro Plan' : ''}.

We have successfully received your application. ${plan === "PRO" ? 'Complete your payment to instantly activate your organization.' : 'It is now under review by our platform administration team.'}
${proBlock}
${plan === "FREE" ? `What happens next?
  - Our team will verify your institution details.
  - We perform a security and compliance check.
  - Review typically takes 24-48 hours.
` : ''}
You will receive another email once your organization is:
  [OK] Approved and activated

After Approval, you will receive:
  - Your Faculty Organization Code
  - Your Student Honor Code
  - A link to access your Admin Dashboard

We appreciate your interest in building a structured digital environment with Classgrid.

Warm regards,
The Classgrid Team

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getOrgRejectionEmailPlainText = (ownerName, instituteName, reason = null) => {
  return `Application Update

Hi ${ownerName},
We have reviewed your application for ${instituteName}. Unfortunately, we are unable to approve it at this time.
${reason ? `\nReason: ${reason}\n` : ''}
For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getOrgAdminActivatedPlainText = (userName, dashboardLink, adminLoginLink) => {
  return `Your Admin Account is Activated

Hi ${userName},
Your Organization Admin account on Classgrid is now active.

What you can do now:
- Create Classrooms â€” Set up classrooms and generate classroom codes.
- Invite Faculty â€” Send invitations to faculty members.
- Monitor Students â€” Track enrollment and activity across classrooms.
- Manage Settings â€” Configure your organization details and codes.

Go to Admin Dashboard: ${dashboardLink}

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getSuperAdminCredentialsPlainText = (name, email, password, loginLink) => {
  return `You have been assigned Super Admin access

Hi ${name},
You have been granted elevated, platform-wide privileges on Classgrid.

Your login credentials:
Email: ${email}
Temporary Password: ${password}

? IMPORTANT: Change your password immediately after logging in. Do not share it.

Your platform-level controls include:
- Review and approve or reject organization applications.
- Manage all registered organizations and their admin accounts.
- Monitor platform-wide activity and system health.

Login to Super Admin Dashboard: ${loginLink}

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getOrgDeleteVerificationEmailPlainText = (orgName, ownerName, verifyLink) => {
  return `
URGENT: Organization Deletion Request

Hi ${ownerName},

You have requested to delete the organization "${orgName}". This action is irreversible.

To confirm deletion, click the link below within the next 15 minutes:
${verifyLink}

If you did not request this, please ignore this email.

â€” The Classgrid Team
support@classgrid.in
  `.trim();
};

export const getOnboardingOtpEmailHtml = (otp) => {
  const content = `
    <p>Hi there,</p>
    <p>You requested a verification code during the Classgrid onboarding process.</p>
    
    <div class="box" style="margin-bottom: 24px; text-align: center;">
      <p style="margin-bottom: 8px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your 6-Digit Code</p>
      <p style="margin-bottom: 0; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #111111;">${otp}</p>
    </div>

    <p style="font-size: 14px; color: #374151;">This code is valid for the next <strong>10 minutes</strong>. Please do not share it with anyone.</p>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 24px; margin-bottom: 0;">If you did not request this code, you can safely ignore this email.</p>
  `;

  return baseTemplate({
    content,
    title: "Onboarding Verification Code",
    ignoreText: "This code expires in 10 minutes.",
  });
};

export const getOnboardingOtpEmailPlainText = (otp) => {
  return `Onboarding Verification Code

Your 6-digit verification code is: ${otp}

This code is valid for the next 10 minutes. Please do not share it with anyone.

If you did not request this code, you can safely ignore this email.

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- CLASSROOM ACTIVITY NOTIFICATION -------------
export const getClassroomActivityEmailHtml = ({ orgName, classroomName, facultyName, contentType, title, preview, classroomUrl }) => {
  const typeLabels = { announcements: "Announcement", materials: "Notes", quizzes: "Quiz" };
  const typeEmojis = { announcements: "??", materials: "??", quizzes: "??" };
  const label = typeLabels[contentType] || "Update";
  const emoji = typeEmojis[contentType] || "??";

  const content = `
    <p>Hi there,</p>
    <p>New content has been posted in your classroom.</p>

    <div class="box">
      <div class="meta">Organization</div>
      <p style="margin-bottom: 12px;">${orgName}</p>
      <div class="meta">Classroom</div>
      <p style="margin-bottom: 12px;">${classroomName}</p>
      <div class="meta">Posted by</div>
      <p style="margin-bottom: 12px;">${facultyName}</p>
      <div class="meta">${label}</div>
      <p style="margin-bottom: 0; font-weight: 600;">${title}</p>
      ${preview ? `<p style="margin-top: 8px; margin-bottom: 0; color: #525252; font-size: 14px;">${preview}</p>` : ''}
    </div>

    <a href="${classroomUrl}" class="btn">Open in Classroom</a>
    <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">To manage email notifications, visit <a href="${getFrontendUrl()}/settings" style="color: #111111; font-weight: 600; text-decoration: underline;">Settings</a>.</p>
`;
  return baseTemplate({
    content,
    title: `New ${label} â€” ${classroomName} `
  });
};

export const getClassroomActivityEmailPlainText = ({ orgName, classroomName, facultyName, contentType, title, preview, classroomUrl }) => {
  const typeLabels = { announcements: "Announcement", materials: "Notes", quizzes: "Quiz" };
  const label = typeLabels[contentType] || "Update";
  return `New ${label} in ${classroomName}

Organization: ${orgName}
Classroom: ${classroomName}
Posted by: ${facultyName}
${label}: ${title}
${preview ? `\nPreview: ${preview}\n` : ''}
Open in Classroom: ${classroomUrl}

To manage email notifications, visit: ${getFrontendUrl()}/settings

For contact, mail us at: support @classgrid.in

&copy; ${new Date().getFullYear()} Classgrid.All rights reserved.`;
};

// ------------- JOIN REQUEST NOTIFICATION (to Faculty) -------------
export const getJoinRequestEmailHtml = ({ studentName, classroomName, reviewUrl }) => {
  const content = `
    <p>Hi,</p>
    <p><strong>${studentName}</strong> has requested to join <strong>${classroomName}</strong>.</p>
    <p>You can approve or reject this request from your dashboard.</p>
    <a href="${reviewUrl}" class="btn">Review Request</a>
    <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">To manage email notifications, visit <a href="${getFrontendUrl()}/settings" style="color: #111111; font-weight: 600; text-decoration: underline;">Settings</a>.</p>
`;
  return baseTemplate({
    content,
    title: `Join Request â€” ${classroomName} `
  });
};

export const getJoinRequestEmailPlainText = ({ studentName, classroomName, reviewUrl }) => {
  return `New Join Request

${studentName} has requested to join ${classroomName}.
Approve or reject from your dashboard.

Review Request: ${reviewUrl}

To manage email notifications, visit: ${getFrontendUrl()}/settings

For contact, mail us at: support @classgrid.in

&copy; ${new Date().getFullYear()} Classgrid.All rights reserved.`;
};

// ------------- JOIN APPROVED NOTIFICATION (to Student) -------------
export const getJoinApprovedEmailHtml = ({ classroomName, classroomUrl }) => {
  const content = `
    <p>Your request to join <strong>${classroomName}</strong> has been approved.</p>
    <p>You can now access all classroom materials, announcements, and quizzes.</p>
    <a href="${classroomUrl}" class="btn">Open Classroom</a>
    <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">To manage email notifications, visit <a href="${getFrontendUrl()}/settings" style="color: #111111; font-weight: 600; text-decoration: underline;">Settings</a>.</p>
`;
  return baseTemplate({
    content,
    title: `Joined â€” ${classroomName} `
  });
};

export const getJoinApprovedEmailPlainText = ({ classroomName, classroomUrl }) => {
  return `You're In!

Your request to join ${classroomName} has been approved.
You can now access all classroom materials, announcements, and quizzes.

Open Classroom: ${classroomUrl}

To manage email notifications, visit: ${getFrontendUrl()}/settings

For contact, mail us at: support @classgrid.in

&copy; ${new Date().getFullYear()} Classgrid.All rights reserved.`;
};

// ------------- ATTENDANCE STARTED NOTIFICATION (to Students) -------------
export const getAttendanceStartedEmailHtml = ({ classroomName, facultyName, classroomUrl }) => {
  const content = `
    <p>Hi there,</p>
    <p>Your instructor has started an attendance session. You have <strong>4 minutes</strong> to mark your attendance.</p>

    <div class="box">
      <div class="meta">Classroom</div>
      <p style="margin-bottom: 12px;">${classroomName}</p>
      <div class="meta">Started by</div>
      <p style="margin-bottom: 0;">${facultyName}</p>
    </div>

    <a href="${classroomUrl}" class="btn" style="background: #00c896;">Mark Attendance Now</a>
    <p style="font-size: 13px; color: #737373; margin-top: 24px;">This session expires in 4 minutes. Act quickly!</p>
`;
  return baseTemplate({
    content,
    title: `Attendance Active â€” ${classroomName}`
  });
};

export const getAttendanceStartedEmailPlainText = ({ classroomName, facultyName, classroomUrl }) => {
  return `Attendance is Open â€” ${classroomName}

Your instructor ${facultyName} has started an attendance session.
You have 4 MINUTES to mark your attendance.

Mark Attendance Now: ${classroomUrl}

This session expires in 4 minutes. Act quickly!

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- ABSENCE NOTIFICATION (to Students) -------------
export const getAbsenceNotificationEmailHtml = ({ classroomName, sessionDate, classroomUrl }) => {
  const content = `
    <p>Hi there,</p>
    <p>You were absent from the attendance session in <strong>${classroomName}</strong>.</p>

    <div class="box">
      <div class="meta">Classroom</div>
      <p style="margin-bottom: 12px;">${classroomName}</p>
      <div class="meta">Session Date</div>
      <p style="margin-bottom: 0;">${sessionDate}</p>
    </div>

    <p style="font-size: 13px; color: #737373; margin-top: 16px;">If you believe this is an error, contact your instructor. Keep your attendance above 75% to avoid being flagged as a defaulter.</p>
    <a href="${classroomUrl}" class="btn">View Classroom</a>
`;
  return baseTemplate({
    content,
    title: `Absent â€” ${classroomName}`
  });
};

export const getAbsenceNotificationEmailPlainText = ({ classroomName, sessionDate, classroomUrl }) => {
  return `You Were Marked Absent â€” ${classroomName}

You were absent from the attendance session on ${sessionDate}.

Classroom: ${classroomName}

If you believe this is an error, contact your instructor.

View Classroom: ${classroomUrl}

For contact, visit: https://app.classgrid.in/support

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// -------------------------------------------------
// DIGEST EMAIL TEMPLATES
// -------------------------------------------------

const typeLabels = {
  new_content: "?? New Content",
  content_update: "?? Content Update",
  request_approved: "? Request Approved",
  request_rejected: "? Request Rejected",
  system: "?? System",
};

export const getDailyDigestEmailHtml = ({ userName, notifications, grouped, totalCount, settingsUrl, frontendUrl, isWeekly = false }) => {
  const period = isWeekly ? "Weekly" : "Daily";

  let notifRows = "";
  for (const [type, items] of Object.entries(grouped)) {
    const label = typeLabels[type] || "?? Notification";
    notifRows += `
  <tr><td colspan="2" style="padding:12px 0 4px; font-weight:600; color:#1e293b; font-size:14px;">${label} (${items.length})</td></tr>`;
    for (const n of items.slice(0, 10)) {
      const time = new Date(n.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
      const link = n.link ? `${frontendUrl}${n.link} ` : "#";
      notifRows += `
  <tr>
      <td style="padding:6px 0; color:#475569; font-size:13px; border-bottom:1px solid #f1f5f9;">
        <a href="${link}" style="color:#2563eb; text-decoration:none; font-weight:500;">${n.title}</a>
        <div style="color:#94a3b8; font-size:12px; margin-top:2px;">${n.message?.substring(0, 100) || ""}</div>
      </td>
      <td style="padding:6px 0; color:#94a3b8; font-size:11px; text-align:right; white-space:nowrap; border-bottom:1px solid #f1f5f9; vertical-align:top;">${time}</td>
    </tr>`;
    }
    if (items.length > 10) {
      notifRows += `<tr><td colspan="2" style="padding:4px 0; color:#94a3b8; font-size:12px;">...and ${items.length - 10} more</td></tr>`;
    }
  }

  return baseTemplate({
    title: `${period} Summary`,
    content: `
  <p style="margin:0 0 6px; font-size:15px; color:#1e293b;">Hi <strong>${userName}</strong>,</p>
    <p style="margin:0 0 20px; color:#64748b; font-size:14px; line-height:1.5;">
      Here's your ${period.toLowerCase()} summary â€” <strong>${totalCount}</strong> notification${totalCount > 1 ? "s" : ""} since your last digest.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${notifRows}
    </table>
    <div style="text-align:center; margin:24px 0;">
      <a href="${frontendUrl}/classroom" style="display:inline-block; padding:12px 28px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Open Dashboard</a>
    </div>
    <p style="margin:16px 0 0; color:#94a3b8; font-size:12px; text-align:center;">
      <a href="${settingsUrl}" style="color:#64748b; text-decoration:underline;">Change delivery preferences</a>
    </p>`,
    ignoreText: "You received this because your delivery mode is set to " + period.toLowerCase() + ".",
  });
};

export const getDailyDigestEmailPlainText = ({ userName, notifications, totalCount, settingsUrl, isWeekly = false }) => {
  const period = isWeekly ? "Weekly" : "Daily";
  let lines = [`Hi ${userName}, \n`, `Your ${period.toLowerCase()} summary â€” ${totalCount} notification${totalCount > 1 ? "s" : ""}: \n`];

  for (const n of notifications.slice(0, 20)) {
    const time = new Date(n.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
    lines.push(`â€¢ ${n.title}: ${n.message?.substring(0, 80) || ""} (${time})`);
  }
  if (totalCount > 20) lines.push(`\n...and ${totalCount - 20} more`);

  lines.push(`\nOpen Dashboard: ${getFrontendUrl()}/classroom`);
  lines.push(`Change preferences: ${settingsUrl}`);
  lines.push(`\n&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`);

  return lines.join("\n");
};

// ------------- PLAN EXPIRY REMINDER -------------
export const getPlanExpiryReminderHtml = (orgName, ownerName, planName, expiryDate, daysRemaining) => {
  const dashboardUrl = `${getFrontendUrl()}/admin/login`;
  const isExpired = daysRemaining <= 0;
  const isFinalDay = daysRemaining === 1;
  const isEndingSoon = daysRemaining <= 3;
  const accent = isExpired ? '#ef4444' : isEndingSoon ? '#f59e0b' : '#3b82f6';

  let title = 'Demo Review';
  let headline = 'Your Classgrid Demo Is In Progress';
  let intro = `Your 31-day Classgrid demo for <strong>${orgName}</strong> is active and progressing well.`;
  let actionHeading = 'Recommended next step';
  let actionBody = 'Review your onboarding progress, complete pending setup, and prepare your institution for go-live.';

  if (isEndingSoon) {
    title = isFinalDay ? 'Final Demo Reminder' : 'Demo Ending Soon';
    headline = isFinalDay ? 'Your Demo Ends Tomorrow' : 'Your Demo Is Nearing Its End';
    intro = `Your Classgrid demo for <strong>${orgName}</strong> ends in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>.`;
    actionHeading = 'Action needed';
    actionBody = 'Review your dashboard, finish onboarding, and prepare to continue your organization in the paid active state without interruption.';
  }

  if (isExpired) {
    title = 'Demo Ended - Continue With Paid Access';
    headline = 'Your Demo Period Has Ended';
    intro = `Your 31-day Classgrid demo for <strong>${orgName}</strong> has ended.`;
    actionHeading = 'Continue without interruption';
    actionBody = 'Log in to your Org Admin Dashboard and complete the next payment step to move your organization into the paid active state.';
  }

  const content = `
    <p>Hi ${ownerName},</p>
    <p>${intro}</p>

    <div class="box" style="border-left: 3px solid ${accent}; margin-bottom: 24px;">
      <div class="meta">Subscription State</div>
      <p style="font-weight: 600; margin-bottom: 8px; text-transform: capitalize;">${planName}</p>
      <div class="meta">Demo End Date</div>
      <p style="font-weight: 600; margin-bottom: 0;">${formatDate(expiryDate)}</p>
    </div>

    <div class="box" style="margin-bottom: 24px;">
      <p style="font-weight: 600; color: #111111; margin-bottom: 8px;">${actionHeading}</p>
      <p style="margin-bottom: 12px;">${actionBody}</p>
      <ul style="margin-top: 0;">
        <li>Review onboarding completion from your Org Admin Dashboard</li>
        <li>Make sure faculty and students have started setup</li>
        <li>${isExpired ? 'Complete payment to continue in the paid active state' : 'Prepare the transition from demo to the paid active state'}</li>
      </ul>
    </div>

    <a href="${dashboardUrl}" class="btn">${isExpired ? 'Continue With Paid Access' : 'Open Org Admin Dashboard'}</a>

    <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">Classgrid pricing is handled separately from this reminder flow. Use the dashboard to continue, or contact support if you need help with the next payment step.</p>
    
  `;
  return baseTemplate({
    content,
    title
  });
};

export const getPlanExpiryReminderPlainText = (orgName, ownerName, planName, expiryDate, daysRemaining) => {
  const dashboardUrl = `${getFrontendUrl()}/admin/login`;
  const isExpired = daysRemaining <= 0;
  const isFinalDay = daysRemaining === 1;
  const isEndingSoon = daysRemaining <= 3;

  let title = 'Demo Review';
  let summary = `Your 31-day Classgrid demo for ${orgName} is active and progressing well.`;

  if (isEndingSoon) {
    title = isFinalDay ? 'Final Demo Reminder' : 'Demo Ending Soon';
    summary = `Your Classgrid demo for ${orgName} ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`;
  }

  if (isExpired) {
    title = 'Demo Ended - Continue With Paid Access';
    summary = `Your 31-day Classgrid demo for ${orgName} has ended.`;
  }

  return `${title}

Hi ${ownerName},

${summary}

Subscription State: ${String(planName || 'demo').toUpperCase()}
Demo End Date: ${formatDate(expiryDate)}

Next step:
${isExpired
      ? 'Log in to your Org Admin Dashboard and complete the next payment step to move your organization into the paid active state.'
      : 'Review your setup progress and prepare the transition from demo to the paid active state without interruption.'}

Dashboard: ${dashboardUrl}

Classgrid pricing is handled separately from this reminder flow. Use the dashboard to continue, or contact support if you need help with the next payment step.



&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};
// ------------- CONSOLIDATED APPROVAL + ACTIVATION + PLAN EMAIL -------------
// Merges: getOrgApprovalEmailHtml + getOrgAdminInviteHtml + getPlanActivationHtml
// Sent as ONE email when a super admin approves an organization.
// PRO: includes subscription details table. FREE: shows capacity only.
// Original wording from all three templates is preserved verbatim.
export const getConsolidatedApprovalEmailHtml = ({
  adminName,
  orgName,
  subdomain,
  activationLink,
  activationCode,
  activationDate,
  expiryDate,
  sandboxDuration = 31,
  allocatedDashboards = [],
}) => {
  const dashboardLink = subdomain ? `https://${subdomain}.classgrid.in/admin/login` : `https://app.classgrid.in/admin/login`;
  const exampleDomain = subdomain ? `${subdomain}.classgrid.in` : `yourname.classgrid.in`;
  
  const dashboardLabels = {
    dashboard_admission: "Admissions",
    dashboard_fees: "Fees Management",
    dashboard_exam: "Exams & Grading",
    dashboard_attendance: "Attendance",
    dashboard_library: "Library",
    dashboard_hr: "HR & Payroll",
    dashboard_hostel: "Hostel Management",
    dashboard_faculty: "Faculty Workspace",
    dashboard_student: "Student Portal"
  };

  const dashboardsList = allocatedDashboards
    .map(d => dashboardLabels[d])
    .filter(Boolean)
    .map(label => `<li style="margin-bottom: 6px;">${label}</li>`)
    .join('');

  const content = `
    <p>Hi ${adminName || "Admin"},</p>
    
    <p>
      Congratulations! ðŸŽ‰ Your Classgrid Sandbox for <strong>${orgName}</strong> is now ready. 
      You have 31 days of full access to explore and experience how your institution can manage its operations from one unified platform.
    </p>

    <div class="box" style="margin-bottom:24px; margin-top:24px; border-left: 3px solid #3b82f6;">
      <p style="margin-bottom:12px; font-weight:600; color:#111111;">ðŸ“¦ Sandbox Details</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #374151;">
        <tr>
          <td style="padding-bottom:8px; width: 40%; color: #6b7280;">Organization</td>
          <td style="padding-bottom:8px; font-weight: 500; color: #111111;">${orgName}</td>
        </tr>
        <tr>
          <td style="padding-bottom:8px; color: #6b7280;">Access Period</td>
          <td style="padding-bottom:8px; font-weight: 500; color: #111111;">31 Days</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Sandbox Expires</td>
          <td style="font-weight: 500; color: #111111;">${formatDate(expiryDate)}</td>
        </tr>
      </table>
    </div>

    <h3 style="color:#111111; margin-top:32px; font-size: 16px;">ðŸ› ï¸ Included Dashboards</h3>
    <ul style="margin-bottom:32px; color:#374151;">
      ${dashboardsList || '<li>All core modules</li>'}
    </ul>

    <h3 style="color:#111111; margin-top:32px; font-size: 16px;">ðŸ” Welcome to Classgrid!</h3>
    <p style="margin-bottom:12px;">
      Click the button below to get started and set up your admin profile.
    </p>
    
    <a href="${activationLink}" class="btn" style="margin-bottom:12px;">Begin Setup â†’</a>

    <p style="margin-top: 32px; margin-bottom: 0;">
      Welcome aboard,<br>
      <strong>Nikhil Shinde</strong><br>
      <span style="font-size: 13px; color: #6b7280;">CEO, Classgrid</span>
    </p>
  `;

  return baseTemplate({
    content,
    title: "Your Classgrid Sandbox is Ready"
  });
};

export const getConsolidatedApprovalEmailPlainText = ({
  adminName,
  orgName,
  subdomain,
  activationLink,
  activationCode,
  activationDate,
  expiryDate,
  sandboxDuration = 31,
  allocatedDashboards = [],
}) => {
  const dashboardLabels = {
    dashboard_admission: "Admissions",
    dashboard_fees: "Fees Management",
    dashboard_exam: "Exams & Grading",
    dashboard_attendance: "Attendance",
    dashboard_library: "Library",
    dashboard_hr: "HR & Payroll",
    dashboard_hostel: "Hostel Management",
    dashboard_faculty: "Faculty Workspace",
    dashboard_student: "Student Portal"
  };

  const dashboardsList = allocatedDashboards
    .map(d => dashboardLabels[d])
    .filter(Boolean)
    .map(label => `- ${label}`)
    .join('\n');

  const dashboardLink = subdomain 
    ? `https://${subdomain}.classgrid.in/admin/dashboard`
    : "https://app.classgrid.in/admin/dashboard";

  return `Hi ${adminName || "Admin"},

Congratulations! ðŸŽ‰

Your Classgrid Sandbox for ${orgName} is now ready.

You have 31 days of full access to explore Classgrid and experience how your institution can manage its operations from one platform.

ðŸ“¦ Sandbox Details

Organization
${orgName}

Access Period
31 Days

Sandbox Expires
${formatDate(expiryDate)}

ðŸ› ï¸ Your Included Dashboards

Your sandbox has been configured with:
${dashboardsList || '- All core modules'}

ðŸ” Welcome to Classgrid!

Click the link below to get started and set up your admin profile.

Begin Setup â†’
${activationLink}

Need Help?
Our support team is available if you need assistance with your setup.
Contact Classgrid Support: https://app.classgrid.in/support

Nikhil Shinde | CEO
Classgrid

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- ACCOUNT SUSPENSION NOTIFICATION -------------
export const getAccountSuspensionEmailHtml = (userName, reason) => {
  const content = `
    <p>Hi ${userName || 'User'},</p>
    <p>Your Classgrid account has been suspended by an administrator.</p>

    <div class="box" style="border-left: 3px solid #f59e0b; margin-bottom: 24px;">
      <div class="meta">Reason</div>
      <p style="font-weight: 500; margin-bottom: 0;">${reason || 'No reason provided.'}</p>
    </div>

    <p>While your account is suspended, you will not be able to log in or access any Classgrid services.</p>

    <p style="margin-top: 24px;">If you believe this is a mistake or would like to appeal, please contact our support team:</p>
    <a href="https://app.classgrid.in/support" class="btn" style="background: #f59e0b; color: #000;">Contact Support</a>

    <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
      Support: <a href="https://app.classgrid.in/support" style="color:#111111;">https://app.classgrid.in/support</a>
    </p>
  `;
  return baseTemplate({ content, title: 'Account Suspended' });
};

export const getAccountSuspensionEmailPlainText = (userName, reason) => {
  return `Account Suspended

Hi ${userName || 'User'},

Your Classgrid account has been suspended by an administrator.

Reason: ${reason || 'No reason provided.'}

While your account is suspended, you will not be able to log in or access any Classgrid services.

If you believe this is a mistake or would like to appeal, please contact our support team at:
support@classgrid.in

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- ACCOUNT DELETION NOTIFICATION -------------
export const getAccountDeletionEmailHtml = (userName, reason) => {
  const content = `
    <p>Hi ${userName || 'User'},</p>
    <p>Your Classgrid account has been permanently deleted by an administrator.</p>

    <div class="box" style="border-left: 3px solid #ef4444; margin-bottom: 24px;">
      <div class="meta">Reason</div>
      <p style="font-weight: 500; margin-bottom: 0;">${reason || 'No reason provided.'}</p>
    </div>

    <p>All your data, including classroom memberships, sessions, and tokens, has been removed from our platform.</p>

    <p style="margin-top: 24px;">If you believe this was done in error, please contact our support team immediately:</p>
    <a href="https://app.classgrid.in/support" class="btn" style="background: #ef4444;">Contact Support</a>

    <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
      Support: <a href="https://app.classgrid.in/support" style="color:#111111;">https://app.classgrid.in/support</a>
    </p>
  `;
  return baseTemplate({ content, title: 'Account Deleted' });
};

export const getAccountDeletionEmailPlainText = (userName, reason) => {
  return `Account Deleted

Hi ${userName || 'User'},

Your Classgrid account has been permanently deleted by an administrator.

Reason: ${reason || 'No reason provided.'}

All your data, including classroom memberships, sessions, and tokens, has been removed from our platform.

If you believe this was done in error, please contact our support team immediately at:
support@classgrid.in

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- GENERIC NOTIFICATION -------------
export const getGenericNotificationHtml = (title, message, link = "") => {
  const content = `
    <p>${message || "You have a new Classgrid notification."}</p>
    ${link ? `<a href="${link}" class="btn">Open Classgrid</a>` : ""}
  `;

  return baseTemplate({ content, title: title || "Classgrid Notification" });
};

export const getGenericNotificationPlainText = (title, message, link = "") => {
  return `${title || "Classgrid Notification"}

${message || "You have a new Classgrid notification."}

${link ? `Open: ${link}` : ""}

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- DEMO LEAD NOTIFICATIONS -------------
export const getDemoLeadAlertHtml = (data = {}) => {
  const content = `
    <p><strong>${data.institutionName || "Institution"}</strong> requested a Classgrid demo.</p>
    <div class="box">
      <p><strong>Admin:</strong> ${data.adminName || "Not provided"}</p>
      <p><strong>Email:</strong> ${data.adminEmail || "Not provided"}</p>
      <p><strong>Phone:</strong> ${data.adminPhone || "Not provided"}</p>
      <p><strong>Location:</strong> ${[data.city, data.state].filter(Boolean).join(", ") || "Not provided"}</p>
    </div>
    ${data.dashboardUrl ? `<a href="${data.dashboardUrl}" class="btn">Open Lead</a>` : ""}
  `;

  return baseTemplate({ content, title: "New Demo Lead" });
};

export const getDemoLeadAlertPlainText = (data = {}) => {
  return `New Demo Lead

Institution: ${data.institutionName || "Institution"}
Admin: ${data.adminName || "Not provided"}
Email: ${data.adminEmail || "Not provided"}
Phone: ${data.adminPhone || "Not provided"}
Location: ${[data.city, data.state].filter(Boolean).join(", ") || "Not provided"}

${data.dashboardUrl ? `Open Lead: ${data.dashboardUrl}` : ""}

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getWelcomeProspectHtml = (data = {}) => {
  const content = `
    <p>Hi ${data.adminName || "there"},</p>
    <p>We received your demo request for <strong>${data.institutionName || "your institution"}</strong>. Our team will follow up soon.</p>
    ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="btn">Book Demo Slot</a>` : ""}
  `;

  return baseTemplate({ content, title: "Demo Request Received" });
};

export const getWelcomeProspectPlainText = (data = {}) => {
  return `Demo Request Received

Hi ${data.adminName || "there"},

We received your demo request for ${data.institutionName || "your institution"}. Our team will follow up soon.

${data.bookingUrl ? `Book Demo Slot: ${data.bookingUrl}` : ""}

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getDemoMeetingScheduledHtml = (data = {}) => {
  const title = "Demo Meeting Rescheduled";
  
  const content = `
    <p>Hello ${data.adminName || "there"},</p>
    <p>Weâ€™re writing to let you know that the Classgrid demo meeting for <strong>${data.institutionName || "your institution"}</strong> has been rescheduled.</p>
    
    <p>Updated meeting details:</p>
    <div class="box">
      <p><strong>Date & Time:</strong> ${data.scheduledAt ? formatDate(data.scheduledAt) : "To be confirmed"}</p>
      <p><strong>Google Meet Link:</strong> ${data.meetingUrl ? `<a href="${data.meetingUrl}">${data.meetingUrl}</a>` : "Not provided"}</p>
    </div>
    
    <p style="margin-top:20px;">Please use the updated link above to join the meeting. We look forward to speaking with you and showing how Classgrid can support your institution.</p>
    
    <div style="margin-top:30px;">
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 10px;">Warm regards,</p>
      <div style="display:inline-block;text-align:left;">
        ${data.repAvatar ? `<img src="${data.repAvatar}" alt="${data.repName}" style="width:40px;height:40px;border-radius:50%;vertical-align:middle;margin-right:8px;border:2px solid #34d399;object-fit:cover;">` : ''}
        <strong style="color:#374151;font-size:14px;vertical-align:middle;">${data.repName}</strong>
        ${data.repAvatar ? `<span style="display:inline-block;vertical-align:middle;margin-left:4px;width:18px;height:18px;" title="Verified Classgrid Staff"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="12" fill="#1DA1F2"/><path d="M9.5 16.5l-4-4 1.41-1.41L9.5 13.67l7.59-7.59L18.5 7.5l-9 9z" fill="#ffffff"/></svg></span>` : ''}
        ${data.repEmail ? `<br><a href="mailto:${data.repEmail}" style="color:#34d399;font-size:13px;text-decoration:none;">${data.repEmail}</a>` : ''}
      </div>
    </div>
  `;

  return baseTemplate({ content, title });
};

export const getDemoMeetingScheduledPlainText = (data = {}) => {
  const repName = data.repName || "Classgrid Team";
  const title = "Demo Meeting Rescheduled";

  return `${title}

Hello ${data.adminName || "there"},

Weâ€™re writing to let you know that the Classgrid demo meeting for ${data.institutionName || "your institution"} has been rescheduled.

Updated meeting details:

Date & Time: ${data.scheduledAt ? formatDate(data.scheduledAt) : "To be confirmed"}

Google Meet Link: ${data.meetingUrl || "Not provided"}

Please use the updated link above to join the meeting. We look forward to speaking with you and showing how Classgrid can support your institution.

Warm regards,

${repName}
Classgrid Team
${data.repEmail ? `${data.repEmail}` : ""}



&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- ADMISSION FEE RECEIPT -------------
export const getAdmissionFeeReceiptHtml = (data = {}) => {
  const amount = Number(data.amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  const content = `
    <p>Dear <strong>${data.candidate_name || "Student"}</strong>,</p>
    <p>We are pleased to confirm that your admission fee for <strong>${data.organization_name || "your institution"}</strong> has been successfully received.</p>

    <div class="box">
      <div class="meta">Receipt Details</div>
      <p><strong>Receipt No:</strong> ${data.receipt_no || "N/A"}</p>
      <p><strong>Amount Paid:</strong> INR ${amount}</p>
      <p><strong>Payment Date:</strong> ${formatDate(data.payment_date || new Date())}</p>
      <p><strong>Transaction ID:</strong> ${data.payment_id || "N/A"}</p>
    </div>

    <div class="box">
      <p><strong>Enrollment Status:</strong> Confirmed</p>
      <p>Your admission is now finalized. You can access your student dashboard using your registered email or phone.</p>
    </div>

    <p style="font-size:13px;">This is a computer-generated receipt and does not require a physical signature.</p>
  `;

  return baseTemplate({
    content,
    title: "Admission Fee Receipt",
  });
};

export const getAdmissionFeeReceiptPlainText = (data = {}) => {
  const amount = Number(data.amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

  return `Admission Fee Receipt

Dear ${data.candidate_name || "Student"},

We are pleased to confirm that your admission fee for ${data.organization_name || "your institution"} has been successfully received.

Receipt No: ${data.receipt_no || "N/A"}
Amount Paid: INR ${amount}
Payment Date: ${formatDate(data.payment_date || new Date())}
Transaction ID: ${data.payment_id || "N/A"}
Enrollment Status: Confirmed

This is a computer-generated receipt and does not require a physical signature.

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- NO ACCOUNT SIGN-IN ATTEMPT -------------
// chat.classgrid.in version: no institutions there, so explain the usual reasons and how to get in
const getChatNoAccountSignInAttemptHtml = (email, device, city) => {
  const content = `
    <p>We received a sign-in attempt for <strong>${email}</strong> on <strong>Classgrid AI</strong>, but there's no account with this email yet.</p>

    <div class="box">
      <div class="meta">Attempt Details</div>
      <p><strong>Device:</strong> ${device}</p>
      <p><strong>Location:</strong> ${city}</p>
      <p><strong>Time:</strong> ${formatDate(new Date())}</p>
    </div>

    <h3 style="color:#111111; margin-top:24px;">Why did this happen?</h3>
    <ul style="color:#374151; padding-left:20px; line-height:1.6; margin-bottom:24px;">
      <li>You haven't created a Classgrid AI account with this email yet.</li>
      <li>You may have signed up with a different email address, or there's a typo in this one.</li>
      <li>You may have signed up with <strong>Google</strong> or <strong>GitHub</strong>. Use the same button to sign in instead of typing your email.</li>
    </ul>

    <h3 style="color:#111111;">Next Steps</h3>
    <p>New here? Create your free account in about 2 minutes: sign up with your email, verify your WhatsApp number with a one-time code, and you're in.</p>

    <div style="text-align:center;margin:8px 0 24px;">
      <a href="https://chat.classgrid.in/login" class="btn">Create your account</a>
    </div>

    <p style="font-size:13px;color:#6b7280;">Need help? Visit <a href="https://classgrid.in/support">Support</a> or email <a href="mailto:support@classgrid.in">support@classgrid.in</a>.</p>
  `;

  return baseTemplate({
    content,
    title: "Sign-in attempt",
    ignoreText: "If this was not you, no action is required.",
  });
};

const getChatNoAccountSignInAttemptPlainText = (email, device, city) => `Sign-in attempt on Classgrid AI

We received a sign-in attempt for ${email} on Classgrid AI, but there's no account with this email yet.

Device: ${device}
Location: ${city}
Time: ${formatDate(new Date())}

Why did this happen?
- You haven't created a Classgrid AI account with this email yet.
- You may have signed up with a different email address, or there's a typo in this one.
- You may have signed up with Google or GitHub. Use the same button to sign in instead of typing your email.

Next Steps
New here? Create your free account in about 2 minutes: sign up with your email, verify your WhatsApp number with a one-time code, and you're in.
Create your account: https://chat.classgrid.in/login

Need help? https://classgrid.in/support or support@classgrid.in

If this was not you, no action is required.
© ${new Date().getFullYear()} Classgrid. All rights reserved.`;

export const getNoAccountSignInAttemptHtml = (email, location = {}) => {
  const device = location.device || "Unknown device";
  const city = location.city || "Unknown location";
  if (location.isChat) return getChatNoAccountSignInAttemptHtml(email, device, city);
    const orgUrl = location.orgSlug ? `${location.orgSlug}.classgrid.in` : "Classgrid";
    const orgNameText = location.orgSlug ? `<strong>${location.orgSlug.toUpperCase()}</strong> (${orgUrl})` : "your institution";
    const content = `
    <p>We received a login attempt for <strong>${email}</strong>, but no account was found for this email in ${orgNameText}. If this was you, please ensure you are using the correct email address provided by your institution.</p>

    <div class="box">
      <div class="meta">Attempt Details</div>
      <p><strong>Device:</strong> ${device}</p>
      <p><strong>Location:</strong> ${city}</p>
      <p><strong>Time:</strong> ${formatDate(new Date())}</p>
    </div>

    <h3 style="color:#111111; margin-top:24px;">Why did this happen?</h3>
    <ul style="color:#374151; padding-left:20px; line-height:1.6; margin-bottom:24px;">
      <li>You may have used a personal email instead of your official institution email.</li>
      <li>Your institution administrator may not have created your account yet.</li>
    </ul>

    <h3 style="color:#111111;">Next Steps</h3>
    <p>If you believe you should have access, please reach out to your institution administrator directly.</p>
  `;

  return baseTemplate({
    content,
    title: "Login attempt",
    ignoreText: "If this was not you, no action is required.",
  });
};

export const getNoAccountSignInAttemptPlainText = (email, location = {}) => {
  const device = location.device || "Unknown device";
  const city = location.city || "Unknown location";
  if (location.isChat) return getChatNoAccountSignInAttemptPlainText(email, device, city);

  const orgUrl = location.orgSlug ? `${location.orgSlug}.classgrid.in` : "Classgrid";
  const orgNameText = location.orgSlug ? `${location.orgSlug.toUpperCase()} (${orgUrl})` : "your institution";

  return `Login attempt

We received a login attempt for ${email}, but no account was found for this email in ${orgNameText}. If this was you, please ensure you are using the correct email address provided by your institution.

Device: ${device}
Location: ${city}
Time: ${formatDate(new Date())}

Why did this happen?
â€¢ You may have used a personal email instead of your official institution email.
â€¢ Your institution administrator may not have created your account yet.

Next Steps
If you believe you should have access, please reach out to your institution administrator directly.

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- NEW DEVICE OTP -------------
export const getNewDeviceOtpHtml = (userName, otp) => {
  const content = `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>We noticed a login attempt to your Classgrid account from a new device or browser. To protect your account, please verify this device using the code below.</p>

    <div class="box" style="text-align:center; margin: 24px 0;">
      <div class="meta">Your Verification Code</div>
      <span class="code" style="font-size:32px; letter-spacing:8px; color:#111111;">${otp}</span>
      <p style="margin-top:12px; font-size:13px; color:#6b7280;">This code expires in <strong style="color:#111111;">10 minutes</strong>.</p>
    </div>

    <p>Enter this code on the login page to verify your device. If you did not attempt to log in, please secure your account immediately.</p>
  `;
  return baseTemplate({
    content,
    title: 'Verify New Device',
    ignoreText: 'If you did not attempt to log in, please ignore this email and consider changing your password.'
  });
};

export const getNewDeviceOtpPlainText = (userName, otp) => {
  return `New Device Login Detected

Hi ${userName},

We noticed a login attempt from a new device or browser.

Your Verification Code: ${otp}

This code expires in 10 minutes. Enter it on the login page to verify your device.

If you did not attempt to log in, please reset your password immediately.

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- BILLING EMAIL OTP -------------
export const getBillingVerificationOtpHtml = (orgName, userName, otp) => {
  const content = `
    <p>Hi <strong>${userName || orgName}</strong>,</p>
    <p>You requested to verify the billing email for <strong>${orgName}</strong>. Please use the verification code below to complete this process.</p>

    <div class="box" style="text-align:center; margin: 24px 0;">
      <div class="meta">Your Verification Code</div>
      <span class="code" style="font-size:32px; letter-spacing:8px; color:#111111;">${otp}</span>
      <p style="margin-top:12px; font-size:13px; color:#6b7280;">This code expires in <strong style="color:#111111;">60 seconds</strong>.</p>
    </div>

    <p>Enter this code in your Billing Profile to verify this email address. If you did not make this request, please review your organization settings.</p>
  `;
  return baseTemplate({
    content,
    title: 'Verify Billing Email',
    ignoreText: 'If you did not make this request, you can safely ignore this email.'
  });
};

export const getBillingVerificationOtpPlainText = (orgName, userName, otp) => {
  return `Verify Your Billing Email

Hi ${userName || orgName},

You requested to verify the billing email for ${orgName}.

Your Verification Code: ${otp}

This code expires in 60 seconds. Enter it in your Billing Profile to verify this email address.

If you did not make this request, please review your organization settings.

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ----------------------------------------------------------------------
// Account Deleted Notification (Hierarchical)
// ----------------------------------------------------------------------

export const getAccountDeletedNotificationHtml = (userName, userEmail, role) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #d9534f; margin-bottom: 20px;">User Account Deleted</h2>
        <p>This is an automated notification regarding a user departure.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #d9534f; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${userName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 0;"><strong>Role:</strong> <span style="text-transform: capitalize;">${role.replace('_', ' ')}</span></p>
        </div>
        <p>This user has permanently deleted their account from the platform.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
        <p style="color: #888; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Classgrid. This is an internal administrative notification.
        </p>
    </div>
    `;
};

export const getAccountDeletedNotificationPlainText = (userName, userEmail, role) => {
    return `
User Account Deleted

This is an automated notification regarding a user departure.

Name: ${userName}
Email: ${userEmail}
Role: ${role.replace('_', ' ')}

This user has permanently deleted their account from the platform.

(c) ${new Date().getFullYear()} Classgrid. This is an internal administrative notification.
    `.trim();
};

// =========================================================
// ERP INTERNAL EMAILS (DARK MODE SUPPORT & NO CLASSGRID BRANDING)
// =========================================================

const erpBaseTemplateInternal = ({ content, title = "Notification", orgName = "Institution" }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${orgName}</title>
  <style>
    :root {
      --bg: #f9fafb;
      --card-bg: #ffffff;
      --text: #111827;
      --text-muted: #4b5563;
      --border: #e5e7eb;
      --btn-bg: #111827;
      --btn-text: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --card-bg: #1f2937;
        --text: #f9fafb;
        --text-muted: #9ca3af;
        --border: #374151;
        --btn-bg: #ffffff;
        --btn-text: #111827;
      }
    }
    body, html {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      padding: 40px 20px;
      width: 100%;
      background-color: var(--bg);
      box-sizing: border-box;
    }
    .card {
      max-width: 600px;
      margin: 0 auto;
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .content {
      padding: 32px;
      line-height: 1.6;
      font-size: 15px;
      color: var(--text);
    }
    .footer {
      padding: 24px;
      text-align: center;
      border-top: 1px solid var(--border);
      font-size: 13px;
      color: var(--text-muted);
    }
    h2 {
      margin-top: 0;
      color: var(--text);
    }
    p {
      margin: 0 0 16px;
    }
    ul {
      margin: 0 0 16px 20px;
      padding: 0;
    }
    li {
      margin-bottom: 8px;
    }
    .btn {
      display: inline-block;
      background-color: var(--btn-bg);
      color: var(--btn-text) !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
      font-size: 14px;
    }
    .text-muted {
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>Regards,<br><strong>${orgName}</strong><br>ERP Administration Team</p>
        <p>This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

export const getErpRoleInvitationHtml = (recipientName, roleTitle, orgName, setupLink, expiryDate) => {
  const content = `<h2>Official Notice: Role Assignment</h2>
  <p>Dear ${recipientName},</p>
  <p>You have been officially assigned the role of <strong>${roleTitle}</strong> at <strong>${orgName}</strong>.</p>
  <p>To activate your account and access the institutionâ€™s ERP portal, please click the button below and complete your portal setup.</p>
  <a href="${setupLink}" class="btn">Set Up Portal Access</a>
  <p class="text-muted">This invitation link will expire on ${expiryDate}.</p>
  <p>For security reasons, please do not share this email or activation link with anyone.</p>
  <p>If the button does not work, copy and paste the following link into your browser:</p>
  <p><a href="${setupLink}">${setupLink}</a></p>
  <p>For assistance, please contact IT Administrator/Support.</p>`;
  return baseTemplate({ content, title: "Role Assignment" });
};

export const getErpRoleRequestAdminHtml = (adminName, requesterName, requesterEmail, requestedRole, orgName, requestDate, reviewLink) => {
  const content = `<h2>Access Request Pending Approval</h2>
  <p>Dear ${adminName},</p>
  <p>A new role-access request has been submitted for <strong>${orgName}</strong>.</p>
  <ul>
    <li><strong>Requester Name:</strong> ${requesterName}</li>
    <li><strong>Requester Email:</strong> ${requesterEmail}</li>
    <li><strong>Requested Role:</strong> ${requestedRole}</li>
    <li><strong>Request Date:</strong> ${requestDate}</li>
  </ul>
  <p>Please review the request and approve or deny it through the ERP portal.</p>
  <a href="${reviewLink}" class="btn">Review Request in ERP</a>
  <p>For security and accountability, please verify the requesterâ€™s identity and role requirements before approving access.</p>
  <p>If the button does not work, copy and paste the following link into your browser:</p>
  <p><a href="${reviewLink}">${reviewLink}</a></p>`;
  return baseTemplate({ content, title: "Access Request Pending Approval" });
};

export const getErpRoleApprovedHtml = (recipientName, roleTitle, orgName, dashboardLink) => {
  const content = `<h2>Access Request Approved</h2>
  <p>Dear ${recipientName},</p>
  <p>Your request for the <strong>${roleTitle}</strong> role at <strong>${orgName}</strong> has been officially approved by the administration.</p>
  <p>Your assigned role is now active, and your dashboard is ready for access.</p>
  <a href="${dashboardLink}" class="btn">Access Your Dashboard</a>
  <p>Please use your registered email address to sign in. Do not share your account credentials or portal access with anyone.</p>
  <p>If the button does not work, copy and paste the following link into your browser:</p>
  <p><a href="${dashboardLink}">${dashboardLink}</a></p>
  <p>For assistance, please contact IT Administrator/Support.</p>`;
  return baseTemplate({ content, title: "Access Request Approved" });
};

export const getErpRoleInstantlyGrantedHtml = (recipientName, roleTitle, orgName, updatedBy, updateDate, dashboardLink) => {
  const content = `<h2>Security Notice: Administrative Privileges Updated</h2>
  <p>Dear ${recipientName},</p>
  <p>This is an automated security notice confirming that <strong>${roleTitle}</strong> administrative privileges have been successfully added to your profile for <strong>${orgName}</strong>.</p>
  <ul>
    <li><strong>Updated Role:</strong> ${roleTitle}</li>
    <li><strong>Updated By:</strong> ${updatedBy}</li>
    <li><strong>Updated On:</strong> ${updateDate}</li>
  </ul>
  <p>You can review your updated administrative access through the ERP portal.</p>
  <a href="${dashboardLink}" class="btn">Review Your Administrative Access</a>
  <p>Administrative privileges may provide access to sensitive institutional information. Please use them only for authorized institutional activities and never share your account credentials.</p>
  <p>If you did not request or expect this change, contact IT Administration immediately.</p>
  <p>If the button does not work, copy and paste the following link into your browser:</p>
  <p><a href="${dashboardLink}">${dashboardLink}</a></p>`;
  return baseTemplate({ content, title: "Administrative Privileges Updated" });
};

// ------------- ERP: ROLE REQUEST DECLINED (sent to requester when admin rejects) -------------
export const getErpRoleRejectedHtml = (recipientName, roleTitle, orgName, rejectionReason, contactLink) => {
  const content = `<h2>Access Request Not Approved</h2>
  <p>Dear ${recipientName},</p>
  <p>Your request for <strong>${roleTitle}</strong> access at <strong>${orgName}</strong> has been reviewed and was <strong>not approved</strong> at this time.</p>
  ${rejectionReason ? `<div class="box" style="border-left: 3px solid #dc2626;"><p style="margin-bottom: 8px; font-weight: 600; color: #111111;">Reason from Administrator</p><p style="margin-bottom: 0;">${rejectionReason}</p></div>` : ''}
  <p>If you believe this decision was made in error, or if you have questions, please contact your Organization Administrator directly.</p>
  ${contactLink ? `<a href="${contactLink}" class="btn">Contact Administrator</a>` : ''}
  <p>You can continue using Classgrid with your current role and access level.</p>
  <p>If you did not submit this request, please contact support immediately.</p>`;
  return baseTemplate({ content, title: "Access Request Not Approved" });
};

// ------------- DEMO LEAD ASSIGNED -------------
export const getDemoLeadAssignedHtml = ({ assigneeName, institutionName, adminName, adminEmail, city, dashboardUrl, leadId, meetingScheduledAt, meetingProvider, meetingUrl, meetingStatus }) => {
  const formatDate = (date) => {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleString("en-IN", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Kolkata", timeZoneName: "short",
    });
  };

  const statusLabel = meetingStatus === 'rescheduled' ? 'Rescheduled Meeting Details' : 'Meeting Details';
  const meetingHtml = `
  <div class="box" style="margin-bottom: 24px; border-left: 3px solid #3b82f6;">
    <p style="margin-bottom: 8px; font-weight: 600; color: #111111;">${statusLabel}</p>
    <ul style="margin-top: 0; margin-bottom: 0;">
      <li><strong>Date:</strong> ${meetingScheduledAt ? formatDate(meetingScheduledAt) : 'Not Scheduled'}</li>
      <li><strong>Provider:</strong> ${meetingProvider || 'N/A'}</li>
      <li><strong>Link:</strong> ${meetingUrl ? `<a href="${meetingUrl}">${meetingUrl}</a>` : 'N/A'}</li>
    </ul>
  </div>
  `;

  const content = `
    <p>Hi ${assigneeName},</p>
    <p>You have been assigned to handle this Demo Lead on Classgrid.</p>
    
    <div class="box" style="margin-bottom: 16px; border-left: 3px solid #10b981;">
      <p style="margin-bottom: 8px; font-weight: 600; color: #111111;">Lead Details</p>
      <ul style="margin-top: 0; margin-bottom: 0;">
        <li><strong>Institution:</strong> ${institutionName}</li>
        <li><strong>Contact Person:</strong> ${adminName}</li>
        <li><strong>Email:</strong> ${adminEmail}</li>
        ${city ? `<li><strong>Location:</strong> ${city}</li>` : ''}
      </ul>
    </div>

    ${meetingHtml}
    
    <a href="${dashboardUrl}/superadmin/detail/${leadId}" class="btn">View Lead Details</a>
  `;
  return baseTemplate({
    content,
    title: `You have been Assigned to Lead: ${institutionName}`
  });
};

export const getDemoLeadAssignedPlainText = ({ assigneeName, institutionName, adminName, adminEmail, city, dashboardUrl, leadId, meetingScheduledAt, meetingProvider, meetingUrl, meetingStatus }) => {
  const formatDate = (date) => {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleString("en-IN", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Kolkata", timeZoneName: "short",
    });
  };

  const statusLabel = meetingStatus === 'rescheduled' ? 'Rescheduled Meeting Details:' : 'Meeting Details:';
  const meetingText = `
${statusLabel}
- Date: ${meetingScheduledAt ? formatDate(meetingScheduledAt) : 'Not Scheduled'}
- Provider: ${meetingProvider || 'N/A'}
- Link: ${meetingUrl || 'N/A'}
`;

  return `Hi ${assigneeName},

You have been assigned to handle this Demo Lead on Classgrid.

Lead Details:
- Institution: ${institutionName}
- Contact Person: ${adminName}
- Email: ${adminEmail}
${city ? `- Location: ${city}` : ''}
${meetingText}
View Lead Details:
${dashboardUrl}/superadmin/detail/${leadId}

The Classgrid Team`.trim();
};

export const getVettingApprovalRequestHtml = ({ requesterName, institutionName, adminName, adminEmail, city, dashboardUrl, leadId }) => { 
  return `
    <div style="font-family: sans-serif; color: #111;">
      <h2>Approval Request: Sandbox Provisioning</h2>
      <p><strong>${requesterName}</strong> has requested your vetting approval to provision a sandbox for <strong>${institutionName}</strong>.</p>
      
      <h3>Lead Details:</h3>
      <ul>
        <li><strong>Institution:</strong> ${institutionName}</li>
        <li><strong>Admin Name:</strong> ${adminName || 'N/A'}</li>
        <li><strong>Admin Email:</strong> ${adminEmail || 'N/A'}</li>
        <li><strong>City:</strong> ${city || 'N/A'}</li>
      </ul>
      
      <p>Please log in to the dashboard to review their meeting notes and approve this request.</p>
      <a href="${dashboardUrl}/superadmin/detail/${leadId}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#fff; text-decoration:none; border-radius:6px; margin-top:15px; font-weight:bold;">Review & Approve</a>
    </div>
  `; 
};

export const getVettingApprovedHtml = ({ assigneeName, institutionName, dashboardUrl, leadId }) => { 
  return `
    <div style="font-family: sans-serif; color: #111;">
      <h2>Vetting Approved \u2705</h2>
      <p>Hi ${assigneeName},</p>
      <p>Your request to provision a sandbox for <strong>${institutionName}</strong> has been <strong>approved</strong> by Nikhil.</p>
      <p>The "Provision Sandbox Wizard" button is now unlocked for this lead. You may proceed with the automated provisioning.</p>
      
      <a href="${dashboardUrl}/superadmin/detail/${leadId}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#fff; text-decoration:none; border-radius:6px; margin-top:15px; font-weight:bold;">Proceed to Provisioning</a>
    </div>
  `; 
};

export const erpBaseTemplate = ({ content, title = "Notification", orgName = "Institution" }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${orgName}</title>
  <style>
    :root {
      --bg: #f9fafb;
      --card-bg: #ffffff;
      --text: #111827;
      --text-muted: #4b5563;
      --border: #e5e7eb;
      --btn-bg: #111827;
      --btn-text: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --card-bg: #1f2937;
        --text: #f9fafb;
        --text-muted: #9ca3af;
        --border: #374151;
        --btn-bg: #ffffff;
        --btn-text: #111827;
      }
    }
    body, html {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      padding: 40px 20px;
      width: 100%;
      background-color: var(--bg);
      box-sizing: border-box;
    }
    .card {
      max-width: 600px;
      margin: 0 auto;
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .content {
      padding: 32px;
      line-height: 1.6;
      font-size: 15px;
      color: var(--text);
    }
    .footer {
      padding: 24px;
      text-align: center;
      border-top: 1px solid var(--border);
      font-size: 13px;
      color: var(--text-muted);
    }
    h2 {
      margin-top: 0;
      color: var(--text);
    }
    p {
      margin: 0 0 16px;
    }
    ul {
      margin: 0 0 16px 20px;
      padding: 0;
    }
    li {
      margin-bottom: 8px;
    }
    .btn {
      display: inline-block;
      background-color: var(--btn-bg);
      color: var(--btn-text) !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
      font-size: 14px;
    }
    .text-muted {
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>Regards,<br><strong>${orgName}</strong><br>ERP Administration Team</p>
        <p>This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

export const getFailedPaymentEmailHtml = (amountInr, errorDescription, paymentId, orgName = "Classgrid") => {
  const content = `
    <h2 style="color: #dc2626;">Payment Failed</h2>
    <p>We attempted to process your payment of <strong>â‚¹${amountInr}</strong>, but unfortunately, it failed.</p>
    <p><strong>Reason:</strong> ${errorDescription || "Action Required"}</p>
    <div style="background-color: var(--bg); padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid var(--border);">
      <p style="margin: 0; font-size: 14px; color: var(--text-muted);">Payment ID: ${paymentId}</p>
      <p style="margin: 5px 0 0; font-size: 14px; color: var(--text-muted);">Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
    </div>
    <p class="text-muted" style="margin-top: 20px;">
      In case your money has been debited, it will be credited to your bank account within 5-7 business days.
    </p>
    <p class="text-muted" style="margin-top: 10px;">
      For any order related queries, please reach out to our support team.
    </p>
  `;
  return erpBaseTemplate({ content, title: "Payment Failed", orgName });
};

// ------------- AI CREDITS: USER RECEIPT -------------
export const getAiCreditUserReceiptHtml = (payerName, amountFormatted, creditsReceived, paymentId, paidAt) => {
  const content = `
    <p>Hello ${payerName},</p>
    <p>Your purchase of AI Credits was completed successfully. The credits have been instantly added to your account.</p>
    <table style="border-collapse:collapse;width:100%;max-width:420px;margin:16px 0;">
      <tr><td style="padding:6px 12px;font-weight:600;color:#374151;">Amount Paid</td><td style="padding:6px 12px;color:#059669;font-weight:700;">${amountFormatted}</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:6px 12px;font-weight:600;color:#374151;">Credits Received</td><td style="padding:6px 12px;font-weight:700;">${creditsReceived} Credits</td></tr>
      <tr><td style="padding:6px 12px;font-weight:600;color:#374151;">Payment ID</td><td style="padding:6px 12px;font-family:monospace;">${paymentId}</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:6px 12px;font-weight:600;color:#374151;">Paid At</td><td style="padding:6px 12px;">${paidAt} IST</td></tr>
    </table>
    <p>Thank you for your purchase.</p>
    <p style="color:#9ca3af;font-size:12px;">This is an automated receipt from Classgrid.</p>
  `;
  return baseTemplate({
    content,
    title: `Payment Successful â€” ${amountFormatted} | Classgrid`
  });
};

// ------------- AI CREDITS: ADMIN NOTIFICATION -------------
export const getAiCreditAdminNotificationHtml = (payerName, payerEmail, amountFormatted, creditsPurchased, paymentId, payerDevice, payerLocation, payerIp, attemptTime) => {
  const content = `
    <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#1d4ed8;">New AI Credit Purchase!</p>
    </div>
    <p>Hello Nikhil,</p>
    <p>A user has just successfully purchased AI Credits. Here are the details:</p>
    <table style="border-collapse:collapse;width:100%;max-width:420px;margin:16px 0;">
      <tr style="background:#f9fafb;"><td style="padding:6px 12px;font-weight:600;color:#374151;">Amount</td><td style="padding:6px 12px;color:#059669;font-weight:700;">${amountFormatted}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:600;color:#374151;">Credits Purchased</td><td style="padding:6px 12px;font-weight:700;">${creditsPurchased} Credits</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:6px 12px;font-weight:600;color:#374151;">Purchaser</td><td style="padding:6px 12px;">${payerName} (${payerEmail})</td></tr>
      <tr><td style="padding:6px 12px;font-weight:600;color:#374151;">Payment ID</td><td style="padding:6px 12px;font-family:monospace;">${paymentId}</td></tr>
    </table>

    <div style="margin-top:20px;border-top:2px dashed #e5e7eb;padding-top:16px;">
        <h3 style="margin:0 0 10px 0;font-size:14px;color:#111827;">Attempt Security Details</h3>
        <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:5px 0;font-weight:600;color:#4b5563;width:35%;">Device</td><td style="padding:5px 0;color:#111827;">${payerDevice}</td></tr>
            <tr><td style="padding:5px 0;font-weight:600;color:#4b5563;">Location</td><td style="padding:5px 0;color:#111827;">${payerLocation}</td></tr>
            <tr><td style="padding:5px 0;font-weight:600;color:#4b5563;">IP Address</td><td style="padding:5px 0;color:#111827;font-family:monospace;">${payerIp}</td></tr>
            <tr><td style="padding:5px 0;font-weight:600;color:#4b5563;">Time</td><td style="padding:5px 0;color:#111827;">${attemptTime}</td></tr>
        </table>
    </div>
  `;
  return baseTemplate({
    content,
    title: `New AI Credit Purchase: ${amountFormatted} from ${payerName}`
  });
};


// ------------- AI CREDITS: GRANTED NOTIFICATION -------------
export const getAiCreditGrantedHtml = (userName, creditsAdded, totalBalance, expireDateStr = "No expiration", dashboardUrl = null) => {
    const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
    const content = `
        <p>Hi ${userName},</p>
        <p>Good news! We have successfully added <strong>${creditsAdded} AI credits</strong> to your account.</p>
        
        <ul style="color: #374151; padding-left: 20px; line-height: 1.6; margin: 16px 0;">
            <li><strong>Credits Added:</strong> ${creditsAdded} AI Credits</li>
            <li><strong>New Total Balance:</strong> ${totalBalance} Credits</li>
            <li><strong>Expiration Date:</strong> ${expireDateStr}</li>
        </ul>
        
        <p>You can now use your credits to generate content, run AI tools, and use all available smart features. To check your current usage at any time, go to your <a href="${url}">AIHUB CREDITS</a>.</p>
        <p>If you have any questions or need more credits, just reply to this email.</p>
        
        <p>Best regards,<br>The Classgrid Support Team</p>
    `;
    return baseTemplate({ content, title: "Your AI Credits Have Been Granted!" });
};

export const getAiCreditGrantedPlainText = (userName, creditsAdded, totalBalance, expireDateStr = "No expiration", dashboardUrl = null) => {
    const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
    return `Hi ${userName},

Good news! We have successfully added ${creditsAdded} AI credits to your account.

• Credits Added: ${creditsAdded} AI Credits
• New Total Balance: ${totalBalance} Credits
• Expiration Date: ${expireDateStr}

You can now use your credits to generate content, run AI tools, and use all available smart features. To check your current usage at any time, go to your AI Hub: ${url}

If you have any questions or need more credits, just reply to this email.

Best regards,
The Classgrid Support Team`;
};

// ------------- SUPER ADMIN SECURITY VERIFICATION OTP -------------
export const getSuperAdminSecurityOtpHtml = (adminName, otp, actionDescription, expiryMinutes = 10) => {
  const content = `
    <p>Hi <strong>${adminName || 'Super Admin'}</strong>,</p>
    <p>A sensitive Super Admin operation has been initiated${actionDescription ? ` for <strong>${actionDescription}</strong>` : ''}.</p>
    <p>Please enter the one-time security verification code below to authorize this action:</p>

    <div class="box" style="text-align:center; margin: 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <div class="meta" style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Super Admin Security Code</div>
      <span class="code" style="font-size: 32px; letter-spacing: 8px; font-weight: 800; color: #0f172a; font-family: monospace;">${otp}</span>
      <p style="margin-top: 12px; font-size: 13px; color: #64748b; margin-bottom: 0;">This code will expire in <strong style="color: #0f172a;">${expiryMinutes} minutes</strong>.</p>
    </div>

    <p style="font-size: 13px; color: #dc2626; margin-top: 20px; padding: 12px; background-color: #fef2f2; border-radius: 6px; border-left: 3px solid #dc2626;">
      <strong>Security Warning:</strong> If you did not request this code, immediately change your password and revoke active sessions. Never share this code with anyone.
    </p>
  `;
  return baseTemplate({
    content,
    title: 'Super Admin Security Code',
    ignoreText: 'If you did not request this action, please secure your Super Admin account immediately.'
  });
};

export const getSuperAdminSecurityOtpPlainText = (adminName, otp, actionDescription, expiryMinutes = 10) => {
  return `Super Admin Security Verification

Hi ${adminName || 'Super Admin'},

A sensitive Super Admin operation has been initiated${actionDescription ? ` for ${actionDescription}` : ''}.

Your One-Time Security Code: ${otp}

This code will expire in ${expiryMinutes} minutes.

Security Warning: If you did not request this code, immediately secure your account. Never share this code with anyone.

&copy; ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

// ------------- GRANTED CREDITS EXTENDED -------------
export const getGrantedCreditsExtendedHtml = (userName, newExpiryDate, dashboardUrl = null) => {
  const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
  const content = `
    <p>Hi <strong>${userName || 'there'}</strong>,</p>
    <p>Good news! Your Classgrid AI granted credits expiration date has been extended.</p>
    
    <div class="box" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <h3 style="margin-top: 0; color: #0f172a; font-size: 16px; margin-bottom: 12px;">New Expiration Date</h3>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #4338ca;">${formatDate(newExpiryDate)}</p>
    </div>

    <p>You can continue using your AI credits for generating content and accessing smart features until this new date.</p>
    
    <p style="margin-top: 24px;">
      <a href="${url}" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Open AI Hub</a>
    </p>
  `;
  return baseTemplate({
    content,
    title: 'AI Credits Extended',
    ignoreText: 'If you have any questions about your credits, simply reply to this email.'
  });
};

export const getGrantedCreditsExtendedPlainText = (userName, newExpiryDate, dashboardUrl = null) => {
  const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
  return `AI Credits Extended

Hi ${userName || 'there'},

Good news! Your Classgrid AI granted credits expiration date has been extended.

New Expiration Date: ${formatDate(newExpiryDate)}

You can continue using your AI credits until this new date.

To view your AI usage, go to: ${url}

If you have any questions, just reply to this email.

Best regards,
The Classgrid Team`;
};

// ------------- GRANTED CREDITS PAUSED / UNPAUSED -------------
export const getGrantedCreditsPausedHtml = (userName, isPaused, dashboardUrl = null) => {
  const action = isPaused ? "paused" : "resumed";
  const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
  const content = `
    <p>Hi <strong>${userName || 'there'}</strong>,</p>
    <p>Your Classgrid AI granted credits have been <strong>${action}</strong> by the administrator.</p>
    
    <div class="box" style="margin: 24px 0; background-color: ${isPaused ? '#fffbeb' : '#ecfdf5'}; border: 1px solid ${isPaused ? '#fcd34d' : '#6ee7b7'}; border-radius: 8px; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${isPaused ? '#92400e' : '#065f46'};">${isPaused ? 'Credits Paused' : 'Credits Resumed'}</p>
      <p style="margin: 8px 0 0; font-size: 13px; color: ${isPaused ? '#a16207' : '#047857'};">${isPaused ? 'Your granted credits are temporarily unavailable.' : 'Your granted credits are now active and ready to use.'}</p>
    </div>

    ${isPaused ? '<p>While paused, you will not be able to use your granted credits. Your free weekly limit still applies.</p>' : '<p>You can now continue using your granted credits as usual.</p>'}
    
    <p>If you have any questions, simply reply to this email.</p>
  `;
  return baseTemplate({ content, title: 'AI Credits ' + (isPaused ? 'Paused' : 'Resumed') });
};

export const getGrantedCreditsPausedPlainText = (userName, isPaused, dashboardUrl = null) => {
  const action = isPaused ? "paused" : "resumed";
  const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
  return 'AI Credits ' + (isPaused ? 'Paused' : 'Resumed') + '\n\nHi ' + (userName || 'there') + ',\n\nYour Classgrid AI granted credits have been ' + action + ' by the administrator.\n\n' + (isPaused ? 'While paused, you will not be able to use your granted credits. Your free weekly limit still applies.' : 'You can now continue using your granted credits as usual.') + '\n\nIf you have any questions, just reply to this email.\n\nBest regards,\nThe Classgrid Team';
};

// ------------- GRANTED CREDITS REMOVED (EXPIRED) -------------
export const getGrantedCreditsRemovedHtml = (userName, dashboardUrl = null) => {
  const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
  const content = `
    <p>Hi <strong>${userName || 'there'}</strong>,</p>
    <p>Your Classgrid AI granted credits have been <strong>removed</strong> by the administrator. Your promotional credit balance has been set to zero.</p>
    
    <div class="box" style="margin: 24px 0; background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #991b1b;">Credits Removed</p>
      <p style="margin: 8px 0 0; font-size: 13px; color: #b91c1c;">Your granted credits balance is now 0.</p>
    </div>

    <p>Your free weekly limit is still available. If you need additional credits, you can purchase them from the AI Hub.</p>
    
    <p style="margin-top: 24px;">
      <a href="${url}" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Open AI Hub</a>
    </p>
  `;
  return baseTemplate({ content, title: 'AI Credits Removed' });
};

export const getGrantedCreditsRemovedPlainText = (userName, dashboardUrl = null) => {
  const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
  return 'AI Credits Removed\n\nHi ' + (userName || 'there') + ',\n\nYour Classgrid AI granted credits have been removed by the administrator. Your promotional credit balance has been set to zero.\n\nYour free weekly limit is still available. If you need additional credits, you can purchase them from the AI Hub.\n\nTo view your AI usage, go to: ' + url + '\n\nBest regards,\nThe Classgrid Team';
};

// ------------- GRANTED CREDITS EXPIRY WARNING (2 days before) -------------
export const getGrantedCreditsExpiryWarningHtml = (userName, expiryDate, remainingCredits, dashboardUrl = null) => {
  const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
  const content = `
    <p>Hi <strong>${userName || 'there'}</strong>,</p>
    <p>This is a friendly reminder that your Classgrid AI granted credits are <strong>expiring soon</strong>.</p>
    
    <div class="box" style="margin: 24px 0; background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px;">
      <h3 style="margin-top: 0; color: #92400e; font-size: 16px; margin-bottom: 12px;">Expiring Soon</h3>
      <p style="margin: 0 0 8px; font-size: 14px; color: #78350f;"><strong>Expiration Date:</strong> ${formatDate(expiryDate)}</p>
      <p style="margin: 0; font-size: 14px; color: #78350f;"><strong>Remaining Credits:</strong> ${remainingCredits}</p>
    </div>

    <p>Make sure to use your remaining credits before they expire. After expiration, your granted credit balance will be set to zero.</p>
    
    <p style="margin-top: 24px;">
      <a href="${url}" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Use Your Credits</a>
    </p>
  `;
  return baseTemplate({ content, title: 'AI Credits Expiring Soon' });
};

export const getGrantedCreditsExpiryWarningPlainText = (userName, expiryDate, remainingCredits, dashboardUrl = null) => {
  const url = dashboardUrl || (getFrontendUrl() + '/student/agent');
  return 'AI Credits Expiring Soon\n\nHi ' + (userName || 'there') + ',\n\nThis is a friendly reminder that your Classgrid AI granted credits are expiring soon.\n\nExpiration Date: ' + formatDate(expiryDate) + '\nRemaining Credits: ' + remainingCredits + '\n\nMake sure to use your remaining credits before they expire. After expiration, your granted credit balance will be set to zero.\n\nTo use your credits: ' + url + '\n\nBest regards,\nThe Classgrid Team';
};

// ============================================================================
// AI CREDITS - LOW BALANCE & EXHAUSTION TEMPLATES
// ============================================================================

export const getGrantedCreditsLowEmailHtml = (userName, expirationDate, subdomain) => {
    const dashboardLink = subdomain ? `https://${subdomain}.classgrid.in` : `https://classgrid.in`;
    const checkoutLink = subdomain ? `https://${subdomain}.classgrid.in/checkout` : `https://classgrid.in/checkout`;
    
    const content = `
      <p>Hello ${userName},</p>
      <p>Your account has used <strong>80% of its Granted AI Credits</strong>. This usage covers all AI-powered tools and generations across the Classgrid platform, and your current grant is scheduled to expire on ${expirationDate}.</p>
      <p>Once your Granted AI Credits are fully consumed, your AI access will be automatically paused unless you have a Top-Up Credit balance available on your account.</p>
      <p>To ensure your workflow isn't interrupted, you can easily purchase Top-Up Credits or check your current balance in your AI Dashboard.</p>
      <p><a href="${dashboardLink}" style="display:inline-block; padding:10px 20px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Check My AI Usage & Balance</a></p>
      <p>Need more AI capacity for your classroom? Top-Up Credits never expire and seamlessly take over once your granted promotional credits run out. Head over to your dashboard to secure additional credits and keep your AI tools running smoothly.</p>
      <p><a href="${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    `;
    return baseTemplate({ content, title: "Action Required: You have used 80% of your Granted AI Credits" });
};

export const getTopUpCreditsLowEmailHtml = (userName, subdomain) => {
    const dashboardLink = subdomain ? `https://${subdomain}.classgrid.in` : `https://classgrid.in`;
    const checkoutLink = subdomain ? `https://${subdomain}.classgrid.in/checkout` : `https://classgrid.in/checkout`;
    
    const content = `
      <p>Hello ${userName},</p>
      <p>Your account has used <strong>80% of its Top-Up AI Credits</strong>. This usage covers all AI-powered tools and generations across the Classgrid platform.</p>
      <p>Since Top-Up credits never expire, they will remain active until they are fully depleted. However, once your remaining Top-Up Credits are completely consumed, your AI access will be automatically paused.</p>
      <p>To ensure your workflow isn't interrupted and your AI tools keep running smoothly, you can easily purchase additional Top-Up Credits right now.</p>
      <p><a href="${dashboardLink}" style="display:inline-block; padding:10px 20px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Check My AI Usage & Balance</a></p>
      <p>Need more AI capacity for your classroom? Head over to your dashboard to secure additional Top-Up Credits in minutes, ensuring your access to Classgrid's advanced AI features is never disrupted.</p>
      <p><a href="${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    `;
    return baseTemplate({ content, title: "Action Required: You have used 80% of your Top-Up AI Credits" });
};

export const getFreeLimitsExhaustedEmailHtml = (userName, resetDate, subdomain) => {
    const checkoutLink = subdomain ? `https://${subdomain}.classgrid.in/checkout` : `https://classgrid.in/checkout`;
    
    const content = `
      <p>Hello ${userName},</p>
      <p>Your account has reached <strong>100% of its Personal Free Limits</strong> for AI usage.</p>
      <p>Your AI access has been temporarily paused. Don't worry—your free limits automatically reset every 7 days, and your access will be fully restored on <strong>${resetDate}</strong>.</p>
      <p>Don't want to wait 7 days? If you need to keep using Classgrid's AI tools right now, you can purchase Top-Up Credits. Top-Up Credits never expire and instantly restore your access so you can continue your work without any interruptions.</p>
      <p><a href="${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    `;
    return baseTemplate({ content, title: "Action Required: You have reached 100% of your Free AI Usage" });
};

export const getGrantedCreditsExhaustedEmailHtml = (userName, resetDate, subdomain) => {
    const checkoutLink = subdomain ? `https://${subdomain}.classgrid.in/checkout` : `https://classgrid.in/checkout`;
    
    const content = `
      <p>Hello ${userName},</p>
      <p>Your account has reached <strong>100% of its Granted AI Credits</strong>.</p>
      <p>Because your granted promotional credits have been fully consumed, your AI access has been paused. However, your access will be automatically restored when your Personal Free Limits reset on <strong>${resetDate}</strong>.</p>
      <p>Don't want to wait until ${resetDate}? You can instantly restore your access right now by adding a Top-Up Credit balance to your account. Top-Up Credits seamlessly take over when your free limits or grants run out, ensuring your workflow is never interrupted.</p>
      <p><a href="${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    `;
    return baseTemplate({ content, title: "Action Required: You have reached 100% of your Granted AI Credits" });
};

export const getTopUpCreditsExhaustedEmailHtml = (userName, resetDate, subdomain) => {
    const checkoutLink = subdomain ? `https://${subdomain}.classgrid.in/checkout` : `https://classgrid.in/checkout`;
    
    const content = `
      <p>Hello ${userName},</p>
      <p>Your account has reached <strong>100% of its Top-Up AI Credits</strong>.</p>
      <p>Because your purchased balance has been fully depleted, your AI access has been paused. However, your access will automatically resume as soon as your Personal Free Limits reset on <strong>${resetDate}</strong>.</p>
      <p>Need to keep working right now? If you don't want to wait for your free limits to reset, you can easily purchase a new bundle of Top-Up Credits today to instantly restore your access to Classgrid's advanced AI features.</p>
      <p><a href="${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    `;
    return baseTemplate({ content, title: "Action Required: You have reached 100% of your Top-Up AI Credits" });
};


// ------------- AI CREDITS USAGE ALERTS -------------

export const getGrantedCreditsWarningHtml = (userName, expirationDate, dashboardUrl) => {
  return baseTemplate({
    title: "Action Required: You have used 80% of your Granted AI Credits",
    content: `
      <h2>Hello ${userName},</h2>
      <p>Your account has used <strong>80%</strong> of its <strong>Granted AI Credits</strong>. This usage covers all AI-powered tools and generations across the Classgrid platform, and your current grant is scheduled to expire on <strong>${formatDate(expirationDate)}</strong>.</p>
      <p>Once your Granted AI Credits are fully consumed, your AI access will be automatically paused unless you have a Top-Up Credit balance available on your account.</p>
      <p>To ensure your workflow isn't interrupted, you can easily purchase Top-Up Credits or check your current balance in your AI Dashboard.</p>
      <a href="${dashboardUrl}" class="btn">Check My AI Usage & Balance</a>
      
      <div class="box" style="margin-top: 30px;">
        <h3 style="margin-bottom: 8px;">Need more AI capacity for your classroom?</h3>
        <p>Top-Up Credits never expire and seamlessly take over once your granted promotional credits run out. Head over to your dashboard to secure additional credits and keep your AI tools running smoothly.</p>
      </div>
    `
  });
};

export const getTopUpCreditsWarningHtml = (userName, dashboardUrl) => {
  return baseTemplate({
    title: "Action Required: You have used 80% of your Top-Up AI Credits",
    content: `
      <h2>Hello ${userName},</h2>
      <p>Your account has used <strong>80%</strong> of its <strong>Top-Up AI Credits</strong>. This usage covers all AI-powered tools and generations across the Classgrid platform.</p>
      <p>Since Top-Up credits never expire, they will remain active until they are fully depleted. However, once your remaining Top-Up Credits are completely consumed, your AI access will be automatically paused.</p>
      <p>To ensure your workflow isn't interrupted and your AI tools keep running smoothly, you can easily purchase additional Top-Up Credits right now.</p>
      <a href="${dashboardUrl}" class="btn">Check My AI Usage & Balance</a>
    `
  });
};

export const getFreeLimitsExhaustedHtml = (userName, resetDate, dashboardUrl) => {
  return baseTemplate({
    title: "Action Required: You have reached 100% of your Free AI Usage",
    content: `
      <h2>Hello ${userName},</h2>
      <p>Your account has reached <strong>100%</strong> of its <strong>Personal Free Limits</strong> for AI usage.</p>
      <p>Your AI access has been temporarily paused. Don't worry—your free limits automatically reset every 7 days, and your access will be fully restored on <strong>${formatDate(resetDate)}</strong>.</p>
      
      <div class="box" style="margin-top: 30px;">
        <h3 style="margin-bottom: 8px;">Don't want to wait 7 days?</h3>
        <p>If you need to keep using Classgrid's AI tools right now, you can purchase Top-Up Credits. Top-Up Credits never expire and instantly restore your access so you can continue your work without any interruptions.</p>
        <a href="${dashboardUrl}" class="btn" style="margin-top: 15px;">Purchase Top-Up Credits</a>
      </div>
    `
  });
};

export const getGrantedCreditsExhaustedHtml = (userName, resetDate, dashboardUrl) => {
  return baseTemplate({
    title: "Action Required: You have reached 100% of your Granted AI Credits",
    content: `
      <h2>Hello ${userName},</h2>
      <p>Your account has reached <strong>100%</strong> of its <strong>Granted AI Credits</strong>.</p>
      <p>Because your granted promotional credits have been fully consumed, your AI access has been paused. However, your access will be automatically restored when your <strong>Personal Free Limits</strong> reset on <strong>${formatDate(resetDate)}</strong>.</p>
      
      <div class="box" style="margin-top: 30px;">
        <h3 style="margin-bottom: 8px;">Don't want to wait?</h3>
        <p>You can instantly restore your access right now by adding a Top-Up Credit balance to your account. Top-Up Credits seamlessly take over when your free limits or grants run out, ensuring your workflow is never interrupted.</p>
        <a href="${dashboardUrl}" class="btn" style="margin-top: 15px;">Purchase Top-Up Credits</a>
      </div>
    `
  });
};

export const getTopUpCreditsExhaustedHtml = (userName, resetDate, dashboardUrl) => {
  return baseTemplate({
    title: "Action Required: You have reached 100% of your Top-Up AI Credits",
    content: `
      <h2>Hello ${userName},</h2>
      <p>Your account has reached <strong>100%</strong> of its <strong>Top-Up AI Credits</strong>.</p>
      <p>Because your purchased balance has been fully depleted, your AI access has been paused. However, your access will automatically resume as soon as your <strong>Personal Free Limits</strong> reset on <strong>${formatDate(resetDate)}</strong>.</p>
      
      <div class="box" style="margin-top: 30px;">
        <h3 style="margin-bottom: 8px;">Need to keep working right now?</h3>
        <p>If you don't want to wait for your free limits to reset, you can easily purchase a new bundle of Top-Up Credits today to instantly restore your access to Classgrid's advanced AI features.</p>
        <a href="${dashboardUrl}" class="btn" style="margin-top: 15px;">Purchase Top-Up Credits</a>
      </div>
    `
  });
};

// ------------- CHAT OTP EMAIL -------------
export const getChatOtpEmailHtml = (otp) => {
  const content = `
    <p>Hi there,</p>
    <p>You requested a verification code to sign in to <strong>Classgrid AI</strong>.</p>
    
    <div class="box" style="margin-bottom: 24px; text-align: center;">
      <p style="margin-bottom: 8px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your 6-Digit Code</p>
      <p style="margin-bottom: 0; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #111111;">${otp}</p>
    </div>

    <p style="font-size: 14px; color: #374151;">This code is valid for the next <strong>10 minutes</strong>. Please do not share it with anyone.</p>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 24px; margin-bottom: 0;">If you did not request this code, you can safely ignore this email.</p>
  `;

  return baseTemplate({
    content,
    title: "Classgrid AI Verification Code",
    ignoreText: "This code expires in 10 minutes.",
  });
};

// ------------- CHAT WELCOME EMAIL -------------
// Sent once when a chat.classgrid.in account finishes setup (see chatFinalizeOnboarding)
const CHAT_APP_URL = "https://chat.classgrid.in";

const chatWelcomeGreetingName = (name) => {
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  // Sign-ups without a name are saved as "AI User"
  if (!first || first === "AI") return "";
  return first.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
};

export const getChatWelcomeEmailHtml = (name) => {
  const firstName = chatWelcomeGreetingName(name);
  const content = `
    <p>Hello${firstName ? ` ${firstName}` : ""},</p>
    <p>Welcome to <strong>Classgrid AI</strong>, your new personal AI agent! Ask, research, analyse your files, run code and automate your everyday work. Classgrid AI is built to do your real work, from reading messy spreadsheets and PDFs to building finished reports and charts.</p>

    <div style="text-align:center;margin:8px 0 28px;">
      <a href="${CHAT_APP_URL}" class="btn">Open Classgrid AI</a>
    </div>

    <p><strong>Built to do your real work.</strong> Give the agent your toughest tasks. Upload spreadsheets or documents and it will run Python, plot charts and hand you ready-to-download PDF reports. Connect 20+ apps like Gmail, Google Drive, Notion, GitHub and Slack so the agent can take action across your tools.</p>

    <p><strong>Works while you're away.</strong> Schedule daily briefs, weekly reports and reminders. The agent runs in the background and delivers the finished summaries straight to your WhatsApp.</p>

    <p><strong>Flexible AI credits.</strong> No locked-in monthly plans. Top up AI credits with any amount from ₹1 to ₹10,000 whenever you need, from Upgrade in the app.</p>

    <div style="text-align:center;margin:8px 0 28px;">
      <a href="${CHAT_APP_URL}" class="btn">Give the agent its first task</a>
    </div>

    <p style="font-size:13px;color:#6b7280;">Please be aware that AI responses might contain inaccuracies.</p>

    <p>Thanks,<br>The Classgrid Team</p>

    <div class="box" style="margin-bottom:0;">
      <p><strong>Need help?</strong></p>
      <p>Visit our <a href="https://classgrid.in/support">Support page</a> or reach out to our team directly at <a href="mailto:support@classgrid.in">support@classgrid.in</a>.</p>
    </div>
  `;

  return baseTemplate({
    content,
    title: "Welcome to Classgrid AI",
    ignoreText: `You received this email because you created a Classgrid AI account. <a href="https://classgrid.in/privacy" style="color:#9ca3af;">Privacy Policy</a>`,
  });
};

export const getChatWelcomeEmailPlainText = (name) => {
  const firstName = chatWelcomeGreetingName(name);
  return `Welcome to Classgrid AI!

Hello${firstName ? ` ${firstName}` : ""},

Welcome to Classgrid AI, your new personal AI agent! Ask, research, analyse your files, run code and automate your everyday work. Classgrid AI is built to do your real work, from reading messy spreadsheets and PDFs to building finished reports and charts.

Open Classgrid AI: ${CHAT_APP_URL}

Built to do your real work: Give the agent your toughest tasks. Upload spreadsheets or documents and it will run Python, plot charts and hand you ready-to-download PDF reports. Connect 20+ apps like Gmail, Google Drive, Notion, GitHub and Slack so the agent can take action across your tools.

Works while you're away: Schedule daily briefs, weekly reports and reminders. The agent runs in the background and delivers the finished summaries straight to your WhatsApp.

Flexible AI credits: No locked-in monthly plans. Top up AI credits with any amount from ₹1 to ₹10,000 whenever you need, from Upgrade in the app.

Please be aware that AI responses might contain inaccuracies.

Thanks,
The Classgrid Team

Need help? Visit https://classgrid.in/support or email support@classgrid.in.

Privacy Policy: https://classgrid.in/privacy
© ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};

export const getChatOtpEmailPlainText = (otp) => {
  return `Classgrid AI Verification Code

Your 6-digit verification code is: ${otp}

This code is valid for the next 10 minutes. Please do not share it with anyone.

If you did not request this code, you can safely ignore this email.

For contact, visit: https://chat.classgrid.in/support

© ${new Date().getFullYear()} Classgrid. All rights reserved.`;
};
