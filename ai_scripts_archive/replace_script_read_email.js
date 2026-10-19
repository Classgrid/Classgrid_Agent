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
let code = fs.readFileSync('server/src/mcp/tools.js', 'utf8');

code = code.replace(
  "'list_emails', 'list_meetings', 'create_meeting', 'send_email', 'mark_email_read', 'list_teams'",
  "'list_emails', 'read_email', 'list_meetings', 'create_meeting', 'send_email', 'mark_email_read', 'list_teams'"
);

code = code.replace(
  "messageId: { type: 'string', description: 'ID of the email message (for mark_email_read).' },",
  "messageId: { type: 'string', description: 'ID of the email message (for mark_email_read, read_email).' },"
);

const insertTarget = `          return { content: [{ type: 'text', text: JSON.stringify(safeData, null, 2) }] };
        } else if (operation === 'list_meetings') {`;
const insertReplacement = `          return { content: [{ type: 'text', text: JSON.stringify(safeData, null, 2) }] };
        } else if (operation === 'read_email') {
          if (!messageId) throw new Error("messageId is required for read_email");
          const res = await fetch(\`https://graph.microsoft.com/v1.0/me/messages/\${messageId}\`, {
            headers: { "Authorization": \`Bearer \${accessToken}\` }
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } else if (operation === 'list_meetings') {`;

const normalize = (str) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
code = normalize(code);
if (code.includes(normalize(insertTarget))) {
    code = code.replace(normalize(insertTarget), normalize(insertReplacement));
    fs.writeFileSync('server/src/mcp/tools.js', code);
    console.log('REPLACED');
} else {
    console.log('NOT FOUND');
}
