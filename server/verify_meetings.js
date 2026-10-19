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
import connectDB from './config/db.js';
import User from './src/models/User.js';

async function verify() {
  await connectDB();
  
  // Get user with token
  const u = await User.findOne({ email: 'nikhilsubsun321@gmail.com' });
  if (!u || !u.microsoft_access_token) {
    console.log('❌ No Microsoft token found for this user');
    process.exit(1);
  }
  console.log('✅ Found user with Microsoft token');
  console.log('Token starts with:', u.microsoft_access_token.substring(0, 30) + '...');

  // 1. Check who this token belongs to
  console.log('\n--- WHO AM I? ---');
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { 'Authorization': 'Bearer ' + u.microsoft_access_token }
  });
  const me = await meRes.json();
  console.log('Status:', meRes.status);
  console.log('Me:', JSON.stringify(me, null, 2));

  // 2. List ALL events on calendar
  console.log('\n--- ALL CALENDAR EVENTS ---');
  const eventsRes = await fetch('https://graph.microsoft.com/v1.0/me/events?$top=50&$orderby=createdDateTime desc', {
    headers: { 'Authorization': 'Bearer ' + u.microsoft_access_token }
  });
  const events = await eventsRes.json();
  console.log('Status:', eventsRes.status);
  if (events.value) {
    console.log(`Found ${events.value.length} events total`);
    events.value.forEach((e, i) => {
      console.log(`\n  Event ${i+1}:`);
      console.log(`    Subject: ${e.subject}`);
      console.log(`    Start: ${e.start?.dateTime} (${e.start?.timeZone})`);
      console.log(`    End: ${e.end?.dateTime} (${e.end?.timeZone})`);
      console.log(`    Created: ${e.createdDateTime}`);
      console.log(`    isOnlineMeeting: ${e.isOnlineMeeting}`);
      console.log(`    Teams Join URL: ${e.onlineMeeting?.joinUrl || 'NONE'}`);
      console.log(`    Web Link: ${e.webLink}`);
    });
  } else {
    console.log('Response:', JSON.stringify(events, null, 2));
  }

  // 3. Specifically check September 20 events
  console.log('\n--- EVENTS ON SEPT 20, 2026 ---');
  const sept20Res = await fetch(
    'https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=2026-09-20T00:00:00Z&endDateTime=2026-09-21T00:00:00Z',
    { headers: { 'Authorization': 'Bearer ' + u.microsoft_access_token } }
  );
  const sept20 = await sept20Res.json();
  console.log('Status:', sept20Res.status);
  if (sept20.value) {
    console.log(`Found ${sept20.value.length} events on Sept 20`);
    sept20.value.forEach((e, i) => {
      console.log(`  Event ${i+1}: "${e.subject}" at ${e.start?.dateTime} - ${e.end?.dateTime}, Teams: ${e.onlineMeeting?.joinUrl || 'NONE'}`);
    });
  } else {
    console.log('Response:', JSON.stringify(sept20, null, 2));
  }

  process.exit(0);
}
verify();
