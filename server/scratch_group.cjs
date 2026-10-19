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
const sb = createClient(
  'https://bumxgscngzjadyozdpce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bXhnc2NuZ3pqYWR5b3pkcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzQ4MzUsImV4cCI6MjA4Njk1MDgzNX0.jpnG_wEjzLDz5mMOgCCQsnuWe9uwzZq58LrKotRuXu8'
);

async function test() {
  console.log('Inserting group...');
  const res = await sb.from('chat_groups').insert([{
    name: 'Test Group',
    created_by: '66a1a794b15da07c2957b42a',
    message_ttl: 777600
  }]).select().single();
  console.log('Res:', res);
}
test();
