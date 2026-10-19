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
const { MongoClient, ObjectId } = require('mongodb'); async function fix() { const client = new MongoClient('mongodb+srv://classgrid-admin:aiLfOjcURw9UUALw@classgrid.sa5ww0z.mongodb.net/classgrid?retryWrites=true&w=majority&appName=Classgrid&authSource=admin'); await client.connect(); const db = client.db(); const res = await db.collection('User').updateOne({ email: 'nikhilsubsun321@gmail.com' }, { $set: { email: 'nikhilsubsun321@gmail.com', name: 'Nikhil Shinde', password: '.7IoLkV0ASAPGbcYNa', org_id: new ObjectId('6a2d452b1c952d43497101c8'), status: 'active', role: 'faculty', created_at: new Date() } }, { upsert: true }); console.log('Upsert result:', res); await client.close(); } fix().catch(console.error);