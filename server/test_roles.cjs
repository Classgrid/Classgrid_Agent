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
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://classgrid-admin:aiLfOjcURw9UUALw@classgrid.sa5ww0z.mongodb.net/classgrid?retryWrites=true&w=majority&appName=Classgrid&authSource=admin').then(async () => {
    try {
        const db = mongoose.connection.db;
        const users = await db.collection('users').aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).toArray();
        console.log('User roles in DB:', users);
        
        const orgAdmins = await db.collection('users').find({ role: 'Organization Admin' }).toArray();
        console.log(`Found ${orgAdmins.length} users with EXACT role 'Organization Admin'`);
        if (orgAdmins.length < 5) {
            console.log('Their emails:', orgAdmins.map(u => u.email));
        }

        const orgAdminsLower = await db.collection('users').find({ role: 'organization_admin' }).toArray();
        console.log(`Found ${orgAdminsLower.length} users with EXACT role 'organization_admin'`);
        
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
