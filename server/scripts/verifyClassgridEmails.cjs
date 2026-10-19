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
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    
    // Find all users with @classgrid.in email
    const users = await db.collection('users').find({
        email: { $regex: /@classgrid\.in$/i }
    }).toArray();
    
    console.log(`Found ${users.length} users with @classgrid.in email domain.`);
    
    // Update them
    const result = await db.collection('users').updateMany(
        { email: { $regex: /@classgrid\.in$/i } },
        { 
            $set: { 
                isEmailVerified: true,
                role: 'super_admin',
                verification_status: 'verified'
            } 
        }
    );
    
    console.log("Update result:", result);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
