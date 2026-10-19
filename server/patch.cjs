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
const fs = require('fs');
let c = fs.readFileSync('src/mcp/tools.js', 'utf8');

c = c.replace(/const currentCount = await AiSchedule\.countDocuments\(\{\s*organization_id: user\?\.organization_id,\s*\$or: \[\s*\{ whatsapp_phone_number: \{ \$exists: true, \$ne: '' \} \},\s*\{ whatsapp_message: \{ \$exists: true, \$ne: '' \} \}\s*\]\s*\}\);/,
`const currentCount = await AiSchedule.countDocuments({
            user_email: finalUserEmail,
            $or: [
              { whatsapp_phone_number: { $exists: true, $ne: '' } },
              { whatsapp_message: { $exists: true, $ne: '' } }
            ]
          });`);

c = c.replace(/Failed: The WhatsApp Scheduling limit of \$\{limit\} has been reached for this organization\./,
`Failed: Your account has reached the WhatsApp Scheduling limit of \${limit}.`);

fs.writeFileSync('src/mcp/tools.js', c);
