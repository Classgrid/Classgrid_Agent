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
mongoose.connect('mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid')
.then(async () => { 
    try { 
        const User = (await import('./src/models/User.js')).default; 
        const users = await User.find({ google_refresh_token: { $exists: true, $ne: null } }); 
        console.log('Users with Google Refresh Token:', users.length); 
        if (users.length > 0) { 
            console.log('Email:', users[0].email); 
            console.log('Token:', users[0].google_refresh_token.substring(0, 20) + '...');
        } 
    } catch (e) { 
        console.error(e); 
    } 
    process.exit(0); 
});
