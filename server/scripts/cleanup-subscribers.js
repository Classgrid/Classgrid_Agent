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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/.env' });
import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';

const supabase = createClient(process.env.SUPABASE_CHAT_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const { data: subscribers, error } = await supabase.from('blog_subscribers').select('email');
  if (error) throw error;
  console.log(`Found ${subscribers.length} subscribers in Supabase`);

  const platformUsers = await mongoose.connection.db.collection('users').find({}, { projection: { email: 1 } }).toArray();
  const platformEmails = new Set(platformUsers.map(u => u.email.toLowerCase()));

  const toDelete = subscribers.filter(sub => platformEmails.has(sub.email.toLowerCase()));
  console.log(`Found ${toDelete.length} subscribers who are actually platform users.`);

  if (toDelete.length > 0) {
    const emailsToDelete = toDelete.map(sub => sub.email);
    const { error: delError } = await supabase.from('blog_subscribers').delete().in('email', emailsToDelete);
    if (delError) throw delError;
    console.log(`Deleted ${emailsToDelete.length} synced platform users from Supabase.`);
  }

  mongoose.disconnect();
}

cleanup().catch(console.error);
