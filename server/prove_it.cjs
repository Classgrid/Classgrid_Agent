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
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.AWS_SES_SMTP_HOST || "email-smtp.eu-north-1.amazonaws.com",
  port: Number(process.env.AWS_SES_SMTP_PORT) || 587,
  secure: false, 
  auth: {
    user: process.env.AWS_SES_SMTP_USER,
    pass: process.env.AWS_SES_SMTP_PASS,
  },
});

async function sendMyEmail() {
  console.log("Using AWS SES SMTP Keys:", {
    host: process.env.AWS_SES_SMTP_HOST,
    user: process.env.AWS_SES_SMTP_USER,
  });

  const info = await transporter.sendMail({
    from: "support@classgrid.in",        
    to: "nikhilsubsun321@gmail.com",     
    subject: "Hello from Classgrid!",    
    html: "<h1>Hello!</h1><p>This is a test exactly like the chat log.</p>" 
  });
  
  console.log("Email Sent Successfully! ID:", info.messageId);
  process.exit(0);
}

sendMyEmail().catch(err => {
    console.error("Failed!", err);
    process.exit(1);
});
