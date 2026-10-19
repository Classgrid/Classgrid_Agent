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
  `    if (name === 'whatsapp_business_connector') {
      const { toPhoneNumber, messageText } = args;
      try {
        if (!process.env.WHATSAPP_PHONE_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
          throw new Error("WhatsApp Business API keys are not configured in the backend environment.");
        }

        const res = await fetch(\`https://graph.facebook.com/v17.0/\${process.env.WHATSAPP_PHONE_ID}/messages\`, {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${process.env.WHATSAPP_ACCESS_TOKEN}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhoneNumber,
            type: "text",
            text: {
              preview_url: false,
              body: messageText
            }
          })
        });

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error.message);
        }

        return { content: [{ type: 'text', text: \`WhatsApp message sent successfully to \${toPhoneNumber}. Message ID: \${data.messages[0].id}\` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: \`Failed to send WhatsApp message: \${e.message}\` }] };
      }
    }`,
  `    if (name === 'whatsapp_business_connector') {
      const { toPhoneNumber, messageText } = args;
      const { userEmail = '' } = context;
      try {
        const user = await mongoose.models.User.findOne({ email: userEmail });
        if (!user || !user.metadata || !user.metadata.whatsapp_credentials) {
          throw new Error("WhatsApp Business API keys are not configured for this user. Please connect WhatsApp in the AI Hub.");
        }

        const { phoneId, accessToken } = user.metadata.whatsapp_credentials;

        if (!phoneId || !accessToken) {
          throw new Error("WhatsApp Business API keys are missing. Please reconnect WhatsApp in the AI Hub.");
        }

        const res = await fetch(\`https://graph.facebook.com/v19.0/\${phoneId}/messages\`, {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${accessToken}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhoneNumber,
            type: "text",
            text: {
              preview_url: false,
              body: messageText
            }
          })
        });

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error.message);
        }

        return { content: [{ type: 'text', text: \`WhatsApp message sent successfully to \${toPhoneNumber}. Message ID: \${data.messages[0].id}\` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: \`Failed to send WhatsApp message: \${e.message}\` }] };
      }
    }`
);
fs.writeFileSync('server/src/mcp/tools.js', code);
console.log('Done');
