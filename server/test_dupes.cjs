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
  const { data: groups } = await sb.from('chat_groups').select('id, name').ilike('name', '%Mummy%');
  console.log("Groups:", groups);
  
  if (groups.length > 0) {
    const { data: threads } = await sb.from('chat_threads').select('*').in('group_id', groups.map(g => g.id));
    console.log("Threads:", threads);
  }
}

test();
