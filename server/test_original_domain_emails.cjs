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

dotenv.config({ path: __dirname + '/.env' });

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function detailRowsHtml(detailsObj) {
    return Object.entries(detailsObj)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(
            ([label, value]) => `
      <tr>
        <td width="35%" style="padding:14px 18px;border-bottom:1px solid #2a2a2a;border-right:1px solid #2a2a2a;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
          ${escapeHtml(label)}
        </td>
        <td style="padding:14px 18px;border-bottom:1px solid #2a2a2a;color:#f3f4f6;font-size:14px;word-break:break-word;">
          ${escapeHtml(value)}
        </td>
      </tr>
    `
        )
        .join("");
}

function buildNotificationHtml({ title, orgName, adminName, summary, details, actionUrl, actionLabel, note, changedAt }) {
    const year = new Date().getFullYear();
    const formattedDate = formatDate(changedAt);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#111111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px;border-bottom:1px solid #2a2a2a;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">${escapeHtml(title)}</h1>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:13px;">${escapeHtml(orgName)}</p>
        </td></tr>
        <tr><td style="padding:28px;color:#d1d5db;font-size:14px;line-height:1.7;">
          <p style="margin:0 0 14px;color:#f3f4f6;">Hello ${escapeHtml(adminName || "Admin")},</p>
          <p style="margin:0 0 22px;">${escapeHtml(summary)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:9px;overflow:hidden;">
            ${detailRowsHtml({ ...details, "Changed at": formatDate(changedAt) })}
          </table>
          ${note ? `<div style="margin:0 0 22px;padding:15px;background:#1c1007;border:1px solid #78350f;border-radius:8px;color:#fde68a;">${escapeHtml(note)}</div>` : ""}
          ${actionUrl ? `<div style="text-align:center;margin:0 0 24px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 24px;background:#34d399;color:#07110d;text-decoration:none;border-radius:7px;font-weight:700;">${escapeHtml(actionLabel || "Open Classgrid")}</a></div>` : ""}
          <p style="margin:0 0 16px;">If you did not authorize this change, contact Classgrid support immediately.</p>
          <p style="margin:0;color:#f3f4f6;">Regards,<br><strong>The Classgrid Team</strong></p>
        </td></tr>
        <tr><td style="padding:18px;text-align:center;border-top:1px solid #2a2a2a;background:#111111;color:#737373;font-size:11px;">
          &copy; ${year} Classgrid. This security notification was sent because a domain setting changed on your organization account.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const ACTION_COPY = {
    registered: {
        title: "External domain registered",
        summary: "An external domain was added to your Classgrid organization and now requires DNS verification.",
    },
    changed: {
        title: "External domain changed",
        summary: "Your external domain was changed. The replacement domain must be verified before it becomes active.",
    },
    verified: {
        title: "External domain verified",
        summary: "Classgrid verified the ownership and routing records for your external domain.",
    },
    settings_updated: {
        title: "External domain access changed",
        summary: "Access settings for your external domain were changed.",
    },
    removed: {
        title: "External domain removed",
        summary: "An external domain was removed from your Classgrid organization.",
    },
};

async function sendOriginalEmails() {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.AWS_SES_SMTP_HOST,
            port: parseInt(process.env.AWS_SES_SMTP_PORT, 10),
            secure: false,
            auth: {
                user: process.env.AWS_SES_SMTP_USER,
                pass: process.env.AWS_SES_SMTP_PASS,
            },
        });

        const to = "nikhil.shinde@classgrid.in";
        const actions = ["registered", "changed", "verified", "settings_updated", "removed"];

        for (const action of actions) {
            const orgName = "QuantumChem";
            const adminName = "Neha Sharma";
            const adminEmail = "nehasharmaking25@gmail.com";
            const domainType = "erp_domain";
            const oldDomain = "erp.quantumchem.site";
            const newDomain = action === "removed" ? null : "erp.quantumchem.site";
            
            const oldSettings = { is_enabled: false, allow_classgrid_url: true };
            const newSettings = { is_enabled: true, allow_classgrid_url: false };
            const brandingReset = action === "removed";
            
            const copy = ACTION_COPY[action];
            const typeLabel = domainType === "erp_domain" ? "ERP login domain" : "Public website domain";
            const activeDomain = newDomain || oldDomain;
            const actionUrl = newDomain ? `https://${newDomain}${domainType === "erp_domain" ? "/org/login" : ""}` : "https://classgrid.in";
            
            const settingsSummary = (settings) => settings
                ? `Custom domain ${settings.is_enabled === false ? "disabled" : "enabled"}${domainType === "erp_domain" ? `; default Classgrid URL ${settings.allow_classgrid_url === false ? "disabled" : "enabled"}` : ""}`
                : undefined;
                
            const note = action === "removed" && brandingReset
                ? "Removing a custom domain also resets its associated custom branding by product design. You can add the domain and configure branding again later."
                : action === "changed"
                    ? "Existing branding is preserved during an in-place hostname change. DNS ownership and routing must be verified again."
                    : action === "registered"
                        ? "Do not share the hostname as active until both DNS checks pass."
                        : undefined;

            const template = {
                title: copy.title,
                orgName,
                adminName,
                summary: copy.summary,
                details: {
                    "Domain type": typeLabel,
                    "Old domain": oldDomain,
                    "New domain": newDomain,
                    "Previous access": settingsSummary(oldSettings),
                    "New access": settingsSummary(newSettings),
                    "Administrator": adminEmail,
                },
                actionUrl,
                actionLabel: activeDomain ? "Review domain" : "Open Classgrid",
                note,
                changedAt: new Date(),
            };

            const subject = `[OLD FORMAT] ${copy.title}: ${activeDomain || typeLabel}`;
            
            const mailOptions = {
                from: 'Classgrid Team <support@classgrid.in>', 
                to: to,
                subject: subject,
                html: buildNotificationHtml(template),
                text: "Please view in HTML",
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`Successfully sent original ${action} email! Message ID: ${info.messageId}`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log("Finished sending all 5 original variants.");
    } catch (error) {
        console.error("Error sending emails:", error);
    } finally {
        process.exit(0);
    }
}

sendOriginalEmails();
