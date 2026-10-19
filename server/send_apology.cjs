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
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load environment variables from the platform server .env
dotenv.config({ path: __dirname + '/.env' });

async function sendApologyEmails() {
    try {
        // As per the system rules, we must use Nodemailer with the SMTP credentials for EU-NORTH-1
        const transporter = nodemailer.createTransport({
            host: process.env.AWS_SES_SMTP_HOST,
            port: parseInt(process.env.AWS_SES_SMTP_PORT, 10),
            secure: false, // TLS requires secure: false for port 587
            auth: {
                user: process.env.AWS_SES_SMTP_USER,
                pass: process.env.AWS_SES_SMTP_PASS,
            },
        });

        const mailOptions = {
            from: 'Classgrid Team <support@classgrid.in>', // Use the verified sender email
            to: 'test1acccount2026@gmail.com',
            subject: 'Classgrid System Test Notice - Please Ignore',
            text: "Hi Ma'am, I am currently testing the software systems for Classgrid. The system accidentally sent out one automated test email about a Google Meet for August 16th. Please just ignore and delete it, it was only a system test!",
        };

        console.log("Starting to send 1 apology emails via AWS SES (Capped by Antigravity)...");

        for (let i = 1; i <= 1; i++) {
            const info = await transporter.sendMail(mailOptions);
            console.log(`Email ${i} sent successfully! Message ID: ${info.messageId}`);

            // Small delay between emails to avoid rate limits
            if (i < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log("Finished sending 1 email.");
    } catch (error) {
        console.error("Error sending emails:", error);
    } finally {
        process.exit(0);
    }
}

sendApologyEmails();
