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
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/services/email-templates.service.js');
let code = fs.readFileSync(filePath, 'utf8');

const newTemplates = `
export const getGrantedCreditsLowEmailHtml = (userName, expirationDate, subdomain) => {
    const dashboardLink = subdomain ? \`https://\${subdomain}.classgrid.in\` : \`https://classgrid.in\`;
    const checkoutLink = subdomain ? \`https://\${subdomain}.classgrid.in/checkout\` : \`https://classgrid.in/checkout\`;
    
    const content = \`
      <p>Hello \${userName},</p>
      <p>Your account has used <strong>80% of its Granted AI Credits</strong>. This usage covers all AI-powered tools and generations across the Classgrid platform, and your current grant is scheduled to expire on \${expirationDate}.</p>
      <p>Once your Granted AI Credits are fully consumed, your AI access will be automatically paused unless you have a Top-Up Credit balance available on your account.</p>
      <p>To ensure your workflow isn't interrupted, you can easily purchase Top-Up Credits or check your current balance in your AI Dashboard.</p>
      <p><a href="\${dashboardLink}" style="display:inline-block; padding:10px 20px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Check My AI Usage & Balance</a></p>
      <p>Need more AI capacity for your classroom? Top-Up Credits never expire and seamlessly take over once your granted promotional credits run out. Head over to your dashboard to secure additional credits and keep your AI tools running smoothly.</p>
      <p><a href="\${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    \`;
    return baseTemplate({ content, title: "Action Required: You have used 80% of your Granted AI Credits" });
};

export const getTopUpCreditsLowEmailHtml = (userName, subdomain) => {
    const dashboardLink = subdomain ? \`https://\${subdomain}.classgrid.in\` : \`https://classgrid.in\`;
    const checkoutLink = subdomain ? \`https://\${subdomain}.classgrid.in/checkout\` : \`https://classgrid.in/checkout\`;
    
    const content = \`
      <p>Hello \${userName},</p>
      <p>Your account has used <strong>80% of its Top-Up AI Credits</strong>. This usage covers all AI-powered tools and generations across the Classgrid platform.</p>
      <p>Since Top-Up credits never expire, they will remain active until they are fully depleted. However, once your remaining Top-Up Credits are completely consumed, your AI access will be automatically paused.</p>
      <p>To ensure your workflow isn't interrupted and your AI tools keep running smoothly, you can easily purchase additional Top-Up Credits right now.</p>
      <p><a href="\${dashboardLink}" style="display:inline-block; padding:10px 20px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Check My AI Usage & Balance</a></p>
      <p>Need more AI capacity for your classroom? Head over to your dashboard to secure additional Top-Up Credits in minutes, ensuring your access to Classgrid's advanced AI features is never disrupted.</p>
      <p><a href="\${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    \`;
    return baseTemplate({ content, title: "Action Required: You have used 80% of your Top-Up AI Credits" });
};

export const getFreeLimitsExhaustedEmailHtml = (userName, resetDate, subdomain) => {
    const checkoutLink = subdomain ? \`https://\${subdomain}.classgrid.in/checkout\` : \`https://classgrid.in/checkout\`;
    
    const content = \`
      <p>Hello \${userName},</p>
      <p>Your account has reached <strong>100% of its Personal Free Limits</strong> for AI usage.</p>
      <p>Your AI access has been temporarily paused. Don't worry—your free limits automatically reset every 7 days, and your access will be fully restored on <strong>\${resetDate}</strong>.</p>
      <p>Don't want to wait 7 days? If you need to keep using Classgrid's AI tools right now, you can purchase Top-Up Credits. Top-Up Credits never expire and instantly restore your access so you can continue your work without any interruptions.</p>
      <p><a href="\${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    \`;
    return baseTemplate({ content, title: "Action Required: You have reached 100% of your Free AI Usage" });
};

export const getGrantedCreditsExhaustedEmailHtml = (userName, resetDate, subdomain) => {
    const checkoutLink = subdomain ? \`https://\${subdomain}.classgrid.in/checkout\` : \`https://classgrid.in/checkout\`;
    
    const content = \`
      <p>Hello \${userName},</p>
      <p>Your account has reached <strong>100% of its Granted AI Credits</strong>.</p>
      <p>Because your granted promotional credits have been fully consumed, your AI access has been paused. However, your access will be automatically restored when your Personal Free Limits reset on <strong>\${resetDate}</strong>.</p>
      <p>Don't want to wait until \${resetDate}? You can instantly restore your access right now by adding a Top-Up Credit balance to your account. Top-Up Credits seamlessly take over when your free limits or grants run out, ensuring your workflow is never interrupted.</p>
      <p><a href="\${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    \`;
    return baseTemplate({ content, title: "Action Required: You have reached 100% of your Granted AI Credits" });
};

export const getTopUpCreditsExhaustedEmailHtml = (userName, resetDate, subdomain) => {
    const checkoutLink = subdomain ? \`https://\${subdomain}.classgrid.in/checkout\` : \`https://classgrid.in/checkout\`;
    
    const content = \`
      <p>Hello \${userName},</p>
      <p>Your account has reached <strong>100% of its Top-Up AI Credits</strong>.</p>
      <p>Because your purchased balance has been fully depleted, your AI access has been paused. However, your access will automatically resume as soon as your Personal Free Limits reset on <strong>\${resetDate}</strong>.</p>
      <p>Need to keep working right now? If you don't want to wait for your free limits to reset, you can easily purchase a new bundle of Top-Up Credits today to instantly restore your access to Classgrid's advanced AI features.</p>
      <p><a href="\${checkoutLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">Purchase Top-Up Credits</a></p>
      <p>Need help? Check out the <a href="https://classgrid.in/help-center" style="color:#2563eb; text-decoration:underline;">Help Center</a> for answers to your most common questions, or reach out to our Support team directly from your dashboard.</p>
      <p>Thanks,<br/>The Classgrid Team</p>
    \`;
    return baseTemplate({ content, title: "Action Required: You have reached 100% of your Top-Up AI Credits" });
};
`;

const regex = /export const getGrantedCreditsLowEmailHtml[\s\S]*?export const getTopUpCreditsExhaustedEmailHtml[\s\S]*?}\s*;/;
if (code.match(regex)) {
    code = code.replace(regex, newTemplates.trim());
    fs.writeFileSync(filePath, code);
    console.log("Successfully fixed the templates.");
} else {
    console.log("Regex did not match");
}
