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
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server/.env') });

import { primarySupabaseClient as supabase } from './server/src/config/supabaseClient.js';

async function run() {
  console.log('Connected to Supabase. Attempting to delete test emails...');
  
  // Delete all test student emails
  const { data, error } = await supabase
    .from('blog_subscribers')
    .delete()
    .like('email', '%@example.com');
    
  if (error) {
    console.error('Error deleting example.com emails:', error);
  } else {
    console.log('Successfully deleted all @example.com subscribers.');
  }
  
  process.exit(0);
}

run();
