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
require('dotenv').config();
const cfToken = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${cfToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ prompt: 'agree' })
})
.then(res => res.text())
.then(text => console.log('Meta License Agreement Response:', text))
.catch(err => console.error('Error:', err));
