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
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './src/models/User.js';
async function test() {
  await connectDB();
  const u = await User.findOne({ email: 'nikhilsubsun123@gmail.com' });
  if(!u || !u.microsoft_access_token) {
    console.log('no token in DB');
    process.exit(0);
  }
  const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + u.microsoft_access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'Test',
      start: { dateTime: '2026-09-20T14:00:00', timeZone: 'UTC' },
      end: { dateTime: '2026-09-20T15:00:00', timeZone: 'UTC' },
      isOnlineMeeting: true
    })
  });
  console.log(await res.json());
  process.exit(0);
}
test();
