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
const axios = require('axios');
require('dotenv').config();

async function testVision() {
  try {
    const url = \`https://api.cloudflare.com/client/v4/accounts/\${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct\`;
    const res = await axios.post(url, {
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 10
    }, {
      headers: {
        'Authorization': \`Bearer \${process.env.CLOUDFLARE_WORKERS_AI_TOKEN}\`,
        'Content-Type': 'application/json'
      }
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR:", err.response ? err.response.data : err.message);
  }
}
testVision();
