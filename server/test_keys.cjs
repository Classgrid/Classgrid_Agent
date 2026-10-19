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
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const sb = createClient(
  process.env.SUPABASE_CHAT_URL,
  process.env.SUPABASE_CHAT_KEY
);

async function test() {
  const { data, error } = await sb.from('chat_groups').select('*').limit(1);
  console.log(Object.keys(data[0]));
}

test();
