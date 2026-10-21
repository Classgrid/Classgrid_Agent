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
let c = fs.readFileSync('./server/src/mcp/tools.js', 'utf8');

const helper = `
// -- Meta Long-Lived Token Cache --
let _cachedMetaLongLivedToken = null;
let _metaTokenExchangedAt = null;

async function getMetaLongLivedToken() {
  if (_cachedMetaLongLivedToken && _metaTokenExchangedAt) {
    const daysSince = (Date.now() - _metaTokenExchangedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < 50) return _cachedMetaLongLivedToken;
  }
  const shortToken = process.env.META_SYSTEM_ACCESS_TOKEN;
  const appId = process.env.META_FACEBOOK_APP_ID;
  const appSecret = process.env.META_FACEBOOK_APP_SECRET;
  if (!shortToken) return null;
  if (!appId || !appSecret) return shortToken;
  try {
    const url = 'https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=' + appId + '&client_secret=' + appSecret + '&fb_exchange_token=' + shortToken;
    const res = await fetch(url);
    const data = await res.json();
    if (data.access_token) {
      _cachedMetaLongLivedToken = data.access_token;
      _metaTokenExchangedAt = Date.now();
      console.log('[meta-token] Exchanged for long-lived token (60 days)');
      return _cachedMetaLongLivedToken;
    }
    console.error('[meta-token] Exchange failed:', data.error?.message || JSON.stringify(data));
    return shortToken;
  } catch (err) {
    console.error('[meta-token] Exchange error:', err.message);
    return shortToken;
  }
}

`;

if (c.includes('getMetaLongLivedToken')) {
  console.log('Helper already exists, skipping.');
} else {
  c = c.replace('export const getMcpTools', helper + 'export const getMcpTools');
  fs.writeFileSync('./server/src/mcp/tools.js', c, 'utf8');
  console.log('Helper function added successfully!');
}
