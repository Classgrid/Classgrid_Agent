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
import('./config/db.js').then(async (m) => {
    await m.default();
    const mongoose = (await import('mongoose')).default;
    
    // Check Users
    const User = (await import('./src/models/User.js')).default;
    const users = await User.find({ $or: [{ phoneNumber: '1234567890' }, { phone: '1234567890' }] });
    console.log('Users with this phone:');
    console.log(users.map(u => ({ id: u._id, email: u.email, role: u.role, name: u.name })));
    
    // Check Organizations
    const Organization = (await import('./src/models/Organization.js')).default;
    const orgs = await Organization.find({ $or: [{ contactNumber: '1234567890' }, { 'pending_admin.phone': '1234567890' }] });
    console.log('Orgs with this phone:');
    console.log(orgs.map(o => ({ id: o._id, name: o.name, subdomain: o.subdomain })));
    
    mongoose.disconnect();
    process.exit(0);
}).catch(console.error);
